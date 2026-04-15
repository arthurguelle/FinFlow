using System.ComponentModel;
using System.Diagnostics;
using System.Text.Json;

namespace FinFlow.Api.Infrastructure;

/// <summary>
/// Extrai texto de PDFs usando o script Python (pdfplumber + pytesseract).
/// Controlado pela flag PDF:ExtractorEngine = "python".
/// </summary>
public static class PythonPdfExtractor
{
    public static async Task<string> ExtractAsync(
        string filePath,
        string? password,
        IConfiguration config,
        ILogger logger)
    {
        var python = config["PDF:ExtractorPython"] ?? "python3";
        var script = config["PDF:ExtractorScript"]
            ?? Path.Combine(AppContext.BaseDirectory, "pdf_extractor", "extract.py");

        // Garante que o caminho do script existe
        if (!File.Exists(script))
            throw new FileNotFoundException($"Script Python não encontrado: {script}");

        var psi = new ProcessStartInfo
        {
            FileName = python,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        // Usar ArgumentList evita injeção de shell via nomes de arquivo
        psi.ArgumentList.Add(script);
        psi.ArgumentList.Add(filePath);
        if (!string.IsNullOrWhiteSpace(password))
            psi.ArgumentList.Add(password);

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        using var process = new Process { StartInfo = psi };

        process.Start();

        var stdoutTask = process.StandardOutput.ReadToEndAsync(cts.Token);
        var stderrTask = process.StandardError.ReadToEndAsync(cts.Token);

        await process.WaitForExitAsync(cts.Token);

        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        if (!string.IsNullOrWhiteSpace(stderr))
            logger.LogDebug("PDF extractor stderr: {Stderr}", stderr);

        if (string.IsNullOrWhiteSpace(stdout))
            throw new InvalidOperationException("Script Python não retornou saída.");

        // Parsear JSON retornado pelo script
        using var doc = JsonDocument.Parse(stdout);
        var root = doc.RootElement;

        if (root.TryGetProperty("error", out var errProp))
        {
            var errMsg = errProp.GetString() ?? "Erro desconhecido no extrator Python.";
            throw new InvalidOperationException(errMsg);
        }

        var text = root.GetProperty("text").GetString()
            ?? throw new InvalidOperationException("Campo 'text' ausente na resposta do extrator.");

        var method = root.TryGetProperty("method", out var m) ? m.GetString() : "unknown";
        var pages = root.TryGetProperty("pages", out var p) ? p.GetInt32() : 0;

        logger.LogInformation(
            "PDF extraído via Python ({Method}, {Pages} pág(s), {Chars} chars)",
            method, pages, text.Length);

        return text;
    }
}
