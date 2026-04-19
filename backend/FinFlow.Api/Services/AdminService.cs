using Microsoft.EntityFrameworkCore;
using FinFlow.Api.Data;
using FinFlow.Api.Models;

namespace FinFlow.Api.Services;

public interface IAdminService
{
    Task<IEnumerable<AdminUserDto>> GetAllUsersAsync();
    Task<AdminUserDto> CreateUserAsync(CreateUserRequest request);
    Task<AdminUserDto> UpdateUserAsync(Guid id, UpdateUserRequest request);
    Task ChangePasswordAsync(Guid id, string newPassword);
    Task DeleteUserAsync(Guid id);
}

public class AdminService(AppDbContext db) : IAdminService
{
    public async Task<IEnumerable<AdminUserDto>> GetAllUsersAsync()
    {
        return await db.Users
            .Where(u => u.DeletedAt == null)
            .OrderBy(u => u.CreatedAt)
            .Select(u => ToDto(u))
            .ToListAsync();
    }

    public async Task<AdminUserDto> CreateUserAsync(CreateUserRequest request)
    {
        if (await db.Users.AnyAsync(u => u.Email == request.Email.ToLower().Trim() && u.DeletedAt == null))
            throw new InvalidOperationException("E-mail já cadastrado.");

        var role = request.Role is "admin" or "user" ? request.Role : "user";

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = request.Email.ToLower().Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = role
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();
        return ToDto(user);
    }

    public async Task<AdminUserDto> UpdateUserAsync(Guid id, UpdateUserRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt == null)
            ?? throw new KeyNotFoundException("Usuário não encontrado.");

        if (user.Email != request.Email.ToLower().Trim())
        {
            if (await db.Users.AnyAsync(u => u.Email == request.Email.ToLower().Trim() && u.DeletedAt == null && u.Id != id))
                throw new InvalidOperationException("E-mail já cadastrado.");
        }

        user.Name = request.Name.Trim();
        user.Email = request.Email.ToLower().Trim();
        user.Role = request.Role is "admin" or "user" ? request.Role : "user";
        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return ToDto(user);
    }

    public async Task ChangePasswordAsync(Guid id, string newPassword)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt == null)
            ?? throw new KeyNotFoundException("Usuário não encontrado.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    public async Task DeleteUserAsync(Guid id)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt == null)
            ?? throw new KeyNotFoundException("Usuário não encontrado.");

        user.DeletedAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    private static AdminUserDto ToDto(User u) =>
        new(u.Id, u.Name, u.Email, u.Role, u.IsActive, u.CreatedAt);
}
