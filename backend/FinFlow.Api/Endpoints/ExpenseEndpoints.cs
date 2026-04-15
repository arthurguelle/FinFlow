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

        // Upload de PDF → IA → retorna gastos extraídos
        // Campo opcional "password" para PDFs protegidos
        group.MapPost("/extract-pdf", async (HttpRequest req, ClaimsPrincipal user, IExpenseService service) =>
        {
            try
            {
                if (!req.HasFormContentType)
                    return Results.BadRequest(ApiResponse<PdfExtractResponse>.Fail("Envie o PDF como multipart/form-data."));

                var form = await req.ReadFormAsync();
                var file = form.Files.GetFile("file");
                if (file is null)
                    return Results.BadRequest(ApiResponse<PdfExtractResponse>.Fail("Campo 'file' obrigatório."));

                var password = form["password"].FirstOrDefault();
                var userId = GetUserId(user);
                var result = await service.ExtractFromPdfAsync(userId, file, password);
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
                    "Limite de requisições da API de IA atingido. Aguarde alguns minutos e tente novamente."));
            }
            catch (HttpRequestException ex) when ((int?)ex.StatusCode == 413 || ex.Message.Contains("413"))
            {
                return Results.UnprocessableEntity(ApiResponse<PdfExtractResponse>.Fail(
                    "O conteúdo do PDF excedeu o limite aceito pelo provedor de IA. Tente um PDF menor ou divida o documento em partes."));
            }
            catch (HttpRequestException ex)
            {
                return Results.UnprocessableEntity(ApiResponse<PdfExtractResponse>.Fail(
                    $"Erro ao comunicar com a IA: {ex.Message}"));
            }
        }).DisableAntiforgery();
    }

    private static Guid GetUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
