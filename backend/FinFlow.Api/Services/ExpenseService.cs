using Microsoft.EntityFrameworkCore;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;
using UglyToad.PdfPig.Exceptions;
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
    Task<PdfExtractResponse> ExtractFromPdfAsync(Guid userId, IFormFile file, string? password = null);
    Task<PdfExtractResponse> ExtractFromTextAsync(Guid userId, string text);
}

public class ExpenseService(
    AppDbContext db,
    IAiExtractor ai,
    IWebHostEnvironment env) : IExpenseService
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

    public async Task<PdfExtractResponse> ExtractFromPdfAsync(Guid userId, IFormFile file, string? password = null)
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
            var pdfText = await ExtractPdfTextAsync(filePath, password);
            var processedText = PdfTextPreprocessor.Preprocess(pdfText);
            var items = await ai.ExtractExpensesFromTextAsync(processedText);
            return new PdfExtractResponse(items, items.Count());
        }
        finally
        {
            File.Delete(filePath);
        }
    }

    public async Task<PdfExtractResponse> ExtractFromTextAsync(Guid userId, string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new ArgumentException("O texto não pode estar vazio.");

        var processedText = PdfTextPreprocessor.Preprocess(text);
        var items = await ai.ExtractExpensesFromTextAsync(processedText);
        return new PdfExtractResponse(items, items.Count());
    }

    private static Task<string> ExtractPdfTextAsync(string filePath, string? password)
        => ExtractTextFromPdfAsync(filePath, password);

    private static Task<string> ExtractTextFromPdfAsync(string filePath, string? password = null)
    {
        PdfDocument? doc = null;
        try
        {
            var options = new ParsingOptions();
            if (!string.IsNullOrWhiteSpace(password))
                options.Password = password;

            doc = PdfDocument.Open(filePath, options);
        }
        catch (Exception ex) when (IsEncryptionException(ex))
        {
            if (!string.IsNullOrWhiteSpace(password))
                throw new InvalidOperationException("Senha incorreta. Verifique a senha do PDF e tente novamente.");

            throw new InvalidOperationException(
                "Este PDF está protegido por senha. Clique em 'Importar PDF' e informe a senha do documento.");
        }

        try
        {
            var sb = new System.Text.StringBuilder();
            foreach (var page in doc.GetPages())
            {
                // Extrai palavras com posição para reconstruir linhas
                var words = page.GetWords().ToList();
                if (words.Count == 0)
                {
                    // PDF com texto em imagem — avisa o usuário
                    sb.AppendLine($"[Página {page.Number}: conteúdo em imagem, texto não extraível]");
                    continue;
                }

                // Agrupa palavras por linha (Y próximo = mesma linha)
                var lines = words
                    .GroupBy(w => Math.Round(w.BoundingBox.Bottom, 1))
                    .OrderByDescending(g => g.Key)
                    .Select(g => string.Join(" ", g.OrderBy(w => w.BoundingBox.Left).Select(w => w.Text)));

                foreach (var line in lines)
                    sb.AppendLine(line);

                sb.AppendLine();
            }

            var result = sb.ToString();
            if (result.Trim().Length < 50)
                throw new InvalidOperationException(
                    "Não foi possível extrair texto deste PDF. O documento pode conter apenas imagens. " +
                    "Tente um PDF de fatura digital (não escaneada).");

            return Task.FromResult(result);
        }
        finally
        {
            doc.Dispose();
        }
    }

    /// <summary>
    /// Detecta exceções do PdfPig (incluindo versões customizadas) relacionadas a criptografia/senha.
    /// Verifica tanto o tipo da exceção quanto a mensagem para suportar versões que renomearam exceções.
    /// </summary>
    private static bool IsEncryptionException(Exception ex)
    {
        if (ex is PdfDocumentEncryptedException) return true;

        var typeName = ex.GetType().Name + (ex.GetType().FullName ?? string.Empty);
        if (typeName.Contains("Encrypt", StringComparison.OrdinalIgnoreCase) ||
            typeName.Contains("Password", StringComparison.OrdinalIgnoreCase) ||
            typeName.Contains("Decryp", StringComparison.OrdinalIgnoreCase))
            return true;

        var msg = ex.Message;
        return msg.Contains("encrypt", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("password", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("secured", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("decrypt", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("senha", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("proteg", StringComparison.OrdinalIgnoreCase);
    }

    private static ExpenseDto ToDto(Expense e) =>
        new(e.Id, e.Title, e.Amount, e.ExpenseDate, e.SourceFile,
            e.MovementId, e.Movement?.Title, e.Movement?.Type, e.CreatedAt);
}
