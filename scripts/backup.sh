#!/bin/bash

# Database Backup Script for Ayantaraz
# Usage: ./scripts/backup.sh [backup_name]
# Example: ./scripts/backup.sh ayantaraz_backup_$(date +%Y%m%d_%H%M%S)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Backup directory
BACKUP_DIR="./backups"
BACKUP_NAME=${1:-ayantaraz_backup_$(date +%Y%m%d_%H%M%S)}
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}💾 Starting Database Backup: ${BACKUP_NAME}${NC}"
echo "============================================"

# Check if PostgreSQL container is running
if ! docker-compose ps | grep -q "ayantaraz-postgres"; then
    echo -e "${RED}❌ PostgreSQL container is not running${NC}"
    exit 1
fi

echo -e "${YELLOW}🗄️ Backing up PostgreSQL database...${NC}"

# Create backup using pg_dump
docker-compose exec postgres pg_dump -U ${POSTGRES_USER} -d ${POSTGRES_DB} > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database backup created: ${BACKUP_FILE}${NC}"
    
    # Compress the backup
    echo -e "${YELLOW}📦 Compressing backup...${NC}"
    gzip -f "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup compressed: ${BACKUP_FILE}.gz${NC}"
        
        # Show backup file info
        echo ""
        echo "Backup Information:"
        echo "  - File: ${BACKUP_FILE}.gz"
        echo "  - Size: $(du -h "${BACKUP_FILE}.gz" | cut -f1)"
        echo "  - Date: $(date +%Y-%m-%d\ %H:%M:%S)"
        
        # Clean up old backups (keep last 30 days)
        echo ""
        echo -e "${YELLOW}🧹 Cleaning up old backups...${NC}"
        find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
        
        echo -e "${GREEN}✅ Old backups cleaned up${NC}"
    else
        echo -e "${RED}❌ Failed to compress backup${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Failed to create database backup${NC}"
    exit 1
fi

echo ""
echo "============================================"
echo -e "${GREEN}🎉 Backup Completed Successfully!${NC}"
