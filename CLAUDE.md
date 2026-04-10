# Normas de projeto #
1. toda estrutura de backend vai ficar na pasta corespondente. Ingualmente o frontend, na pasta project sera usada para documentar a movimentação efetuad pelos agents de i.a e a pasta database ira conter os scripts para crição do banco de dados.
2. Sera utilizada .NET na versão 10 para o backend minimal.APIs e o frontend sera gerado com angular, preferencialmnete com material components, o banco de dados sera postgres.
3. Cada inicio de tarefa deve ser criado uma nova branch para modo de versionar o projeto e a mesma ser utilizada para commits.
4. Durante a criação do projeto o gitgnore deve ser otimizado. 
5. deve ser o maximo otimizado a questao de variavel de ambiente. sendo que facilmnete mudaremo com um flag de ambiente de dev para prod.

 
# Adição #
1. Estrutura de Pastas (Organização do Repositório)
Toda a lógica será centralizada em um Monorepo, facilitando o contexto para os agentes de IA.

/backend: Contendo o projeto .NET 10 (Minimal APIs).

/frontend: Contendo o projeto Angular com Material Components.

/database: Scripts SQL de criação (DDL), população inicial (Seed) e controle de versões do banco.

/project: Documentação exclusiva da movimentação dos agentes de IA, logs de decisão e histórico de arquitetura arquivos devem seguir orden de 0 e ir adicionar 1 a 1.

/infra:  Para centralizar o arquivo docker-compose.yml ou scripts de deploy e configuração do Nginx para a VPS única.

2. Definições Tecnológicas e Otimização
Para que a stack rode de forma estável no seu hardware de 1GB, as normas de construção são:

Backend: .NET 10 Minimal APIs.

Regra de Construção: Uso obrigatório de Trimming e AOT (Ahead-of-Time) no momento do publish para reduzir o consumo de RAM para menos de 200MB.

Frontend: Angular + Material.

Regra de Construção: Uso de Standalone Components para evitar a sobrecarga de módulos e build otimizado para produção (production configuration) para ser servido como arquivos estáticos via Nginx.

Banco de Dados: PostgreSQL.

Regra de Construção: Configuração de limites de memória (shared_buffers) e conexões máximas para evitar o travamento da VPS.

3. Fluxo de Trabalho e Versionamento
Disciplina no Git é fundamental, especialmente quando se trabalha com agentes de IA.

Branches: Uma nova branch por tarefa (ex: feature/cadastro-usuario). Proibido realizar commits diretos na main.

Commits: Uso de Conventional Commits (ex: feat:, fix:, docs:, chore:) para que o histórico seja legível tanto para humanos quanto para IAs.

Merge: As branches só devem ser mescladas à main após a validação básica da funcionalidade.

# O Projeto #
O sistema se trata de um site https que vai receber pdf de fatura de cartão ou boletos , enviar para uma ia gratuita via api penso em Gemini  para estrair os gastos parte que é uma tabela no pdf e com isso vai salvar no banco os gastos com titulo, valor, data, e Movimneto (origem,esse vai vir de uma segunda tabela uqe vai ter titulo,descrição e tipo (receita, divida)). Apos esses iputs vamos gear totalizadores .E importante uma tela de login e lwt implemenatado, ja configurado com as tabelas no banco. Quero que use cores que tragam sobriedade e leveza. 

