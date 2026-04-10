using System.Security.Claims;
using FinFlow.Api.Models;
using FinFlow.Api.Services;

namespace FinFlow.Api.Endpoints;

public static class MovementEndpoints
{
    public static void MapMovementEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/movements").WithTags("Movements").RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal user, IMovementService service) =>
        {
            var userId = GetUserId(user);
            var result = await service.GetAllAsync(userId);
            return Results.Ok(ApiResponse<IEnumerable<MovementDto>>.Ok(result));
        });

        group.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal user, IMovementService service) =>
        {
            try
            {
                var userId = GetUserId(user);
                var result = await service.GetByIdAsync(id, userId);
                return Results.Ok(ApiResponse<MovementDto>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(ApiResponse<MovementDto>.Fail(ex.Message));
            }
        });

        group.MapPost("/", async (CreateMovementRequest request, ClaimsPrincipal user, IMovementService service) =>
        {
            try
            {
                var userId = GetUserId(user);
                var result = await service.CreateAsync(userId, request);
                return Results.Created($"/movements/{result.Id}", ApiResponse<MovementDto>.Ok(result));
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ApiResponse<MovementDto>.Fail(ex.Message));
            }
        });

        group.MapPut("/{id:guid}", async (Guid id, UpdateMovementRequest request, ClaimsPrincipal user, IMovementService service) =>
        {
            try
            {
                var userId = GetUserId(user);
                var result = await service.UpdateAsync(id, userId, request);
                return Results.Ok(ApiResponse<MovementDto>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(ApiResponse<MovementDto>.Fail(ex.Message));
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ApiResponse<MovementDto>.Fail(ex.Message));
            }
        });

        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal user, IMovementService service) =>
        {
            try
            {
                var userId = GetUserId(user);
                await service.DeleteAsync(id, userId);
                return Results.NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(ApiResponse<MovementDto>.Fail(ex.Message));
            }
        });
    }

    private static Guid GetUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
