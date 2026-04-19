# FinFlow 💸

> **Sistema de gestão financeira pessoal com extração inteligente de gastos via IA.**

O FinFlow é uma aplicação web full-stack que permite ao usuário importar faturas de cartão de crédito e boletos em PDF, extrair os gastos automaticamente usando inteligência artificial (Google Gemini / Groq), categorizá-los e acompanhar seu desempenho financeiro por meio de um dashboard com totalizadores em tempo real.

---

## ✨ Funcionalidades

- 🔐 **Autenticação JWT** com refresh token e controle de sessão
- 👥 **Multi-usuário** com isolamento total de dados por usuário
- 🛡️ **Controle de acesso por roles** (`admin` / `user`) — admins gerenciam todos os usuários
- 📄 **Upload de PDF** de faturas e boletos com extração automática de itens por IA
- ✏️ **Revisão manual** dos gastos extraídos antes de salvar
- 🏷️ **Categorias** (Movimentos) com tipo receita ou dívida
- 📊 **Dashboard** com totalizadores de receitas, dívidas e saldo por mês/ano
- 🔍 **Busca e filtros** por título, categoria, data e faixa de valor
- ✅ **Seleção em massa** — exclui vários gastos de uma vez
- 📋 **Colar texto** — extrai gastos de texto colado (e-mail, extrato copiado)

---

## 🚀 Stack Tecnológica

### Backend
| Tecnologia | Versão | Uso |
|---|---|---|
| **.NET** | 10 | Runtime da aplicação |
| **ASP.NET Core Minimal APIs** | 10 | API REST sem overhead de controllers |
| **Entity Framework Core** | 10 | ORM para acesso ao banco |
| **PostgreSQL** (Npgsql) | 16 | Banco de dados relacional |
| **JWT Bearer** | — | Autenticação stateless com refresh token |
| **BCrypt.Net** | — | Hash seguro de senhas |
| **PdfPig** | — | Extração de texto de PDFs em C# |
| **Google Gemini API** | 1.5 Flash | Extração de gastos via IA generativa |
| **Groq API** | — | Alternativa de IA (LLaMA 3.1) |

### Frontend
| Tecnologia | Versão | Uso |
|---|---|---|
| **Angular** | 21 | Framework SPA |
| **Angular Material** | 21 | Componentes UI (MDC) |
| **TypeScript** | 5.x | Tipagem estática |
| **RxJS** | — | Programação reativa e HTTP |
| **SCSS** | — | Estilos com variáveis CSS customizadas |

### Infraestrutura
| Tecnologia | Uso |
|---|---|
| **Docker + Docker Compose** | Orquestração dos serviços |
| **Nginx** | Serve o Angular estático + proxy reverso para a API |
| **VPS Linux (Ubuntu 24.04)** | Hospedagem em servidor próprio |
| **SSH** | Deploy automatizado via script bash |

---

## 🏗️ Arquitetura

```
FinFlow/
├── backend/                    # .NET 10 Minimal API
│   └── FinFlow.Api/
│       ├── Endpoints/          # Rotas (AuthEndpoints, ExpenseEndpoints, ...)
│       ├── Services/           # Lógica de negócio
│       ├── Models/             # Entidades e DTOs
│       ├── Data/               # AppDbContext (EF Core)
│       └── Infrastructure/     # GeminiClient, JwtHelper, PdfExtractor
├── frontend/                   # Angular 21 (Standalone Components)
│   └── src/app/
│       ├── core/               # Guards, Interceptors, Services, Models
│       ├── features/           # Telas: auth, dashboard, expenses, movements, users
│       └── shared/             # Componentes reutilizáveis
├── database/                   # Scripts SQL versionados (001, 002, 003...)
├── infra/                      # docker-compose.yml + nginx.conf
└── .github/                    # Copilot instructions + Skills de IA
```

### Fluxo de extração PDF com IA

```
Usuário faz upload do PDF
        ↓
Backend extrai o texto (PdfPig / Python pdfminer)
        ↓
Texto enviado ao Gemini/Groq com prompt estruturado
        ↓
IA retorna JSON com lista de gastos (título, valor, data)
        ↓
Usuário revisa e confirma os itens
        ↓
Gastos salvos no PostgreSQL vinculados ao usuário
```

---

## 🔒 Segurança

- Senhas armazenadas com **BCrypt** (fator de custo 12)
- Tokens JWT com expiração curta + **refresh token** rotativo
- **CORS** configurado por variável de ambiente
- Dados de cada usuário isolados por `user_id` em todas as queries
- Variáveis sensíveis (secrets, API keys) **nunca no código** — apenas via `.env`
- `.gitignore` exclui `.env`, chaves SSH e arquivos de build

---

## ⚙️ Como Rodar Localmente

### Pré-requisitos
- Docker Desktop
- .NET 10 SDK
- Node.js 20+ e npm

### 1. Configurar variáveis de ambiente

```bash
cp infra/.env.example infra/.env.prod
# Edite infra/.env.prod com suas chaves
```

### 2. Subir os containers

```bash
cd infra
docker compose up -d
```

### 3. Aplicar as migrations do banco

```bash
# Conecta no postgres e aplica os scripts em database/
docker exec -i finflow_postgres psql -U finflow -d finflow < ../database/001_create_tables.sql
docker exec -i finflow_postgres psql -U finflow -d finflow < ../database/002_jwt_tables.sql
docker exec -i finflow_postgres psql -U finflow -d finflow < ../database/003_seed.sql
```

### 4. Acessar

| Serviço | URL |
|---|---|
| Frontend | http://localhost |
| API | http://localhost/api |
| Health check | http://localhost/api/health |

**Credenciais padrão (seed):** `admin@finflow.dev` / `Admin@123`

---

## 🌐 Deploy em Produção

O projeto possui um script de deploy completo para VPS:

```bash
# Deploy completo (frontend + backend)
./deploy.sh

# Apenas o backend (mais rápido)
./deploy.sh --backend-only
```

O script automatiza: build do Angular → publish do .NET → SCP para VPS → rebuild dos containers via Docker Compose.

---

## 📸 Screenshots

> *(Em breve — adicionar capturas do dashboard, tela de gastos e upload de PDF)*

---

## 🧠 Decisões de Arquitetura

| Decisão | Motivo |
|---|---|
| Minimal APIs (sem Controllers) | Menor overhead, código mais direto e compatível com AOT |
| Standalone Components no Angular | Elimina NgModules, bundles menores, lazy loading nativo |
| Múltiplos providers de IA | Permite trocar Gemini por Groq via variável de ambiente sem redeployar |
| Scripts SQL versionados | Rastreabilidade de schema sem ORM migrations |
| VPS própria | Controle total, custo fixo baixo, sem cold start |

---

## 👨‍💻 Autor

**Arthur Guelle**
- GitHub: [@arthurguelle](https://github.com/arthurguelle)

---

## 📄 Licença

Este projeto é de uso pessoal / portfólio. Sinta-se à vontade para usar como referência.
