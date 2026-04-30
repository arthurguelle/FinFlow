using Microsoft.EntityFrameworkCore;
using FinFlow.Api.Models;

namespace FinFlow.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Movement> Movements => Set<Movement>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ── User ──────────────────────────────────────────────────────────────
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(u => u.Id);
            e.Property(u => u.Id).HasColumnName("id");
            e.Property(u => u.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            e.Property(u => u.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            e.Property(u => u.PasswordHash).HasColumnName("password_hash").IsRequired();
            e.Property(u => u.IsActive).HasColumnName("is_active");
            e.Property(u => u.Role).HasColumnName("role").HasMaxLength(20).HasDefaultValue("user");
            e.Property(u => u.CreatedAt).HasColumnName("created_at");
            e.Property(u => u.UpdatedAt).HasColumnName("updated_at");
            e.Property(u => u.DeletedAt).HasColumnName("deleted_at");
            e.HasIndex(u => u.Email).IsUnique();
        });

        // ── Movement ──────────────────────────────────────────────────────────
        modelBuilder.Entity<Movement>(e =>
        {
            e.ToTable("movements");
            e.HasKey(m => m.Id);
            e.Property(m => m.Id).HasColumnName("id");
            e.Property(m => m.UserId).HasColumnName("user_id");
            e.Property(m => m.Title).HasColumnName("title").HasMaxLength(150).IsRequired();
            e.Property(m => m.Description).HasColumnName("description");
            e.Property(m => m.Type).HasColumnName("type").HasMaxLength(20).IsRequired();
            e.Property(m => m.CreatedAt).HasColumnName("created_at");
            e.Property(m => m.UpdatedAt).HasColumnName("updated_at");
            e.Property(m => m.DeletedAt).HasColumnName("deleted_at");
            e.HasOne(m => m.User).WithMany(u => u.Movements).HasForeignKey(m => m.UserId);
        });

        // ── Expense ───────────────────────────────────────────────────────────
        modelBuilder.Entity<Expense>(e =>
        {
            e.ToTable("expenses");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.MovementId).HasColumnName("movement_id");
            e.Property(x => x.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            e.Property(x => x.Amount).HasColumnName("amount").HasColumnType("numeric(12,2)");
            e.Property(x => x.ExpenseDate).HasColumnName("expense_date");
            e.Property(x => x.DueDate).HasColumnName("due_date");
            e.Property(x => x.SourceFile).HasColumnName("source_file").HasMaxLength(255);
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.Property(x => x.DeletedAt).HasColumnName("deleted_at");
            e.HasOne(x => x.User).WithMany(u => u.Expenses).HasForeignKey(x => x.UserId);
            e.HasOne(x => x.Movement).WithMany(m => m.Expenses).HasForeignKey(x => x.MovementId);
        });

        // ── RefreshToken ──────────────────────────────────────────────────────
        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.ToTable("refresh_tokens");
            e.HasKey(r => r.Id);
            e.Property(r => r.Id).HasColumnName("id");
            e.Property(r => r.UserId).HasColumnName("user_id");
            e.Property(r => r.Token).HasColumnName("token").IsRequired();
            e.Property(r => r.ExpiresAt).HasColumnName("expires_at");
            e.Property(r => r.RevokedAt).HasColumnName("revoked_at");
            e.Property(r => r.CreatedAt).HasColumnName("created_at");
            e.HasIndex(r => r.Token).IsUnique();
            e.HasOne(r => r.User).WithMany(u => u.RefreshTokens).HasForeignKey(r => r.UserId);
        });
    }
}
