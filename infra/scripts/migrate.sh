#!/bin/bash
set -euo pipefail

# ============================================
# ayantaraz Database Migration Script
# ============================================
# Usage: ./infra/scripts/migrate.sh [environment]
#   environment: development | staging | production (default: development)
# ============================================

ENV="${1:-development}"
SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

echo "=== ayantaraz DB Migration ==="
echo "Environment: ${ENV}"
echo "Working dir: ${SCRIPT_DIR}"
echo ""

# Determine which .env file to load
case "$ENV" in
  development)
    ENV_FILE="${SCRIPT_DIR}/.env.development"
    ;;
  staging)
    ENV_FILE="${SCRIPT_DIR}/.env.staging"
    ;;
  production)
    ENV_FILE="${SCRIPT_DIR}/.env.production"
    ;;
  *)
    echo "Error: Unknown environment '${ENV}'"
    echo "Usage: $0 {development|staging|production}"
    exit 1
    ;;
esac

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: Environment file '${ENV_FILE}' not found."
    echo "Create it from .env.example: cp .env.example ${ENV_FILE}"
    exit 1
fi

# Load environment variables
set -a
source "$ENV_FILE"
set +a

echo "Step 1/4: Validating Prisma schema..."
cd "$SCRIPT_DIR"
npx prisma validate --schema=prisma/schema.prisma
echo "  ✅ Schema valid"
echo ""

echo "Step 2/4: Generating Prisma client..."
npx prisma generate --schema=prisma/schema.prisma
echo "  ✅ Client generated"
echo ""

echo "Step 3/4: Running migrations..."
if [ "$ENV" = "development" ]; then
    npx prisma migrate dev --schema=prisma/schema.prisma
else
    npx prisma migrate deploy --schema=prisma/schema.prisma
fi
echo "  ✅ Migrations applied"
echo ""

echo "Step 4/4: Seeding database..."
npx tsx prisma/seed.ts
echo "  ✅ Database seeded"
echo ""

echo "=== Migration completed successfully ==="
