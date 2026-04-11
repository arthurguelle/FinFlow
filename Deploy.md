# FinFlow — Guia de Deploy na VPS

## ✅ Checklist pré-deploy

### 1 — Preencha o IP da VPS em `deploy.sh`

Abra `deploy.sh` e edite a linha:

```bash
VPS_HOST="SEU_IP_OU_DOMINIO"   # ← coloque o IP ou domínio real da VPS
VPS_USER="root"                 # ← usuário SSH (root, ubuntu, etc.)
```

A chave SSH já está apontada para `infra/SSH/ssh-key-2026-04-10.key`.

---

### 2 — Preencha `infra/.env.prod`

Edite o arquivo `infra/.env.prod` com os valores reais:

```env
POSTGRES_PASSWORD=uma_senha_forte_ex_Xk9#mP2
JWT_SECRET=string_aleatoria_minimo_32_chars_ex_abc123...
GEMINI_API_KEY=AIzaSy...          # https://aistudio.google.com/app/apikey
CORS_ORIGINS=http://SEU_IP        # mesmo IP da VPS
```

> Para gerar JWT_SECRET: `openssl rand -base64 48`

---

### 3 — Rode o deploy (Git Bash ou WSL)

```bash
cd /c/FinFlow
chmod +x deploy.sh
bash deploy.sh
```

O script vai automaticamente:
1. Build do Angular (produção)
2. Publish do .NET 10
3. Conectar na VPS via SSH
4. Instalar Docker (se necessário)
5. Enviar todos os arquivos
6. Subir os containers (`docker compose up -d`)

---

### 4 — Verificar

Após o deploy, acesse:

- **Frontend:** `http://SEU_IP`
- **API Health:** `http://SEU_IP/api/health`

Login inicial (seed do banco):
- **Email:** `admin@finflow.dev`
- **Senha:** `Admin@123`

---

## Comandos úteis na VPS

```bash
ssh -i infra/SSH/ssh-key-2026-04-11.key root@SEU_IP

# Status dos containers
cd /opt/finflow/infra && docker compose ps

# Logs do backend
docker compose logs -f backend

# Reiniciar backend
docker compose restart backend

# Parar tudo
docker compose down

# Atualizar (após novo deploy local)
bash deploy.sh
```

---

## Estrutura na VPS após deploy

```
/opt/finflow/
  infra/
    docker-compose.yml
    nginx.conf
    .env                 ← gerado a partir de infra/.env.prod
  backend/
    publish/             ← .NET compilado (AOT)
  frontend/
    dist/                ← Angular buildado
  database/
    001_*.sql            ← executados automaticamente na criação do postgres
```

