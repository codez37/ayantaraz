#!/bin/bash

# =============================================================================
# Ayantaraz Production Deployment Script
# Server: 202.133.91.13
# This script deploys the complete production stack
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    error "This script must be run as root"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# =============================================================================
# STEP 1: Validate environment
# =============================================================================
log "=== STEP 1: Validating environment ==="

# Check Docker
if ! command -v docker &> /dev/null; then
    error "Docker is not installed"
    exit 1
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    error "Docker Compose is not installed"
    exit 1
fi

# Check if .env.production exists
if [ ! -f "${SCRIPT_DIR}/.env.production" ]; then
    warning ".env.production not found, creating from template..."
    cp "${SCRIPT_DIR}/.env.production" "${SCRIPT_DIR}/.env.production.bak" 2>/dev/null || true
    # Create minimal .env.production with PLACEHOLDERS - user MUST set these
    cat > "${SCRIPT_DIR}/.env.production" << 'EOF'
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://ayantaraz:${POSTGRES_PASSWORD}@postgres:5432/ayantaraz?schema=public
POSTGRES_USER=ayantaraz
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=ayantaraz
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
FILE_ENCRYPTION_KEY=${FILE_ENCRYPTION_KEY}
SESSION_SECRET=${SESSION_SECRET}
SMS_API_KEY=${SMS_API_KEY}
SMS_PROVIDER=sms-panel
SMS_FROM=Ayantaraz
ADMIN_PHONE=09133374162,09134292329
ALLOW_ALL_ORIGINS=true
TRUSTED_ORIGINS=http://202.133.91.13,http://202.133.91.13:3000,http://202.133.91.13:3001
COOKIE_SECURE=false
COOKIE_HTTP_ONLY=true
COOKIE_SAME_SITE=lax
COOKIE_DOMAIN=202.133.91.13
API_URL=http://202.133.91.13:3001
FRONTEND_URL=http://202.133.91.13:3000
SITE_URL=http://202.133.91.13
INTERNAL_API_URL=http://api:3001/api
NEXT_PUBLIC_API_URL=http://202.133.91.13:3001
NEXT_PUBLIC_SITE_URL=http://202.133.91.13
LOG_LEVEL=info
TZ=Asia/Tehran
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMITER_FAIL_OPEN=true
OTP_EXPIRY_SECONDS=300
OTP_MAX_ATTEMPTS=5
OTP_RESEND_LIMIT=3
OTP_RESEND_WINDOW_MINUTES=10
OTP_BLOCK_DURATION_MINUTES=30
DB_POOL_MAX_CONNECTIONS=20
DB_POOL_MIN_CONNECTIONS=5
DB_POOL_MAX_REQUESTS_PER_CONNECTION=100
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_CONNECTION_TIMEOUT_MS=5000
HEALTH_CHECK_INTERVAL=30000
EOF
    success "Created .env.production with PLACEHOLDER values"
    error "PLEASE EDIT .env.production and set ALL REQUIRED VALUES before starting!"
    error "Required: POSTGRES_PASSWORD, REDIS_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, FILE_ENCRYPTION_KEY, SESSION_SECRET, SMS_API_KEY"
    exit 1
fi

# Check for unset critical variables
MISSING_VARS=()
for var in POSTGRES_PASSWORD REDIS_PASSWORD JWT_SECRET JWT_REFRESH_SECRET FILE_ENCRYPTION_KEY SESSION_SECRET; do
    if ! grep -q "^${var}=" "${SCRIPT_DIR}/.env.production" 2>/dev/null || grep -q "^${var}=$" "${SCRIPT_DIR}/.env.production" 2>/dev/null; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    error "CRITICAL: The following environment variables are NOT set in .env.production:"
    for var in "${MISSING_VARS[@]}"; do
        error "  - $var"
    done
    error "Deployment cannot continue. Please set all required values."
    exit 1
fi

# Check SMS_API_KEY
if grep -q "CHANGE_ME\|YOUR_SMS_API_KEY\|^SMS_API_KEY=$" "${SCRIPT_DIR}/.env.production"; then
    warning "SMS_API_KEY is not configured in .env.production"
    warning "OTP/SMS functionality will NOT work until you set a valid SMS_API_KEY"
fi

# =============================================================================
# STEP 2: Stop existing containers
# =============================================================================
log "=== STEP 2: Stopping existing containers ==="

cd "${SCRIPT_DIR}"

docker compose -f docker-compose.yml -f docker-compose.production.yml down 2>/dev/null || true
success "Existing containers stopped"

# =============================================================================
# STEP 3: Clean up
# =============================================================================
log "=== STEP 3: Cleaning up ==="

# Remove old containers
docker rm -f ayantaraz-api ayantaraz-web ayantaraz-postgres ayantaraz-redis ayantaraz-nginx 2>/dev/null || true

