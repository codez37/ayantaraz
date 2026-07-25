#!/bin/bash

# =============================================================================
# Ayantaraz Database Backup Script
# This script creates compressed backups of PostgreSQL database
# Usage: ./infra/scripts/backup.sh
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="/backups/ayantaraz"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}\u2713${NC} $1"
}

warning() {
    echo -e "${YELLOW}\u26a0${NC} $1"
}

error() {
    echo -e "${RED}\u2717${NC} $1"
}

# Create backup directory
log "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
success "Backup directory created"

# Get environment variables
DB_HOST=${POSTGRES_HOST:-postgres}
DB_PORT=${POSTGRES_PORT:-5432}
DB_USER=${POSTGRES_USER:-ayantaraz}
DB_NAME=${POSTGRES_DB:-ayantaraz}
DB_PASSWORD=${POSTGRES_PASSWORD:-}

if [ -z "$DB_PASSWORD" ]; then
    error "POSTGRES_PASSWORD is not set"
    error "Please set POSTGRES_PASSWORD environment variable"
    exit 1
fi

# Create backup
log "Creating database backup..."
BACKUP_FILE="$BACKUP_DIR/db_$DATE.sql"

if command -v docker &> /dev/null; then
    # Using Docker
    log "Using Docker to create backup"
    docker exec ayantaraz-postgres pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
else
    # Direct connection
    log "Using direct connection to create backup"
    PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
fi

# Compress backup
log "Compressing backup..."
gzip -f "$BACKUP_FILE"
success "Backup created: $BACKUP_FILE.gz"

# Clean up old backups
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
success "Old backups cleaned up"

# Show backup list
log "Current backups:"
ls -lh "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null || echo "No backups found"

log "Backup completed successfully!"
