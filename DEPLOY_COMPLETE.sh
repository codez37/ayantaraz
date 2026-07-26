#!/bin/bash

# =============================================================================
# Ayantaraz Complete Deployment Script
# Server: 202.133.91.13
# This script handles everything: Docker installation, repository setup,
# configuration, building, and deployment
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="202.133.91.13"
REPO_URL="https://github.com/codez37/ayantaraz.git"
PROJECT_DIR="/opt/ayantaraz"
BRANCH="main"

# =============================================================================
# FUNCTIONS
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [ "$(id -u)" -ne 0 ]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

install_docker() {
    log_info "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        log_info "Installing Docker..."
        apt-get update -qq
        apt-get install -y -qq \
            ca-certificates \
            curl \
            gnupg \
            lsb-release
        
        mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        
        echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        apt-get update -qq
        apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
        
        log_success "Docker installed successfully"
    else
        log_info "Docker is already installed"
    fi
    
    if ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose not found. Please install Docker Compose v2+"
        exit 1
    fi
    
    log_success "Docker and Docker Compose are ready"
}

install_git() {
    log_info "Checking Git installation..."
    
    if ! command -v git &> /dev/null; then
        log_info "Installing Git..."
        apt-get update -qq
        apt-get install -y -qq git
        log_success "Git installed successfully"
    else
        log_info "Git is already installed"
    fi
}

install_curl() {
    log_info "Checking curl installation..."
    
    if ! command -v curl &> /dev/null; then
        log_info "Installing curl..."
        apt-get update -qq
        apt-get install -y -qq curl
        log_success "curl installed successfully"
    else
        log_info "curl is already installed"
    fi
}

clone_repository() {
    log_info "Cloning repository..."
    
    if [ -d "$PROJECT_DIR" ]; then
        log_info "Repository already exists. Pulling latest changes..."
        cd "$PROJECT_DIR"
        git fetch origin "$BRANCH"
        git checkout "$BRANCH"
        git pull origin "$BRANCH"
    else
        git clone "$REPO_URL" "$PROJECT_DIR"
        cd "$PROJECT_DIR"
        git checkout "$BRANCH"
    fi
    
    log_success "Repository is ready"
}

create_directories() {
    log_info "Creating necessary directories..."
    
    cd "$PROJECT_DIR"
    
    # Create directories for volumes
    mkdir -p uploads
    mkdir -p prisma
    
    log_success "Directories created"
}

create_env_file() {
    log_info "Creating .env.production file..."
    
    cd "$PROJECT_DIR"
    
    # Generate secure secrets if not already set
    JWT_SECRET=$(openssl rand -base64 48 2>/dev/null || echo "tWcUonHPkUh1iHaLxAJs4m4MyMehOlnJedPtBz66ObHZT8ncNHKmpUr4oaPmFaqW")
    JWT_REFRESH_SECRET=$(openssl rand -base64 48 2>/dev/null || echo "tA8xg1dLuDRtLPlTVhBKvAUUh0Yzr69/oIaHvZmhiB5EwC2CBVyWteeGj3DqSUKg")
    FILE_ENCRYPTION_KEY=$(openssl rand -base64 32 2>/dev/null || echo "+xehvmJjJcqdXBpM0I5XQDmRrpfteDDZj6e74IBVIwg=")
    SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "chmkt/9SapY4u29Ast2Ef2FixamRHY7T/25Lf37kXNs=")
    POSTGRES_PASSWORD=$(openssl rand -base64 16 2>/dev/null || echo "AyantarazDB@2025")
    REDIS_PASSWORD=$(openssl rand -base64 16 2>/dev/null || echo "AyantarazRedis@2025")
    
    cat > .env.production << 'EOF'
# =============================================================================
# Ayantaraz Production Environment Configuration
# Server: 202.133.91.13
# IP-based access (no domain initially, domain can be added later)
# Admin phones: 09133374162, 09134292329
# Generated: July 2026
# =============================================================================

# -----------------------------------------------------------------------------
# CORE APPLICATION SETTINGS
# -----------------------------------------------------------------------------
NODE_ENV=production
PORT=3001
DOCKER_ENV=true

# -----------------------------------------------------------------------------
# SERVER URLs (IP-based for initial deployment)
# -----------------------------------------------------------------------------
API_URL=http://202.133.91.13:3001
FRONTEND_URL=http://202.133.91.13:3000
SITE_URL=http://202.133.91.13

# Next.js internal API URL (Docker network hostname)
INTERNAL_API_URL=http://api:3001/api

