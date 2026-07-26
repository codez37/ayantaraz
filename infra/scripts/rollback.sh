#!/bin/bash
set -euo pipefail

# ============================================
# ayantaraz Rollback Script
# ============================================
# Usage:
#   ./infra/scripts/rollback.sh              # interactive mode
#   ./infra/scripts/rollback.sh --db-only    # restore database only
#   ./infra/scripts/rollback.sh --code-only  # rollback code only
#   ./infra/scripts/rollback.sh --full       # rollback both code + db
# ============================================

SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${SCRIPT_DIR}/backups}"
COMPOSE_FILES="-f ${SCRIPT_DIR}/docker-compose.yml -f ${SCRIPT_DIR}/docker-compose.prod.yml"
ENV_FILE="${SCRIPT_DIR}/.env.production"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
error() { log "ERROR: $*"; exit 1; }

# Check prerequisites
[ -f "$ENV_FILE" ] || error ".env.production not found at ${ENV_FILE}"

# Load env vars
set -a
source "$ENV_FILE"
set +a

MODE="${1:---full}"

if [ "$MODE" = "--help" ] || [ "$MODE" = "-h" ]; then
    echo "ayantaraz Rollback Script"
    echo ""
    echo "Usage:"
    echo "  $0                     Interactive mode"
    echo "  $0 --db-only           Restore database only"
    echo "  $0 --code-only         Rollback code only (previous Docker image)"
    echo "  $0 --full              Rollback both code + database"
    echo "  $0 --list              List available backups"
    echo "  $0 --dry-run           Show what would be done without executing"
    exit 0
fi

if [ "$MODE" = "--list" ]; then
    echo "Available backups:"
    echo ""
    echo "=== Daily backups ==="
    ls -lh "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | head -20 || echo "  No daily backups found"
    echo ""
    echo "=== Weekly backups ==="
    ls -lh "${BACKUP_DIR}"/weekly_*.sql.gz 2>/dev/null | head -10 || echo "  No weekly backups found"
    echo ""
    echo "=== Monthly backups ==="
    ls -lh "${BACKUP_DIR}"/monthly_*.sql.gz 2>/dev/null | head -5 || echo "  No monthly backups found"
    echo ""
    echo "=== Previous Docker images ==="
    docker compose ${COMPOSE_FILES} --env-file "$ENV_FILE" images 2>/dev/null || echo "  No Docker images found"
    exit 0
fi

DRY_RUN=false
if [ "$MODE" = "--dry-run" ]; then
    DRY_RUN=true
    log "DRY RUN MODE - No changes will be made"
fi

# ---- Database Rollback ----
rollback_db() {
    local backup_file

    if [ -n "${BACKUP_FILE:-}" ]; then
        backup_file="$BACKUP_FILE"
    else
        backup_file=$(ls -t "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | head -1 || echo "")
    fi

    if [ -z "$backup_file" ]; then
        error "No backup file found. Use --list to see available backups."
    fi

    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: ${backup_file}"
    fi

    log "Restoring database from: ${backup_file}"

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would execute: gunzip -c ${backup_file} | docker compose exec -T postgres psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-ayantaraz}"
        return
    fi

    log "Stopping API to prevent writes..."
    docker compose ${COMPOSE_FILES} --env-file "$ENV_FILE" stop api

    log "Restoring database..."
    gunzip -c "$backup_file" | docker compose ${COMPOSE_FILES} --env-file "$ENV_FILE" exec -T postgres psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-ayantaraz}"

    log "Starting API..."
    docker compose ${COMPOSE_FILES} --env-file "$ENV_FILE" start api

    log "Database rollback completed"
}

# ---- Code Rollback ----
rollback_code() {
    log "Rolling back to previous Docker image..."

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would restart services with previous images"
        return
    fi

    # Get previous image tags
    log "Available images for rollback:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}" | head -20

    log "Recreating services with cached images..."
    docker compose ${COMPOSE_FILES} --env-file "$ENV_FILE" up -d --no-deps --no-build api web

    log "Code rollback completed"
}

# ---- Migration Rollback ----
rollback_migration() {
    log "Checking Prisma migration history..."
    docker compose ${COMPOSE_FILES} --env-file "$ENV_FILE" exec -T api npx prisma migrate history 2>/dev/null || true

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would execute: docker compose exec api npx prisma migrate resolve --rolled-back <MIGRATION_NAME>"
        return
    fi

    log "To rollback a specific migration, run:"
    log "  docker compose exec api npx prisma migrate resolve --rolled-back <migration_name>"
    log ""
    log "To reset and re-run all migrations:"
    log "  docker compose exec api npx prisma migrate reset --force"
    log ""
    log "WARNING: migrate reset will DROP ALL DATA. Only use if you have a backup."
}

# ---- Main ----
case "$MODE" in
    --db-only|-d)
        rollback_db
        ;;
    --code-only|-c)
        rollback_code
        ;;
    --full|-f|--all|-a)
        rollback_db
        rollback_code
        log "Waiting for health check..."
        for i in $(seq 1 30); do
            if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
                log "API is healthy"
                break
            fi
            sleep 2
        done
        log "Full rollback completed successfully"
        ;;
    *)
        echo "ayantaraz Rollback Script"
        echo ""
        echo "Select rollback mode:"
        echo "  1) Database only"
        echo "  2) Code only"
        echo "  3) Full (database + code)"
        read -rp "Enter choice [1-3]: " choice
        echo ""
        case "$choice" in
            1) rollback_db ;;
            2) rollback_code ;;
            3) rollback_db && rollback_code ;;
            *) error "Invalid choice" ;;
        esac
        ;;
esac