# Prune system
docker system prune -f 2>/dev/null || true

success "Cleanup completed"

# =============================================================================
# STEP 4: Create uploads directory
# =============================================================================
log "=== STEP 4: Creating uploads directory ==="

mkdir -p "${SCRIPT_DIR}/uploads"
chmod -R 755 "${SCRIPT_DIR}/uploads"
success "Uploads directory created"

# =============================================================================
# STEP 5: Build and start containers
# =============================================================================
log "=== STEP 5: Building and starting containers ==="

log "Building images (this may take several minutes)..."
docker compose -f docker-compose.yml -f docker-compose.production.yml build --no-cache

log "Starting containers..."
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d

success "Containers started"

# =============================================================================
# STEP 6: Wait for services to be healthy
# =============================================================================
log "=== STEP 6: Waiting for services to be healthy ==="

# Wait for PostgreSQL
log "Waiting for PostgreSQL..."
for i in {1..30}; do
    if docker compose -f docker-compose.yml -f docker-compose.production.yml exec postgres pg_isready -U ayantaraz 2>/dev/null; then
        success "PostgreSQL is ready"
        break
    fi
    sleep 2
    log "Waiting for PostgreSQL... (attempt $i/30)"
done

# Wait for Redis
log "Waiting for Redis..."
for i in {1..30}; do
    if docker compose -f docker-compose.yml -f docker-compose.production.yml exec redis redis-cli -a "${REDIS_PASSWORD}" ping 2>/dev/null | grep -q "PONG"; then
        success "Redis is ready"
        break
    fi
    sleep 2
    log "Waiting for Redis... (attempt $i/30)"
done

# Wait for API
log "Waiting for API..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        success "API is ready"
        break
    fi
    sleep 3
    log "Waiting for API... (attempt $i/30)"
done

# Wait for Web
log "Waiting for Web..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        success "Web is ready"
        break
    fi
    sleep 3
    log "Waiting for Web... (attempt $i/30)"
done

# =============================================================================
# STEP 7: Run database migrations and seed
# =============================================================================
log "=== STEP 7: Running database migrations and seed ==="

# Run migrations
log "Running database migrations..."
docker compose -f docker-compose.yml -f docker-compose.production.yml exec api npx prisma migrate deploy --schema=/app/prisma/schema.prisma
success "Database migrations applied"

# Seed database (including admin users)
log "Seeding database..."
docker compose -f docker-compose.yml -f docker-compose.production.yml exec api node /app/prisma/seed.js
success "Database seeded"

# =============================================================================
# STEP 8: Verify deployment
# =============================================================================
log "=== STEP 8: Verifying deployment ==="

# Check container status
echo ""
log "Container status:"
docker compose -f docker-compose.yml -f docker-compose.production.yml ps

# Test health endpoint
echo ""
log "Testing health endpoint:"
curl -s http://localhost:3001/health | head -20

# Test API through nginx
echo ""
log "Testing API through nginx:"
curl -s http://localhost/api/health | head -20

# Test web through nginx
echo ""
log "Testing web through nginx:"
curl -s http://localhost/ | head -20

# =============================================================================
# STEP 9: Final instructions
# =============================================================================
echo ""
log "=== DEPLOYMENT COMPLETE ==="
echo ""
success "Ayantaraz is now running in production mode!"
echo ""
log "Access points:"
log "  - Web Application: http://202.133.91.13"
log "  - API Direct:     http://202.133.91.13:3001"
log "  - API via Nginx:  http://202.133.91.13/api"
echo ""

if grep -q "CHANGE_ME\|YOUR_SMS_API_KEY\|^SMS_API_KEY=$" "${SCRIPT_DIR}/.env.production"; then
    warning "IMPORTANT: SMS_API_KEY is not configured!"
    warning "OTP/SMS functionality will NOT work."
    warning "Edit .env.production and set SMS_API_KEY, then restart:"
    warning "  docker compose -f docker-compose.yml -f docker-compose.production.yml restart api"
    echo ""
fi

log "To monitor logs:"
log "  docker compose -f docker-compose.yml -f docker-compose.production.yml logs -f"
echo ""
log "To stop:"
log "  docker compose -f docker-compose.yml -f docker-compose.production.yml down"
echo ""

# =============================================================================
# TO ADD DOMAIN LATER:
# =============================================================================
# 1. Get SSL certificate (e.g., using certbot)
# 2. Update nginx configuration to use SSL
# 3. Update .env.production:
#    - Set COOKIE_SECURE=true
#    - Update all URLs to use https://your-domain.ir
# 4. Update docker-compose.production.yml with domain URLs
# 5. Restart: docker compose -f docker-compose.yml -f docker-compose.production.yml up -d
# =============================================================================
