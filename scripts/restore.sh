#!/bin/bash

# Database Restore Script for Ayantaraz
# Usage: ./scripts/restore.sh [backup_file]
# Example: ./scripts/restore.sh backups/ayantaraz_backup_20260726.sql.gz

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Backup file
BACKUP_FILE=${1:-.//backups/latest.sql.gz}

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup file not found: ${BACKUP_FILE}${NC}"
    exit 1
fi

echo -e "${BLUE}🔄 Starting Database Restore from: ${BACKUP_FILE}${NC}"
echo "=================================================="

# Check if PostgreSQL container is running
if ! docker-compose ps | grep -q "ayantaraz-postgres"; then
    echo -e "${RED}❌ PostgreSQL container is not running${NC}"
    exit 1
fi

# Check if backup is compressed
echo -e "${YELLOW}📦 Checking backup file...${NC}"

if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo -e "${GREEN}✅ Backup is compressed, decompressing...${NC}"
    gunzip -c "$BACKUP_FILE" > /tmp/ayantaraz_restore.sql
    BACKUP_FILE=/tmp/ayantaraz_restore.sql
else
    echo -e "${GREEN}✅ Backup is not compressed${NC}"
fi

# Confirm restore
echo ""
echo -e "${RED}⚠️  WARNING: This will OVERWRITE your current database!${NC}"
echo ""
read -p "Are you sure you want to restore? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}🚫 Restore cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🗄️ Restoring database...${NC}"

# Restore database using psql
docker-compose exec postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database restored successfully${NC}"
    
    # Clean up temporary file
    if [ -f /tmp/ayantaraz_restore.sql ]; then
        rm -f /tmp/ayantaraz_restore.sql
    fi
    
    echo ""
    echo "=================================================="
    echo -e "${GREEN}🎉 Restore Completed Successfully!${NC}"
else
    echo -e "${RED}❌ Failed to restore database${NC}"
    exit 1
fi
