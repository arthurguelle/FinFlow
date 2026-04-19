#!/bin/bash
# setup-ssl.sh — Obtém certificado Let's Encrypt para arthurguelle.duckdns.org
# Execute UMA VEZ após o primeiro deploy do FinFlow.
# Uso: & "C:\Program Files\Git\bin\bash.exe" setup-ssl.sh

set -e

VPS_USER="ubuntu"
VPS_HOST="204.216.138.73"
VPS_PORT="22"
SSH_KEY="infra/SSH/ssh-key-2026-04-11.key"
DOMAIN="arthurguelle.duckdns.org"
EMAIL="arthurguelle@gmail.com"   # ← troque pelo seu e-mail (alertas de renovação)

SSH_OPTS="-p ${VPS_PORT} -i ${SSH_KEY} -o StrictHostKeyChecking=no"

GREEN='\033[0;32m'; NC='\033[0m'
log() { echo -e "${GREEN}[✔]${NC} $1"; }

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   FinFlow — Configuração SSL Let's Encrypt ║"
echo "╚══════════════════════════════════════════╝"
echo ""

log "Conectando na VPS e configurando SSL..."

ssh $SSH_OPTS ${VPS_USER}@${VPS_HOST} bash << REMOTE
  set -e

  echo "[VPS] Instalando Certbot..."
  sudo apt-get update -qq
  sudo apt-get install -y certbot

  echo "[VPS] Criando diretório webroot..."
  sudo mkdir -p /var/www/certbot

  echo "[VPS] Parando Nginx temporariamente para emitir certificado..."
  cd /opt/finflow/infra
  sudo docker compose stop nginx

  echo "[VPS] Emitindo certificado para ${DOMAIN}..."
  sudo certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email ${EMAIL} \
    -d ${DOMAIN}

  echo "[VPS] Certificado emitido com sucesso!"
  echo "[VPS] Reiniciando Nginx com HTTPS..."
  sudo docker compose up -d nginx

  echo "[VPS] Configurando renovação automática..."
  # Cron para renovar a cada 12h (certbot só renova se faltar < 30 dias)
  (sudo crontab -l 2>/dev/null; echo "0 */12 * * * certbot renew --quiet --deploy-hook 'cd /opt/finflow/infra && docker compose restart nginx'") | sudo crontab -

  echo ""
  echo "✅ SSL configurado!"
  echo "   Acesse: https://${DOMAIN}"
REMOTE

log "SSL configurado! Acesse https://${DOMAIN}"