Leia [](file:///c%3A/FinFlow/CLAUDE.md)

Explorar estrutura do projeto FinFlow

Leia [](file:///c%3A/FinFlow)

Leia [](file:///c%3A/FinFlow/backend)

Leia [](file:///c%3A/FinFlow/frontend)

Leia [](file:///c%3A/FinFlow/database)

Leia [](file:///c%3A/FinFlow/infra)

Leia [](file:///c%3A/FinFlow/project)

Leia [](file:///c%3A/FinFlow/CLAUDE.md)

Foram pesquisados arquivos correspondentes `**/.*`, nenhuma correspondência

Foram pesquisados arquivos correspondentes `**/.git`, nenhuma correspondência

Foram pesquisados arquivos correspondentes `**/.gitignore`, nenhuma correspondência

Foram pesquisados arquivos correspondentes `**/docker-compose`, nenhuma correspondência

Foram pesquisados arquivos correspondentes `**/angular.json`, nenhuma correspondência

Foram pesquisados arquivos correspondentes `**/.csproj`, nenhuma correspondência

Foram pesquisados arquivos correspondentes `**/*`, 1 correspondência

Vou ler o skill relevante antes de prosseguir. 

Ler habilidade [agent-customization](file:///c%3A/Users/arthu/.vscode/extensions/github.copilot-chat-0.42.3/assets/prompts/skills/agent-customization/SKILL.md?vscodeLinkType%3Dskill)

Tenho todo o contexto necessário. Vou criar o plano agora. 

Arquivo de memória [](file:///c%3A/Users/arthu/AppData/Roaming/Code/User/workspaceStorage/e8a3793b911c6f5074d8b9c1ca5116ad/GitHub.copilot-chat/memory-tool/memories/MDBjMzIwYTUtODc1My00YjljLWI3OWEtNDg3ZGUzZmY3OTBi/plan.md) criado

O projeto está zerado — só o CLAUDE.md e pastas vazias, sem git ainda. Aqui está o plano completo de bootstrap:

---

## Plan: FinFlow — Bootstrap do Projeto + Agentes e Skills

**TL;DR:** Inicializar o monorepo do zero com git, configurar as workspace instructions e skills do Copilot para que ele conheça as regras do projeto, depois scaffoldar database, infra, backend e frontend na ordem certa.

---

### Fase 0 — Git & Base
1. `git init` na raiz + criar `.gitignore` otimizado (Node, .NET, Angular, env files)
2. Commit inicial na `main`, depois criar branch `feature/project-bootstrap`

### Fase 1 — Workspace Instructions (`.github/`)
3. Criar `.github/copilot-instructions.md` — transcreve as regras do CLAUDE.md como contexto **always-on** para o Copilot (stack, conventions, Conventional Commits, branch rules)
4. Criar `.github/instructions/backend.instructions.md` com `applyTo: backend/**` — regras .NET 10 AOT/Trimming
5. Criar `.github/instructions/frontend.instructions.md` com `applyTo: frontend/**` — regras Angular standalone + Material
6. Criar `.github/instructions/database.instructions.md` com `applyTo: database/**` — padrão de nomenclatura dos scripts SQL

### Fase 2 — Skills Copilot
7. Criar `.github/skills/new-feature/SKILL.md` — workflow completo: abrir branch → backend (endpoint + service) → migration SQL → frontend (component) → commit com Conventional Commits
8. Criar `.github/skills/db-migration/SKILL.md` — cria o próximo script numerado em database seguindo o padrão `NNN_descricao.sql`

### Fase 3 — Database (DDL)
9. `database/001_create_tables.sql` — tabelas: `users`, `movements` (receita/dívida), `expenses` (título, valor, data, movimento_id)
10. `database/002_jwt_tables.sql` — tabela `refresh_tokens` para auth JWT
11. `database/003_seed.sql` — dados iniciais mínimos

### Fase 4 — Infra
12. `infra/docker-compose.yml` — services: postgres, backend, nginx+frontend
13. `infra/nginx.conf` — proxy reverso para backend + serve Angular estático
14. `.env.example` + `.env.dev` com flag `ASPNETCORE_ENVIRONMENT`

### Fase 5 — Backend Scaffold
15. Projeto .NET 10 Minimal API em backend com estrutura `/Endpoints`, `/Models`, `/Services`, `/Data`
16. Configurar AOT + Trimming no `.csproj`

### Fase 6 — Frontend Scaffold
17. Projeto Angular com standalone components em frontend
18. Angular Material com tema sóbrio (cinza-azulado / off-white)
19. Environments dev/prod configurados

---

**Arquivos relevantes**
- CLAUDE.md — regras base do projeto
- `.github/copilot-instructions.md` — a criar (always-on context)
- `.github/skills/new-feature/SKILL.md` — a criar
- `.github/skills/db-migration/SKILL.md` — a criar
- `infra/docker-compose.yml` — a criar
- `database/001_create_tables.sql` — a criar

**Verificação**
1. Abrir chat do Copilot e verificar se as instructions aparecem como contexto ativo
2. Digitar `/new-feature` e `/db-migration` no chat para confirmar que as skills são descobertas
3. `docker-compose up` sobe o postgres corretamente
4. `dotnet run` no backend responde na porta configurada

**Decisões**
- Skills e Instructions ficam em `.github/` (versionadas junto ao repo, compartilhadas com a equipe/IAs)
- Skills para tarefas **recorrentes** (`new-feature`, `db-migration`); Instructions para contexto **always-on**
- Gemini API fica como serviço no backend (não no frontend) — chave via env var

---

