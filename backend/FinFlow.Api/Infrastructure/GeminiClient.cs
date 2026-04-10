using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using FinFlow.Api.Models;

namespace FinFlow.Api.Infrastructure;

public class GeminiClient(IHttpClientFactory httpFactory, IConfiguration config, ILogger<GeminiClient> logger)
{
    private readonly string _apiKey = config["GEMINI__ApiKey"] ?? throw new InvalidOperationException("GEMINI__ApiKey não configurada");

    private const string PromptTemplate = """
        Analise este texto extraído de uma fatura ou boleto bancário e retorne SOMENTE um JSON válido com a seguinte estrutura:
        {
          "items": [
            { "title": "descrição do gasto", "amount": 0.00, "date": "YYYY-MM-DD" }
          ]
        }
        
        Regras:
        - Extraia apenas os lançamentos de gastos/compras presentes na tabela de despesas
        - O campo "amount" deve ser um número decimal positivo (sem símbolo de moeda)
        - O campo "date" deve estar no formato ISO 8601 (YYYY-MM-DD)
        - Se a data não estiver disponível, use a data de vencimento da fatura
        - Ignore totais, subtotais, taxas de juros e linhas de cabeçalho
        - Responda APENAS com o JSON, sem explicações adicionais
        
        Texto da fatura:
        {TEXT}
        """;

    public async Task<IEnumerable<ExtractedExpenseItem>> ExtractExpensesFromTextAsync(string pdfText)
    {
        var prompt = PromptTemplate.Replace("{TEXT}", pdfText);
        var requestBody = new
        {
            contents = new[]
            {
                new { parts = new[] { new { text = prompt } } }
            }
        };

        var client = httpFactory.CreateClient();
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={_apiKey}";

        var json = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        HttpResponseMessage response;
        try
        {
            response = await client.PostAsync(url, content);
            response.EnsureSuccessStatusCode();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Erro ao chamar Gemini API");
            throw;
        }

        var responseJson = await response.Content.ReadAsStringAsync();

        try
        {
            using var doc = JsonDocument.Parse(responseJson);
            var textContent = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString() ?? "{}";

            // Remove blocos markdown se presentes
            textContent = textContent.Trim();
            if (textContent.StartsWith("```")) 
            {
                textContent = textContent.Split('\n', 2)[1];
                textContent = textContent[..textContent.LastIndexOf("```")].Trim();
            }

            using var resultDoc = JsonDocument.Parse(textContent);
            var items = new List<ExtractedExpenseItem>();

            foreach (var item in resultDoc.RootElement.GetProperty("items").EnumerateArray())
            {
                var title = item.GetProperty("title").GetString() ?? "Gasto";
                var amount = item.GetProperty("amount").GetDecimal();
                var dateStr = item.GetProperty("date").GetString() ?? DateOnly.FromDateTime(DateTime.Today).ToString("yyyy-MM-dd");

                if (DateOnly.TryParse(dateStr, out var date))
                    items.Add(new ExtractedExpenseItem(title, amount, date));
            }

            return items;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Erro ao parsear resposta do Gemini: {Response}", responseJson[..Math.Min(500, responseJson.Length)]);
            throw new InvalidOperationException("Não foi possível extrair gastos do PDF. Tente novamente ou insira manualmente.");
        }
    }
}
