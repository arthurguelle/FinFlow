---
applyTo: backend/**
---

# Backend Instructions — .NET 10 Minimal APIs

## Estrutura de Pastas
```
backend/
  FinFlow.Api/
    Endpoints/       # Um arquivo por domínio (AuthEndpoints.cs, ExpenseEndpoints.cs...)
    Models/          # DTOs e entidades do domínio
    Services/        # Lógica de negócio (interfaces + implementações)
    Data/            # DbContext, repositórios, migrations
    Infrastructure/  # JWT helper, Gemini client, FileStorage
    Program.cs       # Entry point — registrar serviços e mapear endpoints
```

## Regras Obrigatórias
1. **Minimal API** — usar `app.MapGet/Post/Put/Delete`, nunca `[ApiController]`.
2. **AOT + Trimming** — o `.csproj` deve ter `<PublishAot>true</PublishAot>` e `<TrimmerRootDescriptor>` configurado.
3. **JWT** — usar `Microsoft.AspNetCore.Authentication.JwtBearer`. Chaves via env vars: `JWT__Secret`, `JWT__Issuer`, `JWT__Audience`, `JWT__ExpiresInMinutes`.
4. **PostgreSQL** — usar `Npgsql.EntityFrameworkCore.PostgreSQL`. Connection string via `DATABASE_URL` ou `ConnectionStrings__Default`.
5. **Resposta padrão:**
   ```csharp
   record ApiResponse<T>(T? Data, string? Error, bool Success);
   ```
6. **Gemini** — chave via `GEMINI__ApiKey`. Nunca expor no frontend.
7. **Upload de PDF** — salvar temporariamente em `/uploads` (ignorado no git), processar e deletar.
8. **CORS** — configurar via `CORS__AllowedOrigins` no env.

## Convenções de Nomenclatura
- Endpoints: verbos HTTP + substantivo (ex: `MapPost("/auth/login", ...)`)
- Services: interface `IExpenseService` + implementação `ExpenseService`
- Entidades: PascalCase, propriedades com `{ get; set; }`
