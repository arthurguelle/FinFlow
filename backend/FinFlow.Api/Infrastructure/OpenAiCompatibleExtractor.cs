using System.Text;
using System.Text.Json;
using System.Net;
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
    private static readonly int[] PromptCharBudgets = [15000, 12000, 9000, 7000, 5000, 3500];

    private const string SystemPrompt = """
        Você é um assistente especializado em extrair TODOS os lançamentos financeiros de faturas de cartão e boletos.
        Retorne SOMENTE um JSON válido, sem markdown, sem explicações, sem texto extra:
        {"items":[{"title":"descrição do lançamento","amount":0.00,"date":"YYYY-MM-DD"}]}
        Regras OBRIGATÓRIAS:
        - Extraia TODOS os lançamentos/compras/transações listados, sem omitir nenhum
        - "amount" deve ser número decimal positivo (sem símbolo de moeda, use ponto como separador decimal)
        - "date" deve ser YYYY-MM-DD; se não houver data no item, use a data de vencimento da fatura
        - NÃO inclua: totais, subtotais, pagamento mínimo, encargos, juros, IOF, anuidade, multa, limite de crédito, saldo
        - Inclua parcelamentos (ex: "Netflix 2/12") como lançamentos normais
        - Se o texto contiver várias páginas, processe todas
        """;

    public async Task<IEnumerable<ExtractedExpenseItem>> ExtractExpensesFromTextAsync(string pdfText)
    {
        var client = httpFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

        for (var i = 0; i < PromptCharBudgets.Length; i++)
        {
            var budget = PromptCharBudgets[i];
            var truncated = pdfText[..Math.Min(pdfText.Length, budget)];
            var requestBody = new
            {
                model,
                messages = new[]
                {
                    new { role = "system", content = SystemPrompt },
                    new { role = "user", content = $"Extraia TODOS os lançamentos deste extrato/fatura:\n\n{truncated}" }
                },
                temperature = 0.1,
                max_tokens = 4096
            };

            var json = JsonSerializer.Serialize(requestBody);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            try
            {
                using var response = await client.PostAsync($"{baseUrl}/chat/completions", content);
                response.EnsureSuccessStatusCode();
                var responseJson = await response.Content.ReadAsStringAsync();
                return ParseResponse(responseJson);
            }
            catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.RequestEntityTooLarge)
            {
                if (i < PromptCharBudgets.Length - 1)
                {
                    logger.LogWarning(
                        "Provider retornou 413 para {Chars} chars. Reduzindo payload e tentando novamente.",
                        budget);
                    continue;
                }

                // Último budget esgotado — re-throw preservando StatusCode e mensagem original
                logger.LogWarning("Todos os tamanhos de payload esgotados ({Chars} chars mínimo).", budget);
                throw;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Erro ao chamar {BaseUrl} com modelo {Model}", baseUrl, model);
                throw;
            }
        }

        // Nunca alcançado (o re-throw acima sai do loop), mas necessário para o compilador
        throw new InvalidOperationException("Falha inesperada no loop de retry da IA.");
    }

    private IEnumerable<ExtractedExpenseItem> ParseResponse(string responseJson)
    {
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
