using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using FinFlow.Api.Data;
using FinFlow.Api.Endpoints;
using FinFlow.Api.Infrastructure;
using FinFlow.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Configurações via Environment Variables ──────────────────────────────────
var jwtSettings = new JwtSettings
{
    Secret = builder.Configuration["JWT__Secret"]
        ?? throw new InvalidOperationException("JWT__Secret nao configurada"),
    Issuer = builder.Configuration["JWT__Issuer"] ?? "finflow",
    Audience = builder.Configuration["JWT__Audience"] ?? "finflow-users",
    ExpiresInMinutes = int.TryParse(builder.Configuration["JWT__ExpiresInMinutes"], out var exp) ? exp : 60,
    RefreshExpiresDays = int.TryParse(builder.Configuration["JWT__RefreshExpiresDays"], out var rexp) ? rexp : 7
};

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? builder.Configuration["DATABASE_URL"]
    ?? throw new InvalidOperationException("String de conexao com o banco nao configurada");

var allowedOrigins = (builder.Configuration["CORS__AllowedOrigins"] ?? "http://localhost:4200")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

// ── Banco de Dados ────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(connectionString));

// ── JWT Auth ──────────────────────────────────────────────────────────────────
builder.Services.AddSingleton(jwtSettings);
builder.Services.AddSingleton<JwtHelper>();

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
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret))
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
builder.Services.AddSingleton<GeminiClient>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IMovementService, MovementService>();
builder.Services.AddScoped<IExpenseService, ExpenseService>();

// ── Pipeline ──────────────────────────────────────────────────────────────────
var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// ── Endpoints ─────────────────────────────────────────────────────────────────
app.MapAuthEndpoints();
app.MapMovementEndpoints();
app.MapExpenseEndpoints();

app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }))
   .WithTags("Health");

app.Run();
