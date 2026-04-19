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
    // Tamanhos de chunk para processar o PDF em partes quando necessário.
    // Groq llama-3.1-8b free tier aceita ~4000 chars por chamada sem 413.
    private const int ChunkSize = 3500;
    // 4096 tokens é suficiente para ~80 itens de fatura. Limitar evita que o modelo
    // entre em loop gerando itens repetidos infinitamente.
    private const int MaxTokensOutput = 4096;

    private const string SystemPrompt = """
        Você é um extrator de lançamentos financeiros de faturas de cartão de crédito brasileiras.
        Retorne SOMENTE um JSON válido, sem markdown, sem comentários, sem texto adicional:
        {"items":[{"title":"NOME DO ESTABELECIMENTO","amount":0.00,"date":"YYYY-MM-DD"}]}

        REGRAS:
        1. "title": use EXATAMENTE o nome do estabelecimento/lançamento como aparece no extrato (ex: "NETFLIX.COM", "UBER *TRIP", "SUPERMERCADO EXTRA 03/12")
        2. "amount": valor decimal positivo, use ponto como separador (ex: 49.90)
        3. "date": formato YYYY-MM-DD. Se a linha tiver DD/MM ou DD/MM/AA, converta. Se não houver data, use a data de vencimento da fatura.
        4. NO texto de fatura, cada linha de lançamento tem formato típico: DATA ESTABELECIMENTO [PARCELA] VALOR
        5. INCLUA todos os lançamentos: compras, parcelamentos, débitos
        6. EXCLUA: total da fatura, pagamento mínimo, saldo anterior, limite, IOF, encargos, juros, multas, créditos e estornos
        7. EXCLUA qualquer linha cujo valor termina com hífen/traço (ex: "R$ 13,33-" ou "13,33-") — esses são créditos/descontos, não gastos
        8. Se receber texto parcial, extraia apenas os lançamentos presentes no trecho recebido.
        """;

    public async Task<IEnumerable<ExtractedExpenseItem>> ExtractExpensesFromTextAsync(string pdfText)
    {
        // Divide o texto em chunks para cobrir o PDF inteiro independente do tamanho.
        var chunks = SplitIntoChunks(pdfText, ChunkSize);
        logger.LogInformation("Processando PDF em {Count} chunk(s) de até {Size} chars", chunks.Count, ChunkSize);

        // Groq free tier: 6K tokens/min, ~1500 tokens/request → max ~4 req/min → 15s de intervalo.
        const int DelayBetweenChunksMs = 15000;

        var allItems = new List<ExtractedExpenseItem>();
        for (var ci = 0; ci < chunks.Count; ci++)
        {
            if (ci > 0)
            {
                logger.LogInformation("Aguardando {Delay}ms antes do chunk {Num} (rate limit)", DelayBetweenChunksMs, ci + 1);
                await Task.Delay(DelayBetweenChunksMs);
            }
            var chunkItems = await ExtractChunkWithRetryAsync(chunks[ci], ci + 1, chunks.Count);
            allItems.AddRange(chunkItems);
        }

        // Remove duplicatas exatas (title + amount + date)
        var distinct = allItems
            .GroupBy(x => $"{x.Title}|{x.Amount}|{x.Date}")
            .Select(g => g.First())
            .ToList();

        logger.LogInformation("Extração concluída: {Total} lançamentos ({Chunks} chunks)", distinct.Count, chunks.Count);
        return distinct;
    }

    private async Task<IEnumerable<ExtractedExpenseItem>> ExtractChunkWithRetryAsync(
        string chunk, int chunkNum, int totalChunks)
    {
        // Budgets de retry: se 413 ocorrer, reduz o payload particionando o chunk
        int[] retryBudgets = [chunk.Length, (int)(chunk.Length * 0.70), (int)(chunk.Length * 0.50)];

        var client = httpFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

        var rateRetries = 0;
        const int MaxRateRetries = 3;

        for (var i = 0; i < retryBudgets.Length; i++)
        {
            var budget = retryBudgets[i];
            var text = chunk[..Math.Min(chunk.Length, budget)];

            var userContent = totalChunks > 1
                ? $"Extrato parte {chunkNum}/{totalChunks}. Extraia os lançamentos deste trecho:\n\n{text}"
                : $"Extraia TODOS os lançamentos desta fatura:\n\n{text}";

            var requestBody = new
            {
                model,
                messages = new[]
                {
                    new { role = "system", content = SystemPrompt },
                    new { role = "user",   content = userContent }
                },
                temperature = 0.0,
                max_tokens = MaxTokensOutput
            };

            var json = JsonSerializer.Serialize(requestBody);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            try
            {
                using var response = await client.PostAsync($"{baseUrl}/chat/completions", content);

                if (response.StatusCode == HttpStatusCode.RequestEntityTooLarge ||
                    (int)response.StatusCode == 413)
                {
                    var errBody = await response.Content.ReadAsStringAsync();
                    logger.LogWarning("413 chunk={Chunk} budget={Budget}: {Err}",
                        chunkNum, budget, errBody[..Math.Min(200, errBody.Length)]);

                    if (i < retryBudgets.Length - 1) continue;

                    // Último retry: retorna lista vazia para este chunk em vez de falhar tudo
                    logger.LogWarning("Chunk {Chunk} ignorado após todos os retries (413 persistente)", chunkNum);
                    return [];
                }

                if (response.StatusCode == HttpStatusCode.TooManyRequests || (int)response.StatusCode == 429)
                {
                    // Lê Retry-After do header (Groq retorna o tempo exato em segundos)
                    var retryAfterSec = 20; // fallback
                    if (response.Headers.TryGetValues("Retry-After", out var raValues) &&
                        int.TryParse(raValues.FirstOrDefault(), out var parsed))
                    {
                        retryAfterSec = parsed + 2; // +2s de margem
                    }
                    else if (response.Headers.TryGetValues("x-ratelimit-reset-tokens", out var rtValues))
                    {
                        // Groq retorna formato "1.234s" ou "10s"
                        var rtRaw = rtValues.FirstOrDefault() ?? "";
                        if (rtRaw.EndsWith("s") && double.TryParse(
                            rtRaw.TrimEnd('s'),
                            System.Globalization.NumberStyles.Float,
                            System.Globalization.CultureInfo.InvariantCulture, out var secs))
                        {
                            retryAfterSec = (int)Math.Ceiling(secs) + 2;
                        }
                    }
                    logger.LogWarning("429 chunk={Chunk} — aguardando {Sec}s antes de retry", chunkNum, retryAfterSec);
                    await Task.Delay(retryAfterSec * 1000);
                    // Não incrementa i — repete o mesmo budget
                    rateRetries++;
                    if (rateRetries >= MaxRateRetries)
                        throw new InvalidOperationException("Limite de requisições da API de IA atingido após 3 tentativas. Tente novamente em alguns minutos.");
                    i--;
                    continue;
                }

                response.EnsureSuccessStatusCode();
                var responseJson = await response.Content.ReadAsStringAsync();
                logger.LogInformation("Chunk {Chunk}/{Total} OK: {Chars} chars enviados", chunkNum, totalChunks, budget);
                return ParseResponse(responseJson);
            }
            catch (InvalidOperationException) { throw; }
            catch (Exception ex)
            {
                logger.LogError(ex, "Erro no chunk {Chunk} com {BaseUrl}", chunkNum, baseUrl);
                throw;
            }
        }

        return [];
    }

    private static List<string> SplitIntoChunks(string text, int chunkSize)
    {
        if (text.Length <= chunkSize) return [text];

        var chunks = new List<string>();
        var pos = 0;
        while (pos < text.Length)
        {
            var end = Math.Min(pos + chunkSize, text.Length);
            // Tenta quebrar em newline para não cortar no meio de uma linha
            if (end < text.Length)
            {
                var lastNewline = text.LastIndexOf('\n', end, Math.Min(200, end - pos));
                if (lastNewline > pos) end = lastNewline + 1;
            }
            chunks.Add(text[pos..end]);
            pos = end;
        }
        return chunks;
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

        var start = textContent.IndexOf('{');
        if (start < 0) return [];

        var candidate = textContent[start..];

        // Estratégia 1: JSON completo e válido
        var end = candidate.LastIndexOf('}');
        if (end > 0)
        {
            try { return ExtractFromDoc(candidate[..(end + 1)]); }
            catch { /* truncado — continua */ }
        }

        // Estratégia 2: truncado no meio de um item
        // Localiza o último item COMPLETO (termina com "},")
        var lastComma = candidate.LastIndexOf("},");
        if (lastComma > 0)
        {
            try { return ExtractFromDoc(candidate[..(lastComma + 1)] + "]}"); }
            catch { /* continua */ }
        }

        // Estratégia 3: fecha a estrutura na força bruta
        try { return ExtractFromDoc(candidate.TrimEnd().TrimEnd(',') + "]}"); }
        catch { }

        return [];
    }

    private static List<ExtractedExpenseItem> ExtractFromDoc(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var items = new List<ExtractedExpenseItem>();
        foreach (var item in doc.RootElement.GetProperty("items").EnumerateArray())
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
