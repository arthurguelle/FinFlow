using System.Text;
using System.Text.RegularExpressions;

namespace FinFlow.Api.Infrastructure;

/// <summary>
/// Limpa e compacta o texto extraído de PDFs antes de enviá-lo à IA.
/// Remove ruído remanescente, colapsa espaços e aplica um cap de caracteres.
/// </summary>
public static partial class PdfTextPreprocessor
{

    [GeneratedRegex(@" {2,}")]
    private static partial Regex MultipleSpaces();

    [GeneratedRegex(@"^[-=*_]{3,}$")]
    private static partial Regex DecorativeLine();

    [GeneratedRegex(@"^https?://\S+$|^www\.\S+$|^\S+@\S+\.\S+$")]
    private static partial Regex UrlOrEmail();

    public static string Preprocess(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return raw;

        var lines = raw.Split('\n');

        // Contar frequência para detectar cabeçalhos/rodapés repetidos
        var freq = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var line in lines)
        {
            var s = line.Trim();
            if (s.Length >= 3)
                freq[s] = freq.GetValueOrDefault(s) + 1;
        }

        var result = new StringBuilder(raw.Length);

        foreach (var line in lines)
        {
            var stripped = line.Trim();

            if (stripped.Length < 3) continue;
            if (DecorativeLine().IsMatch(stripped)) continue;
            if (UrlOrEmail().IsMatch(stripped)) continue;

            // Remover linhas repetidas 3+ vezes (cabeçalhos/rodapés paginados)
            if (freq.TryGetValue(stripped, out var count) && count >= 3) continue;

            var clean = MultipleSpaces().Replace(stripped, " ");
            result.AppendLine(clean);
        }

        var filtered = result.ToString();
        return filtered;
    }
}
