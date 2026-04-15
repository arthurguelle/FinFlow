using FinFlow.Api.Infrastructure;
using FinFlow.Api.Models;

namespace FinFlow.Api.Endpoints;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this WebApplication app)
    {
        // ── GET /health — ping básico (sem auth) ──────────────────────────────
        app.MapGet("/health", () =>
            Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }))
           .WithTags("Health");

        // ── GET /health/ai — testa conectividade com o provider de IA ─────────
        // Requer JWT. Usa endpoint de listagem de modelos (zero tokens).
        app.MapGet("/health/ai", async (IAiExtractor ai, IConfiguration config) =>
        {
            var provider = (config["AI:Provider"] ?? "gemini").ToLowerInvariant();
            var result = await ai.PingAsync();

            return result.Success
                ? Results.Ok(ApiResponse<AiPingResult>.Ok(result))
                : Results.Ok(ApiResponse<AiPingResult>.Fail(
                    $"Falha ao alcançar o provider '{provider}': {result.Error}") with
                  { Data = result });
        })
        .RequireAuthorization()
        .WithTags("Health");
    }
}
