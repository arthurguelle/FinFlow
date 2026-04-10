# FinFlow — Copilot Workspace Instructions

## Visão Geral do Projeto
FinFlow é um sistema financeiro web que recebe PDFs de faturas/boletos, extrai gastos via Gemini AI, e apresenta totalizadores financeiros. Roda em VPS com 1GB RAM.

## Stack
- **Backend:** .NET 10 Minimal APIs (C#)
- **Frontend:** Angular (latest) + Angular Material — Standalone Components
- **Banco:** PostgreSQL 16
- **IA:** Google Gemini API (gratuita) via backend
- **Infra:** Docker Compose + Nginx

## Estrutura do Monorepo
```
/backend    — projeto .NET 10
/frontend   — projeto Angular
/database   — scripts SQL (DDL, seed, migrations)
/infra      — docker-compose.yml, nginx.conf
/project    — documentação dos agentes IA (NNN_descricao.md)
```

## Regras de Código

### Geral
- Variáveis de ambiente SEMPRE via `.env` (nunca hardcoded). Suporte a `ASPNETCORE_ENVIRONMENT=Development|Production`.
- Secrets nunca no código-fonte.
- Commits seguem **Conventional Commits**: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`

### Backend (.NET 10)
- Usar **Minimal APIs** — sem controllers MVC.
- **AOT + Trimming** obrigatório no publish para manter RAM < 200MB.
- Organização: `/Endpoints`, `/Models`, `/Services`, `/Data`, `/Infrastructure`.
- Autenticação via **JWT Bearer** com refresh token.
- Respostas padronizadas: `{ data, error, success }`.
- Usar `IResult` e `Results.*` helpers do Minimal API.

### Frontend (Angular)
- **Standalone Components** obrigatório — sem NgModules.
- Angular Material com tema sóbrio (paleta azul-acinzentada / off-white).
- Lazy loading nas rotas.
- Environments: `environment.ts` (dev) e `environment.prod.ts` (prod).
- Interceptor HTTP para JWT automático.

### Banco de Dados
- Scripts em `/database` numerados: `NNN_descricao.sql` (ex: `001_create_tables.sql`).
- Sempre usar `IF NOT EXISTS` e transações nos scripts.
- Nunca alterar scripts existentes — criar novo script de migration.

### Git
- **Proibido commit direto na `main`**.
- Uma branch por tarefa: `feature/nome`, `fix/nome`, `chore/nome`.
- Merge na `main` somente após validação básica.

## Design / UX
- Cores: azul-acinzentado (#4A6FA5), off-white (#F8F9FA), cinza suave (#6C757D), branco (#FFFFFF)
- Tipografia limpa, espaçamento generoso — sensação de sobriedade e leveza.
- Responsivo (mobile-first).
