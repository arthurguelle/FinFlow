

✅ **FinFlow implementado e commitado!** Aqui está um resumo do que foi feito:

---

## O que foi criado

### 🗂️ Estrutura
- **Git** inicializado com `main`, `.gitignore` otimizado
- **`.github/copilot-instructions.md`** — contexto always-on para IAs futuras
- **Skills**: `new-feature` e `db-migration` em `.github/skills/`

### 🗃️ Database (`/database`)
- `001_create_tables.sql` — tabelas `users`, `movements`, `expenses` com triggers
- `002_jwt_tables.sql` — `refresh_tokens`
- `003_seed.sql` — usuário admin de dev + categorias padrão

### ⚙️ Backend (`.NET 10 Minimal API`)
- **Auth JWT** com refresh token (BCrypt + JwtBearer)
- **Endpoints**: `/auth/login`, `/auth/register`, `/movements`, `/expenses`, `/expenses/extract-pdf`
- **GeminiClient** — envia texto do PDF ao Gemini 1.5 Flash e extrai gastos
- **Totalizadores** via `/expenses/summary`
- 100% configurável por variáveis de ambiente

### 🖥️ Frontend (Angular 21)
- **Login** com validação e feedback visual
- **Dashboard** com filtro mês/ano e cartões de receitas/dívidas/saldo
- **Gastos** com tabela, formulário manual e **upload de PDF → IA**
- **Categorias** com CRUD completo
- Interceptor JWT automático | Tema sóbrio azul-acinzentado

### 🐳 Infra
- `infra/docker-compose.yml` — postgres + backend + nginx
- `infra/nginx.conf` — serve Angular + proxy `/api/` para .NET
- `.env.example` com todos os parâmetros documentados

---

**Para rodar:** copie `.env.example` para `.env`, preencha `POSTGRES_PASSWORD`, `JWT_SECRET` e `GEMINI_API_KEY`, depois `docker-compose up -d` no diretório `infra/`.

Fez alterações.