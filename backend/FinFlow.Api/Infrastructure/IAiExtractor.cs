using FinFlow.Api.Models;

namespace FinFlow.Api.Infrastructure;

/// <summary>
/// Contrato para extração de gastos de texto via IA.
/// Implemente esta interface para suportar novos providers.
/// </summary>
public interface IAiExtractor
{
    Task<IEnumerable<ExtractedExpenseItem>> ExtractExpensesFromTextAsync(string pdfText);
}
