using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using FinFlow.Api.Models;

namespace FinFlow.Api.Infrastructure;

public class GeminiClient(IHttpClientFactory httpFactory, IConfiguration config, ILogger<GeminiClient> logger)
{
    private readonly string _apiKey = config["GEMINI:ApiKey"] ?? throw new InvalidOperationException("GEMINI:ApiKey não configurada");

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
        // Modelos em ordem de preferência (free tier)
        var models = new[] { "gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash-8b", "gemini-1.5-flash" };

        HttpResponseMessage response = null!;
        string? lastError = null;
        foreach (var model in models)
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={_apiKey}";
            var json = JsonSerializer.Serialize(requestBody);
            var reqContent = new StringContent(json, Encoding.UTF8, "application/json");
            try
            {
                response = await client.PostAsync(url, reqContent);
                if (response.IsSuccessStatusCode) { logger.LogInformation("Gemini modelo usado: {Model}", model); break; }
                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    logger.LogWarning("Modelo {Model} rate limited, aguardando 3s...", model);
                    await Task.Delay(3000);
                    // tenta o mesmo modelo mais uma vez
                    reqContent = new StringContent(json, Encoding.UTF8, "application/json");
                    response = await client.PostAsync(url, reqContent);
                    if (response.IsSuccessStatusCode) { logger.LogInformation("Gemini modelo usado (retry): {Model}", model); break; }
                }
                lastError = $"{model}: {(int)response.StatusCode}";
                logger.LogWarning("Modelo {Model} retornou {Status}", model, response.StatusCode);
            }
            catch (Exception ex)
            {
                lastError = ex.Message;
                logger.LogWarning(ex, "Erro ao tentar modelo {Model}", model);
            }
        }

        try { response.EnsureSuccessStatusCode(); }
        catch (Exception ex)
        {
            logger.LogError(ex, "Todos os modelos Gemini falharam. Último erro: {Error}", lastError);
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
