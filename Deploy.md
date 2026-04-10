# FinFlow — Guia de Deploy na VPS

## Pré-requisitos

| Local (sua máquina) | VPS |
|---------------------|-----|
| Git Bash ou WSL     | Ubuntu 20.04+ (ou Debian) |
| Node.js + npm       | Acesso SSH com root |
| .NET 10 SDK         | — (Docker instala tudo) |
| Chave SSH configurada | — |

---

## Passo 1 — Configure o deploy.sh

Abra `deploy.sh` e edite as 3 primeiras variáveis:

```bash
VPS_USER="root"              # ou seu usuário da VPS
VPS_HOST="123.456.789.0"     # IP ou domínio da VPS
SSH_KEY="~/.ssh/id_rsa"      # caminho da sua chave SSH
```

---

## Passo 2 — Configure o .env

Crie o arquivo `infra/.env` a partir do exemplo:

```bash
cp .env.example infra/.env
```

Edite os valores obrigatórios:

```env
POSTGRES_PASSWORD=uma_senha_forte_aqui
JWT_SECRET=string_aleatoria_minimo_32_chars
GEMINI_API_KEY=sua_chave_do_gemini
```

> Obtenha a chave Gemini gratuita em: https://aistudio.google.com/app/apikey

---

## Passo 3 — Execute o deploy

No **Git Bash** ou **WSL**:

```bash
cd /c/FinFlow    # ou o caminho do projeto
bash deploy.sh
```

O script vai:
1. Fazer build do Angular
2. Publicar o .NET
3. Conectar na VPS via SSH
4. Instalar Docker automaticamente (se necessário)
5. Enviar todos os arquivos
6. Subir os containers com `docker compose up -d`

---

## Passo 4 — Verificar

Após o deploy, acesse:

- **Frontend:** `http://SEU_IP`
- **API Health:** `http://SEU_IP/api/health`

Login inicial (seed do banco):
- **Email:** `admin@finflow.dev`
- **Senha:** `Admin@123`

---

## Comandos úteis na VPS

```bash
ssh root@SEU_IP

# Ver status
cd /opt/finflow/infra && docker compose ps

# Ver logs do backend
docker compose logs -f backend

# Ver logs do banco
docker compose logs postgres

# Reiniciar serviço
docker compose restart backend

# Parar tudo
docker compose down

# Atualizar (após novo deploy)
docker compose down && docker compose up -d --build
```

---

## Estrutura na VPS após deploy

```
/opt/finflow/
  infra/
    docker-compose.yml
    nginx.conf
    .env
  backend/
    publish/         ← .NET compilado
  frontend/
    dist/            ← Angular buildado
  database/
    001_*.sql        ← executados na criação do postgres
```

---

## Renovar deploy (futuras atualizações)

Basta rodar `bash deploy.sh` novamente — ele atualiza tudo e reinicia os containers.