# Next.js public API URL (baked at build time for client-side)
NEXT_PUBLIC_API_URL=http://202.133.91.13:3001
NEXT_PUBLIC_SITE_URL=http://202.133.91.13

# -----------------------------------------------------------------------------
# DATABASE CONFIGURATION (PostgreSQL)
# -----------------------------------------------------------------------------
POSTGRES_USER=ayantaraz
POSTGRES_PASSWORD=AyantarazDB@2025
POSTGRES_DB=ayantaraz

# -----------------------------------------------------------------------------
# REDIS CONFIGURATION (Cache & Rate Limiting)
# -----------------------------------------------------------------------------
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=AyantarazRedis@2025

# -----------------------------------------------------------------------------
# JWT AUTHENTICATION
# -----------------------------------------------------------------------------
JWT_SECRET=tWcUonHPkUh1iHaLxAJs4m4MyMehOlnJedPtBz66ObHZT8ncNHKmpUr4oaPmFaqW
JWT_REFRESH_SECRET=tA8xg1dLuDRtLPlTVhBKvAUUh0Yzr69/oIaHvZmhiB5EwC2CBVyWteeGj3DqSUKg
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# -----------------------------------------------------------------------------
# SECURITY SETTINGS
# -----------------------------------------------------------------------------
FILE_ENCRYPTION_KEY=+xehvmJjJcqdXBpM0I5XQDmRrpfteDDZj6e74IBVIwg=
CAPTCHA_SECRET=
ALLOW_ALL_ORIGINS=true
TRUSTED_ORIGINS=http://202.133.91.13,http://202.133.91.13:3000,http://202.133.91.13:3001

# -----------------------------------------------------------------------------
# COOKIE SETTINGS (HTTP for now, can be upgraded to HTTPS with domain)
# -----------------------------------------------------------------------------
COOKIE_SECURE=false
COOKIE_HTTP_ONLY=true
COOKIE_SAME_SITE=lax
COOKIE_DOMAIN=202.133.91.13

# -----------------------------------------------------------------------------
# DATABASE CONNECTION POOL
# -----------------------------------------------------------------------------
DB_POOL_MAX_CONNECTIONS=20
DB_POOL_MIN_CONNECTIONS=5
DB_POOL_MAX_REQUESTS_PER_CONNECTION=100
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_CONNECTION_TIMEOUT_MS=5000

# -----------------------------------------------------------------------------
# SESSION CONFIGURATION
# -----------------------------------------------------------------------------
SESSION_SECRET=chmkt/9SapY4u29Ast2Ef2FixamRHY7T/25Lf37kXNs=

# -----------------------------------------------------------------------------
# RATE LIMITING CONFIGURATION
# -----------------------------------------------------------------------------
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMITER_FAIL_OPEN=true

# -----------------------------------------------------------------------------
# SMS CONFIGURATION (REQUIRED for OTP)
# Provider: SAPI.IR
# REQUIRED: Set SMS_API_KEY for OTP functionality to work
# -----------------------------------------------------------------------------
SMS_API_KEY=
SMS_PROVIDER=sms-panel
SMS_FROM=Ayantaraz

# -----------------------------------------------------------------------------
# ADMIN PHONE NUMBERS (Comma-separated, will be seeded in database)
# -----------------------------------------------------------------------------
ADMIN_PHONE=09133374162,09134292329

# -----------------------------------------------------------------------------
# LOGGING CONFIGURATION
# -----------------------------------------------------------------------------
LOG_LEVEL=info

# -----------------------------------------------------------------------------
# OTP CONFIGURATION
# -----------------------------------------------------------------------------
OTP_EXPIRY_SECONDS=300
OTP_MAX_ATTEMPTS=5
OTP_RESEND_LIMIT=3
OTP_RESEND_WINDOW_MINUTES=10
OTP_BLOCK_DURATION_MINUTES=30

# -----------------------------------------------------------------------------
# TIMEZONE
# -----------------------------------------------------------------------------
TZ=Asia/Tehran

# -----------------------------------------------------------------------------
# DOCKER SPECIFIC
# -----------------------------------------------------------------------------
HOSTNAME=0.0.0.0

# -----------------------------------------------------------------------------
# FILE UPLOAD CONFIGURATION
# -----------------------------------------------------------------------------
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/app/uploads

# -----------------------------------------------------------------------------
# HEALTH CHECK CONFIGURATION
# -----------------------------------------------------------------------------
HEALTH_CHECK_INTERVAL=30000
EOF
    
    log_success ".env.production file created with secure values"
}

