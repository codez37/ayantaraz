#!/bin/bash
set -euo pipefail

# ============================================
# ayantaraz SSL Setup — Let's Encrypt + Auto-Renew
# ============================================
# Usage:
#   ./infra/scripts/setup-ssl.sh                        # Interactive SSL setup
#   ./infra/scripts/setup-ssl.sh --domains example.com   # With custom domains
#   ./infra/scripts/setup-ssl.sh --cron-only             # Only install cron
#   ./infra/scripts/setup-ssl.sh --test                  # Dry-run / test renewal
# ============================================

SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
DOMAINS="${DOMAINS:-ayantaraz.ir www.ayantaraz.ir}"
EMAIL="${EMAIL:-admin@ayantaraz.ir}"
CERTBOT_DIR="${SCRIPT_DIR}/data/certbot"
COMPOSE_FILES="-f ${SCRIPT_DIR}/docker-compose.yml -f ${SCRIPT_DIR}/docker-compose.prod.yml"
ENV_FILE="${SCRIPT_DIR}/.env.production"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
error() { log "ERROR: $*"; exit 1; }

MODE="${1:-}"

install_cron() {
    log "Installing auto-renew cron job..."

    local cron_cmd="0 3 * * * /usr/bin/certbot renew --quiet --deploy-hook 'cd ${SCRIPT_DIR} && docker compose ${COMPOSE_FILES} --env-file ${ENV_FILE} exec -T nginx nginx -s reload' >> ${SCRIPT_DIR}/logs/certbot-renew.log 2>&1"

    # Check if cron entry already exists
    if crontab -l 2>/dev/null | grep -q "certbot renew"; then
        log "Cron job already exists. Skipping."
    else
        (crontab -l 2>/dev/null || true; echo "$cron_cmd") | crontab -
        log "Cron job installed: daily at 3:00 AM"
    fi

    log "To verify: crontab -l | grep certbot"
}

request_certificate() {
    log "Requesting Let's Encrypt certificate for: ${DOMAINS}"

    # Check if certbot is installed
    if ! command -v certbot &>/dev/null; then
        log "Installing certbot..."
        apt-get update -qq
        apt-get install -y -qq certbot
    fi

    # Ensure certbot webroot directories exist
    mkdir -p "${CERTBOT_DIR}/www"
    mkdir -p "${CERTBOT_DIR}/conf"

    # Ensure nginx is running (it handles .well-known/acme-challenge)
    log "Ensuring nginx is running for ACME challenge..."
    cd "${SCRIPT_DIR}"
    docker compose ${COMPOSE_FILES} --env-file "$ENV_FILE" up -d nginx 2>/dev/null || true

    # Wait for nginx
    sleep 3

    # Request certificate
    certbot certonly --webroot \
        -w "${CERTBOT_DIR}/www" \
        --email "${EMAIL}" \
        --agree-tos \
        --non-interactive \
        --expand \
        $(for domain in $DOMAINS; do echo -n "-d $domain "; done)

    log "Certificate obtained successfully"
    log "Certificates: /etc/letsencrypt/live/$(echo ${DOMAINS} | cut -d' ' -f1)/"

    # Test renewal
    log "Testing renewal process..."
    certbot renew --dry-run

    log "SSL setup complete"
}

test_renewal() {
    log "Testing certificate renewal (dry-run)..."
    certbot renew --dry-run
    log "Dry-run completed"
}

show_status() {
    log "Certificate status:"
    certbot certificates 2>/dev/null || echo "  No certificates found"

    log ""
    log "Cron jobs:"
    crontab -l 2>/dev/null | grep -E "certbot|ssl" || echo "  No certbot cron found"

    log ""
    log "Nginx SSL config:"
    if [ -f "${SCRIPT_DIR}/infra/nginx/default.conf" ]; then
        grep -n "ssl_certificate\|ssl_certificate_key\|ssl_protocols" "${SCRIPT_DIR}/infra/nginx/default.conf"
    fi
}

# ---- Main ----
case "$MODE" in
    --cron-only)
        install_cron
        ;;
    --domains)
        DOMAINS="${2:-$DOMAINS}"
        shift 2 || true
        request_certificate
        install_cron
        ;;
    --test)
        test_renewal
        ;;
    --status|-s)
        show_status
        ;;
    --help|-h|"")
        echo "ayantaraz SSL Setup Script"
        echo ""
        echo "Usage:"
        echo "  $0                        Interactive SSL setup"
        echo "  $0 --domains <domains>    Setup with custom domains"
        echo "  $0 --cron-only            Only install auto-renew cron"
        echo "  $0 --test                 Test certificate renewal"
        echo "  $0 --status               Show current SSL status"
        echo ""
        echo "Examples:"
        echo "  $0 --domains \"ayantaraz.ir www.ayantaraz.ir\""
        echo "  $0 --cron-only"
        echo "  $0 --test"
        exit 0
        ;;
    *)
        error "Unknown option: ${MODE}. Use --help for usage."
        ;;
esac
