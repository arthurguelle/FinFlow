using System.Text;
using System.Text.Json;
using FinFlow.Api.Models;

namespace FinFlow.Api.Infrastructure;

public class GeminiClient(IHttpClientFactory httpFactory, IConfiguration config, ILogger<GeminiClient> logger) : IAiExtractor
{
    private readonly string _apiKey = config["GEMINI:ApiKey"] ?? "";

    private const string PromptTemplate = """
        Analise este texto extraído de uma fatura ou boleto bancário e retorne SOMENTE um JSON válido:
        {"items":[{"title":"descrição do gasto","amount":0.00,"date":"YYYY-MM-DD"}]}
        Regras:
        - Extraia apenas os lançamentos de gastos/compras da tabela de despesas
        - "amount" deve ser número decimal positivo (sem símbolo de moeda)
        - "date" no formato YYYY-MM-DD; se ausente, use a data de vencimento
        - Ignore totais, subtotais, taxas de juros e cabeçalhos
        - Responda APENAS com o JSON, sem explicações
        
        Texto da fatura:
        {TEXT}
        """;

    private static readonly string[] Models =
        ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash-8b", "gemini-1.5-flash"];

    public async Task<IEnumerable<ExtractedExpenseItem>> ExtractExpensesFromTextAsync(string pdfText)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
            throw new InvalidOperationException("GEMINI:ApiKey não configurada.");

        var prompt = PromptTemplate.Replace("{TEXT}", pdfText);
        var requestBody = new
        {
            contents = new[] { new { parts = new[] { new { text = prompt } } } }
        };

        var client = httpFactory.CreateClient();
        HttpResponseMessage response = null!;
        string? lastError = null;

        foreach (var model in Models)
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={_apiKey}";
            var json = JsonSerializer.Serialize(requestBody);
            var reqContent = new StringContent(json, Encoding.UTF8, "application/json");
            try
            {
                response = await client.PostAsync(url, reqContent);
                if (response.IsSuccessStatusCode) { logger.LogInformation("Gemini modelo: {Model}", model); break; }
                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    logger.LogWarning("Modelo {Model} rate limited, aguardando 3s...", model);
                    await Task.Delay(3000);
                    reqContent = new StringContent(json, Encoding.UTF8, "application/json");
                    response = await client.PostAsync(url, reqContent);
                    if (response.IsSuccessStatusCode) { break; }
                }
                lastError = $"{model}: {(int)response.StatusCode}";
                logger.LogWarning("Modelo {Model} retornou {Status}", model, response.StatusCode);
            }
            catch (Exception ex) { lastError = ex.Message; logger.LogWarning(ex, "Erro modelo {Model}", model); }
        }

        try { response.EnsureSuccessStatusCode(); }
        catch (Exception ex)
        {
            logger.LogError(ex, "Todos os modelos Gemini falharam. Último: {Error}", lastError);
            throw;
        }

        var responseJson = await response.Content.ReadAsStringAsync();
        try
        {
            using var doc = JsonDocument.Parse(responseJson);
            var textContent = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content").GetProperty("parts")[0]
                .GetProperty("text").GetString() ?? "{}";

            return OpenAiCompatibleExtractor.ParseItems(textContent);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Erro ao parsear resposta Gemini: {Resp}", responseJson[..Math.Min(500, responseJson.Length)]);
            throw new InvalidOperationException("Não foi possível extrair gastos do PDF. Tente novamente ou insira manualmente.");
        }
    }

    /// <summary>
    /// Testa conectividade com a API Gemini sem consumir tokens.
    /// Chama GET /models que lista os modelos disponíveis.
    /// </summary>
    public async Task<AiPingResult> PingAsync()
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
            return new AiPingResult(false, "gemini", null, 0, null, "GEMINI:ApiKey não configurada.");

        var url = $"https://generativelanguage.googleapis.com/v1beta/models?key={_apiKey}&pageSize=5";
        var client = httpFactory.CreateClient();
        var sw = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            var response = await client.GetAsync(url);
            sw.Stop();

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                return new AiPingResult(
                    false, "gemini", null, (int)sw.ElapsedMilliseconds,
                    null, $"HTTP {(int)response.StatusCode}: {body[..Math.Min(200, body.Length)]}");
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var models = doc.RootElement
                .GetProperty("models")
                .EnumerateArray()
                .Select(m => m.GetProperty("name").GetString())
                .Where(n => n != null)
                .Take(3)
                .ToList();

            logger.LogInformation("[AI Ping] Gemini OK ({Ms}ms) — modelos: {Models}",
                sw.ElapsedMilliseconds, string.Join(", ", models));

            return new AiPingResult(
                true, "gemini", models.FirstOrDefault(),
                (int)sw.ElapsedMilliseconds,
                $"Modelos disponíveis: {string.Join(", ", models)}",
                null);
        }
        catch (Exception ex)
        {
            sw.Stop();
            logger.LogError(ex, "[AI Ping] Gemini falhou");
            return new AiPingResult(false, "gemini", null, (int)sw.ElapsedMilliseconds, null, ex.Message);
        }
    }
}
