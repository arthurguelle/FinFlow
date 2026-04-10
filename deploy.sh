#!/bin/bash
# deploy.sh — Script de deploy FinFlow para VPS
# Uso: ./deploy.sh
# Pré-requisitos locais: git, dotnet, node/npm, rsync (ou scp), ssh

set -e  # para no primeiro erro

# ── Configurações da VPS (edite aqui) ────────────────────────────────────────
VPS_USER="root"
VPS_HOST="SEU_IP_OU_DOMINIO"
VPS_PORT="22"
VPS_DIR="/opt/finflow"          # pasta destino na VPS
SSH_KEY="~/.ssh/id_rsa"         # chave SSH (deixe vazio para usar senha)

# ── Cores para output ────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

SSH_OPTS="-p ${VPS_PORT}"
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
log "Build do Frontend Angular (produção)..."
cd frontend
npm ci --silent
npx ng build --configuration=production
cd ..
log "Frontend gerado em frontend/dist/"

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
    apt-get update -qq
    apt-get install -y docker.io docker-compose-v2 curl
    systemctl enable --now docker
    echo "[VPS] Docker instalado!"
  else
    echo "[VPS] Docker já instalado: $(docker --version)"
  fi
  mkdir -p /opt/finflow/{database,infra,frontend/dist/finflow/browser,backend/publish}
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
    scp $SCP_OPTS "$SRC" "${VPS_USER}@${VPS_HOST}:${DEST}"
  fi
}

# Frontend (dist)
_send "frontend/dist/finflow/browser/" "${VPS_DIR}/frontend/dist/finflow/browser/"

# Backend (publish)
_send "backend/publish/" "${VPS_DIR}/backend/publish/"

# Scripts SQL
_send "database/" "${VPS_DIR}/database/"

# Infra (compose + nginx)
_send "infra/docker-compose.yml" "${VPS_DIR}/infra/docker-compose.yml"
_send "infra/nginx.conf"         "${VPS_DIR}/infra/nginx.conf"

# .env (se existir localmente)
if [ -f ".env" ]; then
  _send ".env" "${VPS_DIR}/.env"
  warn ".env enviado para a VPS. Certifique-se de que tem permissão 600."
else
  warn ".env não encontrado localmente. Crie-o na VPS manualmente a partir de .env.example!"
fi

log "Arquivos enviados!"

# ── 6. Subir containers na VPS ────────────────────────────────────────────────
log "Subindo containers na VPS..."
ssh $SSH_OPTS ${VPS_USER}@${VPS_HOST} bash <<REMOTE
  set -e
  cd ${VPS_DIR}/infra
  
  # Garante que o .env está no lugar certo
  [ -f "${VPS_DIR}/.env" ] && ln -sf "${VPS_DIR}/.env" "${VPS_DIR}/infra/.env"
  
  docker compose down --remove-orphans 2>/dev/null || true
  docker compose up -d --build
  
  echo ""
  echo "Status dos containers:"
  docker compose ps
REMOTE

log "Deploy concluído! 🚀"
echo ""
echo "  Frontend: http://${VPS_HOST}"
echo "  Backend:  http://${VPS_HOST}/api/health"
echo ""
