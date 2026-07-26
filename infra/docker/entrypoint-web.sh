#!/bin/sh

# Ayantaraz Web Entrypoint Script
# Production-Ready | Server: 202.133.91.13
# Version: 2.0 - Stabilized

# Do NOT use set -e to allow continuation on errors
# set -e

echo "=========================================="
echo "Ayantaraz Web Entrypoint"
echo "Server: 202.133.91.13"
echo "=========================================="

export NODE_ENV=production
export HOSTNAME=${HOSTNAME:-0.0.0.0}
export PORT=${PORT:-3000}

echo "Environment: $NODE_ENV"
echo "Hostname: $HOSTNAME"
echo "Port: $PORT"

# Try multiple paths for server.js
SERVER_FOUND=false

if [ -f /app/apps/web/server.js ]; then
    echo "Found server.js at /app/apps/web/server.js"
    cd /app/apps/web
    exec node server.js
    SERVER_FOUND=true
fi

if [ ! "$SERVER_FOUND" = true ] && [ -f /app/server.js ]; then
    echo "Found server.js at /app/server.js"
    exec node /app/server.js
    SERVER_FOUND=true
fi

if [ ! "$SERVER_FOUND" = true ]; then
    echo "ERROR: standalone server.js missing"
    echo "Searching for server.js..."
    find /app -name server.js -type f 2>/dev/null | head -20
    
    # Try to find and start any server.js
    SERVER_FILE=$(find /app -name server.js -type f 2>/dev/null | head -1)
    if [ -n "$SERVER_FILE" ]; then
        echo "Found server.js at: $SERVER_FILE"
        exec node "$SERVER_FILE"
    else
        echo "ERROR: No server.js file found"
        exit 1
    fi
fi