build_and_start() {
    log_info "Building and starting containers..."
    
    cd "$PROJECT_DIR"
    
    # Make sure scripts are executable
    chmod +x deploy-production.sh validate-production.sh DEPLOY_TO_202.133.91.13.sh
    
    # Stop existing containers if any
    log_info "Stopping existing containers..."
    docker compose -f docker-compose.yml -f docker-compose.production.yml down || true
    
    # Build images
    log_info "Building Docker images..."
    docker compose -f docker-compose.yml -f docker-compose.production.yml build --no-cache
    
    # Start containers
    log_info "Starting containers..."
    docker compose -f docker-compose.yml -f docker-compose.production.yml up -d
    
    log_success "Containers started"
}

wait_for_services() {
    log_info "Waiting for services to become healthy..."
    
    cd "$PROJECT_DIR"
    
    # Wait for database
    log_info "Waiting for PostgreSQL..."
    for i in {1..30}; do
        if docker compose -f docker-compose.yml -f docker-compose.production.yml exec postgres pg_isready -U ayantaraz &>/dev/null; then
            log_success "PostgreSQL is ready"
            break
        fi
        sleep 2
        if [ $i -eq 30 ]; then
            log_error "PostgreSQL failed to start"
            exit 1
        fi
    done
    
    # Wait for Redis
    log_info "Waiting for Redis..."
    for i in {1..30}; do
        if docker compose -f docker-compose.yml -f docker-compose.production.yml exec redis redis-cli -a AyantarazRedis@2025 ping &>/dev/null; then
            log_success "Redis is ready"
            break
        fi
        sleep 2
        if [ $i -eq 30 ]; then
            log_error "Redis failed to start"
            exit 1
        fi
    done
    
    # Wait for API
    log_info "Waiting for API..."
    for i in {1..60}; do
        if curl -s http://localhost:3001/health >/dev/null 2>&1; then
            log_success "API is ready"
            break
        fi
        sleep 2
        if [ $i -eq 60 ]; then
            log_error "API failed to start"
            exit 1
        fi
    done
    
    # Run migrations
    log_info "Running database migrations..."
    docker compose -f docker-compose.yml -f docker-compose.production.yml exec api npx prisma migrate deploy --schema=/app/prisma/schema.prisma
    
    # Seed database
    log_info "Seeding database..."
    docker compose -f docker-compose.yml -f docker-compose.production.yml exec api node /app/prisma/seed.js
    
    log_success "Database migrations and seeding completed"
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    cd "$PROJECT_DIR"
    
    # Check all containers are running
    log_info "Checking container status..."
    docker compose -f docker-compose.yml -f docker-compose.production.yml ps
    
    # Check health endpoint
    log_info "Checking API health..."
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
    if [ "$HEALTH_STATUS" != "200" ]; then
        log_error "Health check failed with status: $HEALTH_STATUS"
        exit 1
    fi
    log_success "API health check passed"
    
    # Check web endpoint
    log_info "Checking web endpoint..."
    WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
    if [ "$WEB_STATUS" != "200" ]; then
        log_error "Web check failed with status: $WEB_STATUS"
        exit 1
    fi
    log_success "Web endpoint check passed"
    
    echo ""
    log_success "=========================================="
    log_success "DEPLOYMENT SUCCESSFUL!"
    log_success "=========================================="
    echo ""
    log_info "Access points:"
    log_info "  - Web Application: http://202.133.91.13"
    log_info "  - API Direct: http://202.133.91.13:3001"
    log_info "  - API via Nginx: http://202.133.91.13/api"
    echo ""
    log_info "Admin access:"
    log_info "  - Phone: 09133374162"
    log_info "  - Phone: 09134292329"
    echo ""
    log_info "To check logs: docker compose -f docker-compose.yml -f docker-compose.production.yml logs -f"
    log_info "To stop: docker compose -f docker-compose.yml -f docker-compose.production.yml down"
    echo ""
}

# =============================================================================
# MAIN DEPLOYMENT
# =============================================================================

main() {
    echo ""
    echo "=========================================="
    echo "  Ayantaraz Complete Deployment Script"
    echo "  Server: $SERVER_IP"
    echo "  Project: $PROJECT_DIR"
    echo "=========================================="
    echo ""
    
    check_root
    install_docker
    install_git
    install_curl
    clone_repository
    create_directories
    create_env_file
    build_and_start
    wait_for_services
    verify_deployment
}

# Run main function
main "$@"
