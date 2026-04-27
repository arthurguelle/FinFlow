using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Data;
using System;
using System.Text;
using System.Text.Json;
using System.Net.Http;
using Dapper;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FinFlow.Api.Endpoints
{
    public static class RagEndpoints
    {
        public static void MapRagEndpoints(this WebApplication app)
        {
            app.MapGet("/rag/suggestions/{userId}", GetSuggestions)
               .RequireAuthorization();
        }

        private static async Task<IResult> GetSuggestions(Guid userId, IRagService ragService)
        {
            var suggestions = await ragService.GetSuggestions(userId);
            return Results.Ok(new { data = suggestions, success = true, error = (string?)null });
        }
    }

    public interface IRagService
    {
        Task<List<RagSuggestionDto>> GetSuggestions(Guid userId);
    }

    public class RagService : IRagService
    {
        private readonly IDbConnection _db;
        private readonly IHttpClientFactory _httpFactory;
        private readonly string _geminiKey;
        private readonly string _groqKey;
        private readonly string _groqModel;
        private readonly ILogger<RagService> _logger;

        private static readonly string[] GeminiModels =
            ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash-8b", "gemini-1.5-flash"];

        public RagService(IDbConnection db, IHttpClientFactory httpFactory, IConfiguration config, ILogger<RagService> logger)
        {
            _db = db;
            _httpFactory = httpFactory;
            _geminiKey = config["GEMINI:ApiKey"] ?? "";
            _groqKey = config["AI:GroqApiKey"] ?? "";
            _groqModel = config["AI:Model"] ?? "llama-3.1-8b-instant";
            _logger = logger;
        }

        public async Task<List<RagSuggestionDto>> GetSuggestions(Guid userId)
        {
            // ── RETRIEVAL: buscar dados do PostgreSQL ──────────────────────
            var raw = (await _db.QueryAsync<RawExpense>(
                """
                SELECT e.title, e.amount, e.expense_date, m.title AS category, m.type
                FROM expenses e
                JOIN movements m ON e.movement_id = m.id
                WHERE e.user_id = @UserId::uuid AND e.deleted_at IS NULL
                ORDER BY e.expense_date DESC
                LIMIT 60
                """, new { UserId = userId })).AsList();

            var aggregated = (await _db.QueryAsync<RagSuggestionDto>(
                "SELECT * FROM suggest_expenses(@UserId::uuid);",
                new { UserId = userId })).AsList();

            if (aggregated.Count == 0) return [];

            // ── AUGMENTED GENERATION: enriquecer com Gemini ou Groq ───────
            if (raw.Count > 0 && (!string.IsNullOrEmpty(_geminiKey) || !string.IsNullOrEmpty(_groqKey)))
            {
                try
                {
                    var tips = await GenerateInsights(raw, aggregated);
                    foreach (var item in aggregated)
                        item.Tip = tips.TryGetValue(item.Category, out var t) ? t : null;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "IA indisponível para RAG; retornando dados sem insights.");
                }
            }

            return aggregated;
        }

        private async Task<Dictionary<string, string>> GenerateInsights(
            List<RawExpense> expenses, List<RagSuggestionDto> aggregated)
        {
            // Montar contexto para o modelo de IA
            var ctx = new StringBuilder();
            ctx.AppendLine("Histórico recente de gastos:");
            foreach (var e in expenses.Take(25))
                ctx.AppendLine($"- {e.ExpenseDate:dd/MM/yyyy} | {e.Category} | {e.Title} | R$ {e.Amount:F2}");
            ctx.AppendLine("\nResumo mensal por categoria:");
            foreach (var a in aggregated)
                ctx.AppendLine($"- {a.Category}: média R$ {a.AverageSpent:F2}");

            var prompt = "Você é um consultor financeiro pessoal objetivo.\n" +
                "Com base nos gastos abaixo, escreva uma dica curta e prática (máximo 2 frases) para cada categoria.\n" +
                "Responda APENAS com JSON válido, sem markdown, no formato exato:\n" +
                "{\"NomeCategoria\": \"dica prática\"}\n\n" +
                ctx.ToString();

            // Tentar Gemini primeiro
            if (!string.IsNullOrEmpty(_geminiKey))
            {
                var result = await TryGemini(prompt);
                if (result != null) return result;
            }

            // Fallback: Groq (OpenAI-compatible)
            if (!string.IsNullOrEmpty(_groqKey))
            {
                var result = await TryGroq(prompt);
                if (result != null) return result;
            }

            return [];
        }

        private async Task<Dictionary<string, string>?> TryGemini(string prompt)
        {
            var body = JsonSerializer.Serialize(new
            {
                contents = new[] { new { parts = new[] { new { text = prompt } } } }
            });

            var client = _httpFactory.CreateClient();
            foreach (var model in GeminiModels)
            {
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={_geminiKey}";
                HttpResponseMessage resp;
                try { resp = await client.PostAsync(url, new StringContent(body, Encoding.UTF8, "application/json")); }
                catch (Exception ex) { _logger.LogWarning(ex, "Erro chamando Gemini {Model}", model); continue; }

                if (!resp.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Gemini {Model} retornou {Status}", model, resp.StatusCode);
                    continue;
                }

                var json = await resp.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var text = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content").GetProperty("parts")[0]
                    .GetProperty("text").GetString() ?? "{}";

                text = text.Replace("```json", "").Replace("```", "").Trim();
                var result = TryParseJsonTips(text);
                if (result != null) { _logger.LogInformation("RAG via Gemini {Model}", model); return result; }
            }
            return null;
        }

        private async Task<Dictionary<string, string>?> TryGroq(string prompt)
        {
            var body = JsonSerializer.Serialize(new
            {
                model = _groqModel,
                messages = new[]
                {
                    new { role = "user", content = prompt }
                },
                temperature = 0.7
            });

            var client = _httpFactory.CreateClient();
            HttpResponseMessage resp;
            try
            {
                var req = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
                req.Headers.Add("Authorization", $"Bearer {_groqKey}");
                req.Content = new StringContent(body, Encoding.UTF8, "application/json");
                resp = await client.SendAsync(req);
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Erro chamando Groq"); return null; }

            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("Groq retornou {Status}", resp.StatusCode);
                return null;
            }

            var json = await resp.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var text = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message").GetProperty("content").GetString() ?? "{}";

            text = text.Replace("```json", "").Replace("```", "").Trim();
            var result = TryParseJsonTips(text);
            if (result != null) { _logger.LogInformation("RAG via Groq {Model}", _groqModel); }
            return result;
        }

        private Dictionary<string, string>? TryParseJsonTips(string text)
        {
            try
            {
                using var doc = JsonDocument.Parse(text);
                var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                foreach (var prop in doc.RootElement.EnumerateObject())
                    result[prop.Name] = prop.Value.GetString() ?? "";
                return result;
            }
            catch (JsonException je)
            {
                _logger.LogWarning(je, "JSON inválido da IA: {Text}", text[..Math.Min(200, text.Length)]);
                return null;
            }
        }

    } // fim RagService

    public class RawExpense
    {
        public string Title { get; set; } = "";
        public decimal Amount { get; set; }
        public DateOnly ExpenseDate { get; set; }
        public string Category { get; set; } = "";
        public string Type { get; set; } = "";
    }

    public class RagSuggestionDto
    {
        public string Category { get; set; } = "";
        public decimal AverageSpent { get; set; }
        public decimal SuggestedAmount { get; set; }
        public string? Tip { get; set; }
    }
}