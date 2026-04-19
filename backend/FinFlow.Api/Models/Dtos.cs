namespace FinFlow.Api.Models;

// ── Generic API Response ─────────────────────────────────────────────────────
public record ApiResponse<T>(T? Data, string? Error, bool Success)
{
    public static ApiResponse<T> Ok(T data) => new(data, null, true);
    public static ApiResponse<T> Fail(string error) => new(default, error, false);
}

// ── Auth DTOs ────────────────────────────────────────────────────────────────
public record RegisterRequest(string Name, string Email, string Password);
public record LoginRequest(string Email, string Password);
public record RefreshTokenRequest(string Token);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserDto User
);

public record UserDto(Guid Id, string Name, string Email);

// ── Movement DTOs ────────────────────────────────────────────────────────────
public record CreateMovementRequest(string Title, string? Description, string Type);
public record UpdateMovementRequest(string Title, string? Description, string Type);

public record MovementDto(
    Guid Id,
    string Title,
    string? Description,
    string Type,
    DateTime CreatedAt
);

// ── Expense DTOs ─────────────────────────────────────────────────────────────
public record CreateExpenseRequest(
    string Title,
    decimal Amount,
    DateOnly ExpenseDate,
    Guid? MovementId
);

public record UpdateExpenseRequest(
    string Title,
    decimal Amount,
    DateOnly ExpenseDate,
    Guid? MovementId
);

public record ExpenseDto(
    Guid Id,
    string Title,
    decimal Amount,
    DateOnly ExpenseDate,
    string? SourceFile,
    Guid? MovementId,
    string? MovementTitle,
    string? MovementType,
    DateTime CreatedAt
);

// ── Totalizadores ─────────────────────────────────────────────────────────────
public record SummaryDto(
    decimal TotalReceitas,
    decimal TotalDividas,
    decimal Saldo,
    IEnumerable<MovementSummaryDto> ByMovement
);

public record MovementSummaryDto(
    Guid MovementId,
    string Title,
    string Type,
    decimal Total
);

// ── Bulk Operations ───────────────────────────────────────────────────────────
public record BulkClassifyRequest(List<Guid> Ids, Guid? MovementId);
public record BulkDeleteRequest(List<Guid> Ids);

// ── PDF Upload / Gemini ───────────────────────────────────────────────────────
public record ExtractedExpenseItem(string Title, decimal Amount, DateOnly Date);
public record PdfExtractResponse(IEnumerable<ExtractedExpenseItem> Items, int Count);
public record ExtractTextRequest(string Text);
