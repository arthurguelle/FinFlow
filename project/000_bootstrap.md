# 000 — Bootstrap do Projeto FinFlow

**Data:** 2026-04-10  
**Agente:** GitHub Copilot CLI  
**Branch:** `main` (commit inicial) → `feature/project-bootstrap`

---

## Decisões Tomadas

### Estrutura Geral
- Monorepo confirmado com `/backend`, `/frontend`, `/database`, `/infra`, `/project`
- `.github/copilot-instructions.md` criado como contexto always-on para os agentes de IA
- Skills `/new-feature` e `/db-migration` criados em `.github/skills/`

### Stack
| Camada     | Tecnologia                          | Versão   |
|------------|-------------------------------------|----------|
| Backend    | .NET Minimal APIs                   | 10.0.103 |
| Frontend   | Angular + Angular Material          | 21.x     |
| Banco      | PostgreSQL                          | 16       |
| IA         | Google Gemini 1.5 Flash (gratuito)  | API v1beta |
| Infra      | Docker Compose + Nginx              | —        |

### Autenticação
- JWT Bearer com access token (60 min) + refresh token (7 dias)
- Tabela `refresh_tokens` com revogação por `revoked_at`
- BCrypt para hash de senhas

### Banco de Dados
- 3 scripts criados: `001_create_tables.sql`, `002_jwt_tables.sql`, `003_seed.sql`
- Soft delete via `deleted_at TIMESTAMPTZ NULL`
- Trigger automático de `updated_at`

### Backend (.NET 10)
- Estrutura: `Endpoints/`, `Models/`, `Services/`, `Data/`, `Infrastructure/`
- `GeminiClient` extrai gastos de PDFs via prompt estruturado
- Todas as configurações via variáveis de ambiente

### Frontend (Angular)
- 100% standalone components, lazy loading em todas as rotas
- Tema sóbrio: azul-acinzentado `#4A6FA5` + off-white `#F8F9FA`
- Interceptor JWT automático + redirect 401 → `/login`
- 4 telas: Login, Dashboard (totalizadores), Gastos (upload PDF), Categorias

### Otimização VPS (1GB RAM)
- PostgreSQL configurado com `shared_buffers=128MB`, `max_connections=50`
- Build Angular otimizado para produção (lazy chunks por rota)
- Dockerfile com multi-stage build

---

## Próximos Passos Sugeridos
1. Criar `.env` a partir de `.env.example` e preencher as chaves
2. `docker-compose up -d` para subir postgres + backend + nginx
3. Rodar scripts SQL: `docker exec finflow_postgres psql -U finflow -d finflow -f /docker-entrypoint-initdb.d/001_create_tables.sql`
4. Testar endpoints via `curl http://localhost:5000/health`
5. Acessar `http://localhost:80` para o frontend
