using Microsoft.EntityFrameworkCore;
using FinFlow.Api.Data;
using FinFlow.Api.Models;
using FinFlow.Api.Infrastructure;

namespace FinFlow.Api.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<AuthResponse> RefreshAsync(string token);
    Task RevokeAsync(string token);
}

public class AuthService(AppDbContext db, JwtHelper jwt, ILogger<AuthService> logger) : IAuthService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        if (await db.Users.AnyAsync(u => u.Email == request.Email && u.DeletedAt == null))
            throw new InvalidOperationException("E-mail já cadastrado.");

        var user = new User
        {
            Name = request.Name,
            Email = request.Email.ToLower().Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        logger.LogInformation("Novo usuário registrado: {Email}", user.Email);
        return await BuildAuthResponseAsync(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await db.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email.ToLower().Trim() && u.DeletedAt == null)
            ?? throw new UnauthorizedAccessException("Credenciais inválidas.");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Conta desativada.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Credenciais inválidas.");

        return await BuildAuthResponseAsync(user);
    }

    public async Task<AuthResponse> RefreshAsync(string token)
    {
        var stored = await db.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == token && r.RevokedAt == null)
            ?? throw new UnauthorizedAccessException("Token inválido ou expirado.");

        if (stored.ExpiresAt < DateTime.UtcNow)
        {
            stored.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            throw new UnauthorizedAccessException("Refresh token expirado. Faça login novamente.");
        }

        stored.RevokedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return await BuildAuthResponseAsync(stored.User);
    }

    public async Task RevokeAsync(string token)
    {
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(r => r.Token == token);
        if (stored is not null)
        {
            stored.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
    }

    private async Task<AuthResponse> BuildAuthResponseAsync(User user)
    {
        var accessToken = jwt.GenerateAccessToken(user);
        var refreshTokenValue = jwt.GenerateRefreshToken();
        var expiresAt = DateTime.UtcNow.AddMinutes(60);

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenValue,
            ExpiresAt = jwt.RefreshTokenExpiry
        });
        await db.SaveChangesAsync();

        return new AuthResponse(
            accessToken,
            refreshTokenValue,
            expiresAt,
            new UserDto(user.Id, user.Name, user.Email, user.Role)
        );
    }
}
