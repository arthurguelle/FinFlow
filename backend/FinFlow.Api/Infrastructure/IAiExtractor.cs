using FinFlow.Api.Models;

namespace FinFlow.Api.Infrastructure;

/// <summary>
/// Contrato para extração de gastos de texto via IA.
/// Implemente esta interface para suportar novos providers.
/// </summary>
public interface IAiExtractor
{
    Task<IEnumerable<ExtractedExpenseItem>> ExtractExpensesFromTextAsync(string pdfText);

    /// <summary>
    /// Testa a conectividade com o provider de IA sem consumir tokens.
    /// Usa o endpoint de listagem de modelos (GET /models).
    /// </summary>
    Task<AiPingResult> PingAsync();
}
