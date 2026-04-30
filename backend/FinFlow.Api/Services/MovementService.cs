using Microsoft.EntityFrameworkCore;
using FinFlow.Api.Data;
using FinFlow.Api.Models;

namespace FinFlow.Api.Services;

public interface IMovementService
{
    Task<IEnumerable<MovementDto>> GetAllAsync(Guid userId);
    Task<MovementDto> GetByIdAsync(Guid id, Guid userId);
    Task<MovementDto> CreateAsync(Guid userId, CreateMovementRequest request);
    Task<MovementDto> UpdateAsync(Guid id, Guid userId, UpdateMovementRequest request);
    Task DeleteAsync(Guid id, Guid userId);
}

public class MovementService(AppDbContext db) : IMovementService
{
    public async Task<IEnumerable<MovementDto>> GetAllAsync(Guid userId)
    {
        return await db.Movements
            .Where(m => m.UserId == userId && m.DeletedAt == null)
            .OrderBy(m => m.Title)
            .Select(m => ToDto(m))
            .ToListAsync();
    }

    public async Task<MovementDto> GetByIdAsync(Guid id, Guid userId)
    {
        var movement = await db.Movements
            .FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId && m.DeletedAt == null)
            ?? throw new KeyNotFoundException("Movimentação não encontrada.");

        return ToDto(movement);
    }

    public async Task<MovementDto> CreateAsync(Guid userId, CreateMovementRequest request)
    {
        ValidateType(request.Type);

        var movement = new Movement
        {
            UserId = userId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Type = request.Type
        };

        db.Movements.Add(movement);
        await db.SaveChangesAsync();
        return ToDto(movement);
    }

    public async Task<MovementDto> UpdateAsync(Guid id, Guid userId, UpdateMovementRequest request)
    {
        ValidateType(request.Type);

        var movement = await db.Movements
            .FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId && m.DeletedAt == null)
            ?? throw new KeyNotFoundException("Movimentação não encontrada.");

        movement.Title = request.Title.Trim();
        movement.Description = request.Description?.Trim();
        movement.Type = request.Type;
        movement.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return ToDto(movement);
    }

    public async Task DeleteAsync(Guid id, Guid userId)
    {
        var movement = await db.Movements
            .FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId && m.DeletedAt == null)
            ?? throw new KeyNotFoundException("Movimentação não encontrada.");

        movement.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    private static void ValidateType(string type)
    {
        if (type is not ("receita" or "divida" or "promessa_pagamento" or "promessa_recebimento"))
            throw new ArgumentException("Tipo deve ser 'receita', 'divida', 'promessa_pagamento' ou 'promessa_recebimento'.");
    }

    private static MovementDto ToDto(Movement m) =>
        new(m.Id, m.Title, m.Description, m.Type, m.CreatedAt);
}
