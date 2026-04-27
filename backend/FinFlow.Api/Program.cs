using System.Data;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using FinFlow.Api.Data;
using FinFlow.Api.Endpoints;
using FinFlow.Api.Infrastructure;
using FinFlow.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Dapper: mapeamento snake_case → PascalCase ────────────────────────────────
Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;

// ── Configurações via Environment Variables ──────────────────────────────────
var jwtSettings = new JwtSettings
{
    Secret = string.IsNullOrWhiteSpace(builder.Configuration["JWT:Secret"])
        ? "SuperSecretKey12345"
        : builder.Configuration["JWT:Secret"],
    Issuer = builder.Configuration["JWT:Issuer"] ?? "finflow",
    Audience = builder.Configuration["JWT:Audience"] ?? "finflow-users",
    ExpiresInMinutes = int.TryParse(builder.Configuration["JWT:ExpiresInMinutes"], out var exp) ? exp : 60,
    RefreshExpiresDays = int.TryParse(builder.Configuration["JWT:RefreshExpiresDays"], out var rexp) ? rexp : 7
};

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? builder.Configuration["DATABASE_URL"]
    ?? throw new InvalidOperationException("String de conexao com o banco nao configurada");

var allowedOrigins = (builder.Configuration["CORS:AllowedOrigins"] ?? "http://localhost:4200")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

// ── Banco de Dados ────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(connectionString));

// ── JWT Auth ──────────────────────────────────────────────────────────────────
builder.Services.AddSingleton(jwtSettings);
builder.Services.AddSingleton<JwtHelper>();

var jwtSecretBytes = Encoding.UTF8.GetBytes(jwtSettings.Secret ?? "SuperSecretKey12345");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(jwtSecretBytes)
        };
    });

builder.Services.AddAuthorization();

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()));

// ── Servicos ──────────────────────────────────────────────────────────────────
builder.Services.AddHttpClient();

// ── AI Provider (selecionado via AI__Provider) ────────────────────────────────
// Providers suportados: groq, openrouter, gemini (padrão)
builder.Services.AddSingleton<IAiExtractor>(sp =>
{
    var cfg = sp.GetRequiredService<IConfiguration>();
    var http = sp.GetRequiredService<IHttpClientFactory>();
    var log = sp.GetRequiredService<ILogger<OpenAiCompatibleExtractor>>();
    var aiProvider = (cfg["AI:Provider"] ?? "gemini").ToLowerInvariant();
    log.LogInformation("AI Provider selecionado: {Provider}", aiProvider);
    return aiProvider switch
    {
        "groq" => new OpenAiCompatibleExtractor(http,
            sp.GetRequiredService<ILogger<OpenAiCompatibleExtractor>>(),
            "https://api.groq.com/openai/v1",
            cfg["AI:GroqApiKey"] ?? throw new InvalidOperationException("AI:GroqApiKey não configurada"),
            cfg["AI:Model"] ?? "llama-3.1-8b-instant"),
        "openrouter" => new OpenAiCompatibleExtractor(http, log,
            "https://openrouter.ai/api/v1",
            cfg["AI:OpenRouterApiKey"] ?? throw new InvalidOperationException("AI:OpenRouterApiKey não configurada"),
            cfg["AI:Model"] ?? "meta-llama/llama-3.1-8b-instruct:free"),
        _ => (IAiExtractor)new GeminiClient(http, cfg, sp.GetRequiredService<ILogger<GeminiClient>>())
    };
});
builder.Services.AddSingleton<GeminiClient>(); // mantido para compatibilidade
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IMovementService, MovementService>();
builder.Services.AddScoped<IExpenseService, ExpenseService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IDbConnection>(_ => new NpgsqlConnection(connectionString));
builder.Services.AddScoped<IRagService, RagService>();

// ── Pipeline ──────────────────────────────────────────────────────────────────
var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// ── Endpoints ─────────────────────────────────────────────────────────────────
app.MapAuthEndpoints();
app.MapMovementEndpoints();
app.MapExpenseEndpoints();
app.MapAdminEndpoints();
app.MapRagEndpoints();

app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }))
   .WithTags("Health");

app.Run();
