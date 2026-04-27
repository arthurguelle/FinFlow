#!/bin/bash
# deploy.sh — Script de deploy FinFlow para VPS
# Uso completo:        ./deploy.sh
# Só backend (rápido): ./deploy.sh --backend-only
#
# IMPORTANTE: NUNCA use "docker compose restart" para atualizar código.
# O Dockerfile copia os binários durante o BUILD. Sempre rebuilde com --build.
# Pré-requisitos locais: git, dotnet, node/npm, rsync (ou scp), ssh

set -e  # para no primeiro erro

BACKEND_ONLY=false
[[ "$1" == "--backend-only" ]] && BACKEND_ONLY=true

# ── Configurações da VPS (edite aqui) ────────────────────────────────────────
VPS_USER="ubuntu"
VPS_HOST="204.216.138.73"    # ← OBRIGATÓRIO: preencha o IP ou domínio da VPS
VPS_PORT="22"
VPS_DIR="/opt/finflow"
SSH_KEY="infra/SSH/ssh-key-2026-04-11.key"  # chave SSH do projeto

# ── Arquivo .env de produção ──────────────────────────────────────────────────
ENV_FILE="infra/.env.prod"      # ← será enviado para a VPS como infra/.env

# ── Cores para output ────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

SSH_OPTS="-p ${VPS_PORT} -o StrictHostKeyChecking=no"
[ -n "$SSH_KEY" ] && SSH_OPTS="$SSH_OPTS -i $SSH_KEY"

echo ""
echo "╔══════════════════════════════════╗"
echo "║     FinFlow — Deploy para VPS    ║"
echo "╚══════════════════════════════════╝"
echo ""

# ── 1. Validações ─────────────────────────────────────────────────────────────
log "Verificando pré-requisitos..."
command -v dotnet >/dev/null || fail "dotnet não encontrado"
command -v npm    >/dev/null || fail "npm não encontrado"
command -v ssh    >/dev/null || fail "ssh não encontrado"
command -v rsync  >/dev/null || warn "rsync não encontrado — usando scp como fallback"

[ "$VPS_HOST" = "SEU_IP_OU_DOMINIO" ] && fail "Configure VPS_HOST no script antes de rodar!"

# ── 2. Build do Frontend ──────────────────────────────────────────────────────
if [ "$BACKEND_ONLY" = false ]; then
  log "Build do Frontend Angular (produção)..."
  cd frontend
  # npm ci pode falhar com Node.js versões ímpares (ex: v25) no Git Bash
  # só instala se node_modules não existir
  if [ ! -d "node_modules" ]; then
    npm install --silent
  fi
  npx ng build --configuration=production
  cd ..
  log "Frontend gerado em frontend/dist/"
else
  warn "Modo --backend-only: build do frontend ignorado."
fi

# ── 3. Publish do Backend ─────────────────────────────────────────────────────
log "Publish do Backend .NET 10..."
dotnet publish backend/FinFlow.Api/FinFlow.Api.csproj \
  -c Release \
  -o backend/publish \
  --nologo \
  -p:EnvironmentName=Production
log "Backend publicado em backend/publish/"

# ── 4. Preparar VPS ───────────────────────────────────────────────────────────
log "Preparando VPS..."
ssh $SSH_OPTS ${VPS_USER}@${VPS_HOST} bash <<'REMOTE'
  set -e
  # Instala Docker se não estiver instalado
  if ! command -v docker &>/dev/null; then
    echo "[VPS] Instalando Docker..."
    sudo apt-get update -qq
    sudo apt-get install -y docker.io docker-compose-v2 curl
    sudo systemctl enable --now docker
    sudo usermod -aG docker $USER
    echo "[VPS] Docker instalado!"
  else
    echo "[VPS] Docker já instalado: $(docker --version)"
  fi
  sudo mkdir -p /opt/finflow/{database,infra,frontend/dist/finflow/browser,backend/publish}
  sudo chown -R $USER:$USER /opt/finflow
REMOTE

# ── 5. Enviar arquivos ────────────────────────────────────────────────────────
log "Enviando arquivos para VPS..."

RSYNC_OPTS="-az --delete -e \"ssh $SSH_OPTS\""
SCP_OPTS="-P ${VPS_PORT} -r"
[ -n "$SSH_KEY" ] && SCP_OPTS="$SCP_OPTS -i $SSH_KEY"

_send() {
  local SRC=$1 DEST=$2
  if command -v rsync >/dev/null; then
    rsync -az --delete -e "ssh $SSH_OPTS" "$SRC" "${VPS_USER}@${VPS_HOST}:${DEST}"
  else
    # scp: remover trailing slash do source para evitar pasta aninhada (ex: browser/browser/)
    scp $SCP_OPTS "${SRC%/}" "${VPS_USER}@${VPS_HOST}:$(dirname $DEST)"
  fi
}

# Frontend (dist)
if [ "$BACKEND_ONLY" = false ]; then
  _send "frontend/dist/finflow/browser/" "${VPS_DIR}/frontend/dist/finflow/browser/"
fi

# Backend (publish + Dockerfile.vps)
_send "backend/publish/"        "${VPS_DIR}/backend/publish/"
_send "backend/Dockerfile.vps"  "${VPS_DIR}/backend/Dockerfile.vps"

# Scripts SQL
if [ "$BACKEND_ONLY" = false ]; then
  _send "database/" "${VPS_DIR}/database/"
fi

# Infra (compose + nginx)
_send "infra/docker-compose.yml" "${VPS_DIR}/infra/docker-compose.yml"
_send "infra/nginx.conf"         "${VPS_DIR}/infra/nginx.conf"

# .env de produção
if [ -f "${ENV_FILE}" ]; then
  if grep -q "PREENCHA_" "${ENV_FILE}" 2>/dev/null; then
    fail "Preencha todos os campos em ${ENV_FILE} antes de fazer deploy!"
  fi
  _send "${ENV_FILE}" "${VPS_DIR}/infra/.env"
  warn ".env enviado para a VPS (${ENV_FILE} → ${VPS_DIR}/infra/.env)"
else
  fail "${ENV_FILE} não encontrado! Preencha infra/.env.prod antes do deploy."
fi

log "Arquivos enviados!"

# ── 6. Subir containers na VPS ────────────────────────────────────────────────
log "Subindo containers na VPS..."
ssh $SSH_OPTS ${VPS_USER}@${VPS_HOST} bash <<REMOTE
  set -e
  cd ${VPS_DIR}/infra

  if [ "$BACKEND_ONLY" = "true" ]; then
    # Rebuild apenas o serviço backend (camadas de apt/pip ficam em cache)
    sudo docker compose up -d --build backend
  else
    sudo docker compose down --remove-orphans 2>/dev/null || true
    sudo docker compose up -d --build
  fi

  echo ""
  echo "Status dos containers:"
  sudo docker compose ps
REMOTE

log "Deploy concluído! 🚀"
echo ""
echo "  Frontend: http://${VPS_HOST}"
echo "  Backend:  http://${VPS_HOST}/api/health"
echo ""
