using System.Security.Claims;
using FinFlow.Api.Models;
using FinFlow.Api.Services;

namespace FinFlow.Api.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/admin/users")
            .WithTags("Admin")
            .RequireAuthorization()
            .AddEndpointFilter(async (ctx, next) =>
            {
                var user = ctx.HttpContext.User;
                var role = user.FindFirstValue(ClaimTypes.Role);
                if (role != "admin")
                    return Results.Forbid();
                return await next(ctx);
            });

        group.MapGet("/", async (IAdminService service) =>
        {
            var result = await service.GetAllUsersAsync();
            return Results.Ok(ApiResponse<IEnumerable<AdminUserDto>>.Ok(result));
        });

        group.MapPost("/", async (CreateUserRequest request, IAdminService service) =>
        {
            try
            {
                var result = await service.CreateUserAsync(request);
                return Results.Created($"/admin/users/{result.Id}", ApiResponse<AdminUserDto>.Ok(result));
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(ApiResponse<AdminUserDto>.Fail(ex.Message));
            }
        });

        group.MapPut("/{id:guid}", async (Guid id, UpdateUserRequest request, IAdminService service) =>
        {
            try
            {
                var result = await service.UpdateUserAsync(id, request);
                return Results.Ok(ApiResponse<AdminUserDto>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(ApiResponse<AdminUserDto>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(ApiResponse<AdminUserDto>.Fail(ex.Message));
            }
        });

        group.MapPost("/{id:guid}/change-password", async (Guid id, ChangePasswordRequest request, IAdminService service) =>
        {
            try
            {
                await service.ChangePasswordAsync(id, request.NewPassword);
                return Results.NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        });

        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal currentUser, IAdminService service) =>
        {
            var currentId = Guid.Parse(currentUser.FindFirstValue(ClaimTypes.NameIdentifier)!);
            if (currentId == id)
                return Results.BadRequest(ApiResponse<object>.Fail("Não é possível excluir seu próprio usuário."));

            try
            {
                await service.DeleteUserAsync(id);
                return Results.NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(ApiResponse<object>.Fail(ex.Message));
            }
        });
    }
}
