using Microsoft.EntityFrameworkCore;
using FinFlow.Api.Data;
using FinFlow.Api.Models;
using FinFlow.Api.Infrastructure;

namespace FinFlow.Api.Services;

public interface IExpenseService
{
    Task<IEnumerable<ExpenseDto>> GetAllAsync(Guid userId, int? year, int? month);
    Task<ExpenseDto> GetByIdAsync(Guid id, Guid userId);
    Task<ExpenseDto> CreateAsync(Guid userId, CreateExpenseRequest request);
    Task<ExpenseDto> UpdateAsync(Guid id, Guid userId, UpdateExpenseRequest request);
    Task DeleteAsync(Guid id, Guid userId);
    Task<SummaryDto> GetSummaryAsync(Guid userId, int? year, int? month);
    Task<PdfExtractResponse> ExtractFromPdfAsync(Guid userId, IFormFile file);
}

public class ExpenseService(AppDbContext db, GeminiClient gemini, IWebHostEnvironment env) : IExpenseService
{
    public async Task<IEnumerable<ExpenseDto>> GetAllAsync(Guid userId, int? year, int? month)
    {
        var query = db.Expenses
            .Include(e => e.Movement)
            .Where(e => e.UserId == userId && e.DeletedAt == null);

        if (year.HasValue)
            query = query.Where(e => e.ExpenseDate.Year == year.Value);
        if (month.HasValue)
            query = query.Where(e => e.ExpenseDate.Month == month.Value);

        return await query
            .OrderByDescending(e => e.ExpenseDate)
            .Select(e => ToDto(e))
            .ToListAsync();
    }

    public async Task<ExpenseDto> GetByIdAsync(Guid id, Guid userId)
    {
        var expense = await db.Expenses
            .Include(e => e.Movement)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId && e.DeletedAt == null)
            ?? throw new KeyNotFoundException("Gasto não encontrado.");

        return ToDto(expense);
    }

    public async Task<ExpenseDto> CreateAsync(Guid userId, CreateExpenseRequest request)
    {
        var expense = new Expense
        {
            UserId = userId,
            MovementId = request.MovementId,
            Title = request.Title.Trim(),
            Amount = request.Amount,
            ExpenseDate = request.ExpenseDate
        };

        db.Expenses.Add(expense);
        await db.SaveChangesAsync();

        await db.Entry(expense).Reference(e => e.Movement).LoadAsync();
        return ToDto(expense);
    }

    public async Task<ExpenseDto> UpdateAsync(Guid id, Guid userId, UpdateExpenseRequest request)
    {
        var expense = await db.Expenses
            .Include(e => e.Movement)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId && e.DeletedAt == null)
            ?? throw new KeyNotFoundException("Gasto não encontrado.");

        expense.Title = request.Title.Trim();
        expense.Amount = request.Amount;
        expense.ExpenseDate = request.ExpenseDate;
        expense.MovementId = request.MovementId;
        expense.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        await db.Entry(expense).Reference(e => e.Movement).LoadAsync();
        return ToDto(expense);
    }

    public async Task DeleteAsync(Guid id, Guid userId)
    {
        var expense = await db.Expenses
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId && e.DeletedAt == null)
            ?? throw new KeyNotFoundException("Gasto não encontrado.");

        expense.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    public async Task<SummaryDto> GetSummaryAsync(Guid userId, int? year, int? month)
    {
        var query = db.Expenses
            .Include(e => e.Movement)
            .Where(e => e.UserId == userId && e.DeletedAt == null);

        if (year.HasValue)
            query = query.Where(e => e.ExpenseDate.Year == year.Value);
        if (month.HasValue)
            query = query.Where(e => e.ExpenseDate.Month == month.Value);

        var expenses = await query.ToListAsync();

        var receitas = expenses
            .Where(e => e.Movement?.Type == "receita")
            .Sum(e => e.Amount);

        var dividas = expenses
            .Where(e => e.Movement?.Type == "divida" || e.Movement == null)
            .Sum(e => e.Amount);

        var byMovement = expenses
            .GroupBy(e => new { e.MovementId, Title = e.Movement?.Title ?? "Sem categoria", Type = e.Movement?.Type ?? "divida" })
            .Select(g => new MovementSummaryDto(
                g.Key.MovementId ?? Guid.Empty,
                g.Key.Title,
                g.Key.Type,
                g.Sum(e => e.Amount)
            ))
            .OrderByDescending(m => m.Total);

        return new SummaryDto(receitas, dividas, receitas - dividas, byMovement);
    }

    public async Task<PdfExtractResponse> ExtractFromPdfAsync(Guid userId, IFormFile file)
    {
        if (file.ContentType != "application/pdf" && !file.FileName.EndsWith(".pdf"))
            throw new ArgumentException("Apenas arquivos PDF são aceitos.");

        if (file.Length > 20 * 1024 * 1024)
            throw new ArgumentException("O arquivo não pode exceder 20MB.");

        // Salva temporariamente
        var uploadsPath = Path.Combine(env.ContentRootPath, "uploads");
        Directory.CreateDirectory(uploadsPath);
        var filePath = Path.Combine(uploadsPath, $"{Guid.NewGuid()}_{file.FileName}");

        await using (var stream = File.Create(filePath))
            await file.CopyToAsync(stream);

        try
        {
            // Extrai texto do PDF usando iTextSharp ou similar
            // Por ora, lemos como bytes e enviamos o nome como contexto ao Gemini
            // Em produção, usar uma lib de extração de texto PDF
            var pdfText = await ExtractTextFromPdfAsync(filePath);
            var items = await gemini.ExtractExpensesFromTextAsync(pdfText);
            return new PdfExtractResponse(items, items.Count());
        }
        finally
        {
            File.Delete(filePath);
        }
    }

    private static async Task<string> ExtractTextFromPdfAsync(string filePath)
    {
        // Leitura básica de bytes — em produção use PdfPig ou iText7
        // O Gemini consegue processar texto extraído de PDFs
        var bytes = await File.ReadAllBytesAsync(filePath);
        // Extrai strings legíveis do binário do PDF
        var text = System.Text.Encoding.UTF8.GetString(bytes)
            .Replace("\0", " ")
            .Replace("\r", "\n");

        // Filtra apenas linhas com conteúdo legível (heurística simples)
        var lines = text.Split('\n')
            .Where(l => l.Trim().Length > 2 && l.Any(char.IsLetterOrDigit))
            .Take(300);

        return string.Join("\n", lines);
    }

    private static ExpenseDto ToDto(Expense e) =>
        new(e.Id, e.Title, e.Amount, e.ExpenseDate, e.SourceFile,
            e.MovementId, e.Movement?.Title, e.Movement?.Type, e.CreatedAt);
}
