using System.Security.Claims;
using FinFlow.Api.Models;
using FinFlow.Api.Services;

namespace FinFlow.Api.Endpoints;

public static class ExpenseEndpoints
{
    public static void MapExpenseEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/expenses").WithTags("Expenses").RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal user, IExpenseService service,
            int? year, int? month) =>
        {
            var userId = GetUserId(user);
            var result = await service.GetAllAsync(userId, year, month);
            return Results.Ok(ApiResponse<IEnumerable<ExpenseDto>>.Ok(result));
        });

        group.MapGet("/summary", async (ClaimsPrincipal user, IExpenseService service,
            int? year, int? month) =>
        {
            var userId = GetUserId(user);
            var result = await service.GetSummaryAsync(userId, year, month);
            return Results.Ok(ApiResponse<SummaryDto>.Ok(result));
        });

        group.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal user, IExpenseService service) =>
        {
            try
            {
                var userId = GetUserId(user);
                var result = await service.GetByIdAsync(id, userId);
                return Results.Ok(ApiResponse<ExpenseDto>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(ApiResponse<ExpenseDto>.Fail(ex.Message));
            }
        });

        group.MapPost("/", async (CreateExpenseRequest request, ClaimsPrincipal user, IExpenseService service) =>
        {
            try
            {
                var userId = GetUserId(user);
                var result = await service.CreateAsync(userId, request);
                return Results.Created($"/expenses/{result.Id}", ApiResponse<ExpenseDto>.Ok(result));
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ApiResponse<ExpenseDto>.Fail(ex.Message));
            }
        });

        group.MapPut("/{id:guid}", async (Guid id, UpdateExpenseRequest request, ClaimsPrincipal user, IExpenseService service) =>
        {
            try
            {
                var userId = GetUserId(user);
                var result = await service.UpdateAsync(id, userId, request);
                return Results.Ok(ApiResponse<ExpenseDto>.Ok(result));
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(ApiResponse<ExpenseDto>.Fail(ex.Message));
            }
        });

        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal user, IExpenseService service) =>
        {
            try
            {
                var userId = GetUserId(user);
                await service.DeleteAsync(id, userId);
                return Results.NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(ApiResponse<ExpenseDto>.Fail(ex.Message));
            }
        });

        // Upload de PDF → Gemini → retorna gastos extraídos
        group.MapPost("/extract-pdf", async (IFormFile file, ClaimsPrincipal user, IExpenseService service) =>
        {
            try
            {
                var userId = GetUserId(user);
                var result = await service.ExtractFromPdfAsync(userId, file);
                return Results.Ok(ApiResponse<PdfExtractResponse>.Ok(result));
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ApiResponse<PdfExtractResponse>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return Results.UnprocessableEntity(ApiResponse<PdfExtractResponse>.Fail(ex.Message));
            }
            catch (HttpRequestException ex) when ((int?)ex.StatusCode == 429 || ex.Message.Contains("429"))
            {
                return Results.UnprocessableEntity(ApiResponse<PdfExtractResponse>.Fail(
                    "Limite de requisições da API Gemini atingido. Aguarde alguns minutos e tente novamente."));
            }
            catch (HttpRequestException ex)
            {
                return Results.UnprocessableEntity(ApiResponse<PdfExtractResponse>.Fail(
                    $"Erro ao comunicar com a IA: {ex.Message}. Verifique a chave GEMINI_API_KEY."));
            }
        }).DisableAntiforgery();
    }

    private static Guid GetUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
