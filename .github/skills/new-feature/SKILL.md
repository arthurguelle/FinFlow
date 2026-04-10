---
description: Workflow completo para adicionar uma nova feature ao FinFlow (branch → backend → SQL → frontend → commit)
---

# Skill: new-feature

Use este skill quando precisar implementar uma nova funcionalidade no FinFlow do zero.

## Fluxo de Execução

### 1. Criar Branch
```bash
git checkout main && git pull
git checkout -b feature/<nome-da-feature>
```

### 2. Backend — Endpoint + Service
Criar em `backend/FinFlow.Api/`:
- `Endpoints/<Domain>Endpoints.cs` — mapeamento das rotas
- `Models/<Domain>Dto.cs` — DTOs de request/response
- `Services/I<Domain>Service.cs` + `Services/<Domain>Service.cs`
- Registrar no `Program.cs`: `builder.Services.AddScoped<I<Domain>Service, <Domain>Service>();`
- Mapear no `Program.cs`: `app.Map<Domain>Endpoints();`

### 3. Migration SQL
Verificar o último número em `database/` e criar `NNN_descricao.sql`.
Seguir o padrão do `database.instructions.md`.

### 4. Frontend — Component + Route
- Criar `frontend/src/app/features/<feature>/` com standalone component
- Adicionar rota com lazy load em `app.routes.ts`:
  ```typescript
  { path: '<rota>', loadComponent: () => import('./features/<feature>/<feature>.component').then(m => m.<Feature>Component) }
  ```
- Criar service em `core/services/` se necessário

### 5. Commit com Conventional Commits
```bash
git add .
git commit -m "feat: <descrição clara da feature>

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### 6. Checklist Final
- [ ] Endpoint retorna `ApiResponse<T>` padrão
- [ ] Variáveis sensíveis via env var
- [ ] Component usa `standalone: true`
- [ ] Rota tem lazy loading
- [ ] Script SQL usa `BEGIN/COMMIT` e `IF NOT EXISTS`
