#!/bin/bash

# =============================================================================
# Ayantaraz Database Backup Script
# Usage: ./backup.sh [--full] [--cleanup]
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="/backups/ayantaraz"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="${POSTGRES_DB:-ayantaraz}"
DB_USER="${POSTGRES_USER:-ayantaraz}"
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
RETENTION_DAYS=7
FULL_BACKUP=false
CLEANUP_ONLY=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --full)
            FULL_BACKUP=true
            shift
            ;;
        --cleanup)
            CLEANUP_ONLY=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Cleanup old backups
cleanup_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "db_*.sql" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
    log_info "Cleanup completed"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if we're running in Docker
if [ -f /.dockerenv ]; then
    log_info "Running in Docker environment"
    # Use docker exec to run pg_dump
    if ! command -v docker &> /dev/null; then
        log_error "Docker command not found"
        exit 1
    fi

    if [ -z "${POSTGRES_PASSWORD:-}" ]; then
        log_error "POSTGRES_PASSWORD environment variable is required in Docker"
        exit 1
    fi

    if [ "$FULL_BACKUP" = true ]; then
        log_info "Creating full database backup..."
        docker exec ayantaraz-postgres pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_DIR/db_${DATE}.sql"
    else
        log_info "Creating schema-only backup..."
        docker exec ayantaraz-postgres pg_dump -U "$DB_USER" -d "$DB_NAME" --schema-only > "$BACKUP_DIR/db_${DATE}.sql"
    fi
else
    # Local environment
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump command not found. Please install PostgreSQL client."
        exit 1
    fi

    if [ "$FULL_BACKUP" = true ]; then
        log_info "Creating full database backup..."
        PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_DIR/db_${DATE}.sql"
    else
        log_info "Creating schema-only backup..."
        PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --schema-only > "$BACKUP_DIR/db_${DATE}.sql"
    fi
fi

# Compress the backup
if [ "$CLEANUP_ONLY" = false ]; then
    log_info "Compressing backup..."
    gzip -f "$BACKUP_DIR/db_${DATE}.sql"
    log_info "Backup created: $BACKUP_DIR/db_${DATE}.sql.gz"
fi

# Cleanup old backups
cleanup_backups

# Verify backup
if [ "$CLEANUP_ONLY" = false ]; then
    if [ -f "$BACKUP_DIR/db_${DATE}.sql.gz" ]; then
        BACKUP_SIZE=$(stat -f%z "$BACKUP_DIR/db_${DATE}.sql.gz" 2>/dev/null || stat -c%s "$BACKUP_DIR/db_${DATE}.sql.gz")
        log_info "Backup verified. Size: ${BACKUP_SIZE} bytes"
    else
        log_error "Backup file not found!"
        exit 1
    fi
fi

log_info "Backup process completed successfully"
exit 0
