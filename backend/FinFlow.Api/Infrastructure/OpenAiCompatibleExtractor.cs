using System.Text;
using System.Text.Json;
using FinFlow.Api.Models;

namespace FinFlow.Api.Infrastructure;

/// <summary>
/// Extrator compatível com API OpenAI (Groq, OpenRouter, etc.)
/// Configuração via AI__GroqApiKey ou AI__OpenRouterApiKey.
/// </summary>
public class OpenAiCompatibleExtractor(
    IHttpClientFactory httpFactory,
    ILogger<OpenAiCompatibleExtractor> logger,
    string baseUrl,
    string apiKey,
    string model) : IAiExtractor
{
    private const string SystemPrompt = """
        Você é um assistente especializado em extrair lançamentos financeiros de faturas e boletos.
        Retorne SOMENTE um JSON válido, sem markdown, sem explicações:
        {"items":[{"title":"descrição","amount":0.00,"date":"YYYY-MM-DD"}]}
        Regras:
        - Extraia apenas lançamentos de compras/gastos da tabela de despesas
        - "amount" é número decimal positivo (sem símbolo de moeda)
        - "date" no formato YYYY-MM-DD; se ausente, use a data de vencimento
        - Ignore totais, subtotais, taxas de juros, cabeçalhos
        """;

    public async Task<IEnumerable<ExtractedExpenseItem>> ExtractExpensesFromTextAsync(string pdfText)
    {
        var requestBody = new
        {
            model,
            messages = new[]
            {
                new { role = "system", content = SystemPrompt },
                new { role = "user", content = $"Extraia os gastos deste texto:\n\n{pdfText[..Math.Min(pdfText.Length, 8000)]}" }
            },
            temperature = 0.1,
            max_tokens = 2048
        };

        var client = httpFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

        var json = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        HttpResponseMessage response;
        try
        {
            response = await client.PostAsync($"{baseUrl}/chat/completions", content);
            response.EnsureSuccessStatusCode();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Erro ao chamar {BaseUrl} com modelo {Model}", baseUrl, model);
            throw;
        }

        var responseJson = await response.Content.ReadAsStringAsync();

        try
        {
            using var doc = JsonDocument.Parse(responseJson);
            var textContent = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "{}";

            return ParseItems(textContent);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Erro ao parsear resposta: {Resp}", responseJson[..Math.Min(500, responseJson.Length)]);
            throw new InvalidOperationException("Não foi possível extrair gastos do PDF. Tente novamente ou insira manualmente.");
        }
    }

    internal static List<ExtractedExpenseItem> ParseItems(string textContent)
    {
        textContent = textContent.Trim();
        if (textContent.StartsWith("```"))
        {
            var lines = textContent.Split('\n');
            textContent = string.Join('\n', lines[1..^1]).Trim();
        }

        // Encontra JSON mesmo que haja texto antes/depois
        var start = textContent.IndexOf('{');
        var end = textContent.LastIndexOf('}');
        if (start >= 0 && end > start)
            textContent = textContent[start..(end + 1)];

        using var resultDoc = JsonDocument.Parse(textContent);
        var items = new List<ExtractedExpenseItem>();

        foreach (var item in resultDoc.RootElement.GetProperty("items").EnumerateArray())
        {
            var title = item.GetProperty("title").GetString() ?? "Gasto";
            var amount = item.GetProperty("amount").GetDecimal();
            var dateStr = item.GetProperty("date").GetString()
                ?? DateOnly.FromDateTime(DateTime.Today).ToString("yyyy-MM-dd");

            if (DateOnly.TryParse(dateStr, out var date))
                items.Add(new ExtractedExpenseItem(title, amount, date));
        }

        return items;
    }
}
