using FinFlow.Api.Models;
using FinFlow.Api.Services;

namespace FinFlow.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/auth").WithTags("Auth");

        group.MapPost("/register", async (RegisterRequest request, IAuthService auth) =>
        {
            try
            {
                var result = await auth.RegisterAsync(request);
                return Results.Ok(ApiResponse<AuthResponse>.Ok(result));
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(ApiResponse<AuthResponse>.Fail(ex.Message));
            }
        });

        group.MapPost("/login", async (LoginRequest request, IAuthService auth) =>
        {
            try
            {
                var result = await auth.LoginAsync(request);
                return Results.Ok(ApiResponse<AuthResponse>.Ok(result));
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Unauthorized();
            }
        });

        group.MapPost("/refresh", async (RefreshTokenRequest request, IAuthService auth) =>
        {
            try
            {
                var result = await auth.RefreshAsync(request.Token);
                return Results.Ok(ApiResponse<AuthResponse>.Ok(result));
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Unauthorized();
            }
        });

        group.MapPost("/revoke", async (RefreshTokenRequest request, IAuthService auth) =>
        {
            await auth.RevokeAsync(request.Token);
            return Results.NoContent();
        }).RequireAuthorization();
    }
}
