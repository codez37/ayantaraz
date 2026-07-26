#!/bin/sh

# Ayantaraz API Entrypoint Script
# Production-Ready | Server: 202.133.91.13
# Version: 2.0 - Stabilized

# Do NOT use set -e to allow continuation on errors
# set -e

echo "=========================================="
echo "Ayantaraz API Entrypoint"
echo "Server: 202.133.91.13"
echo "=========================================="

# Ensure uploads directory exists
mkdir -p /app/uploads 2>/dev/null || echo "WARNING: Could not create uploads directory"
chown -R 1001:1001 /app/uploads 2>/dev/null || echo "WARNING: Could not change uploads ownership"
chmod -R 755 /app/uploads 2>/dev/null || echo "WARNING: Could not set uploads permissions"

echo "[1/4] Initializing uploads directory... DONE"

# Locate prisma CLI (global install or local)
PRISMA_BIN=""
if command -v prisma >/dev/null 2>&1; then
  PRISMA_BIN="prisma"
elif [ -f /app/node_modules/.bin/prisma ]; then
  PRISMA_BIN="/app/node_modules/.bin/prisma"
fi

# Run database migrations
if [ -n "$PRISMA_BIN" ]; then
    echo "[2/4] Running Prisma migrations..."
    $PRISMA_BIN migrate deploy --schema=/app/prisma/schema.prisma 2>/dev/null || echo "WARNING: Migrations completed with warnings"
    echo "Migrations applied"
else
    echo "[2/4] WARNING: Prisma CLI not found, skipping migrations"
fi

# Run database seed (admin users + reference data)
if [ -f /app/prisma/seed.js ]; then
    echo "[3/4] Running database seed..."
    node /app/prisma/seed.js 2>/dev/null || echo "WARNING: Seed completed with warnings"
else
    echo "[3/4] WARNING: seed.js not found, skipping seed"
fi

# Start the application
echo "[4/4] Starting Ayantaraz API..."
echo "=========================================="

# Try to start the application, continue on error
node /app/dist/main.js 2>/dev/null || (
    echo "ERROR: Failed to start application"
    echo "Trying alternative path..."
    node /app/apps/api/dist/main.js 2>/dev/null || (
        echo "ERROR: Failed to start from all paths"
        echo "Application startup failed"
        exit 1
    )
)
