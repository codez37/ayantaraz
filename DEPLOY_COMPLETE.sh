#!/bin/bash

# =============================================================================
# ayantaraz Complete Deployment Script
# Server: 202.133.91.13
# Version: 2.0 - Production Ready
# This script handles everything: Docker installation, repository setup,
# configuration, building, and deployment
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# =============================================================================
# CONFIGURATION
# =============================================================================

SERVER_IP="202.133.91.13"
REPO_URL="https://github.com/codez37/ayantaraz.git"
PROJECT_DIR="/opt/ayantaraz"
BRANCH="main"

# =============================================================================
# FUNCTIONS
# =============================================================================

log_header() {
    echo -e "\n${PURPLE}========================================${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}========================================${NC}"
}

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

# =============================================================================
# MAIN DEPLOYMENT FUNCTION
# =============================================================================

deploy() {
    log_header "ayantaraz Production Deployment"
    
    # Step 1: Check root
    check_root
    
    # Step 2: Install Docker if not present
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
    
    # Verify Docker Compose
    if ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose not found. Please install Docker Compose v2+"
        exit 1
    fi
    
    log_success "Docker and Docker Compose are ready"
    
    # Step 3: Install Git if not present
    log_info "Checking Git installation..."
    if ! command -v git &> /dev/null; then
        log_info "Installing Git..."
        apt-get update -qq
        apt-get install -y -qq git
        log_success "Git installed successfully"
    else
        log_info "Git is already installed"
    fi
    
    # Step 4: Clone or update repository
    log_info "Setting up repository..."
    if [ -d "$PROJECT_DIR/.git" ]; then
        cd "$PROJECT_DIR"
        git fetch origin main
        git checkout main
        git pull origin main
        log_success "Repository updated"
    else
        git clone "$REPO_URL" "$PROJECT_DIR"
        cd "$PROJECT_DIR"
        log_success "Repository cloned"
    fi
    
    # Step 5: Create environment files
    log_info "Creating environment files..."
    if [ ! -f ".env.production" ]; then
        cp .env.example .env.production 2>/dev/null || true
        # Generate secure values if not present
        if ! grep -q "^JWT_SECRET=" .env.production; then
            echo "JWT_SECRET=$(openssl rand -base64 48)" >> .env.production
        fi
        if ! grep -q "^JWT_REFRESH_SECRET=" .env.production; then
            echo "JWT_REFRESH_SECRET=$(openssl rand -base64 48)" >> .env.production
        fi
        if ! grep -q "^FILE_ENCRYPTION_KEY=" .env.production; then
            echo "FILE_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env.production
        fi
        if ! grep -q "^SESSION_SECRET=" .env.production; then
            echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env.production
        fi
        if ! grep -q "^POSTGRES_PASSWORD=" .env.production; then
            echo "POSTGRES_PASSWORD=ayantarazDB@2025" >> .env.production
        fi
        if ! grep -q "^REDIS_PASSWORD=" .env.production; then
            echo "REDIS_PASSWORD=ayantarazRedis@2025" >> .env.production
        fi
        if ! grep -q "^ADMIN_PHONE=" .env.production; then
            echo "ADMIN_PHONE=09133374162,09134292329" >> .env.production
        fi
        if ! grep -q "^CAPTCHA_SECRET=" .env.production; then
            echo "CAPTCHA_SECRET=" >> .env.production
        fi
        log_success "Environment files created"
    else
        log_info "Environment files already exist"
    fi
    
    # Step 6: Create directories
    log_info "Creating directories..."
    mkdir -p apps/api/uploads
    mkdir -p apps/web/.next
    chmod -R 755 apps/api/uploads
    log_success "Directories created"
    
    # Step 7: Build Docker images
    log_info "Building Docker images..."
    docker compose -f docker-compose.yml -f docker-compose.production.yml build --no-cache
    log_success "Docker images built"
    
    # Step 8: Stop existing containers
    log_info "Stopping existing containers..."
    docker compose -f docker-compose.yml -f docker-compose.production.yml down || true
    log_success "Existing containers stopped"
    
    # Step 9: Start containers
    log_info "Starting containers..."
    docker compose -f docker-compose.yml -f docker-compose.production.yml up -d
    log_success "Containers started"
    
    # Step 10: Wait for services
    log_info "Waiting for services to be healthy..."
    for i in {1..30}; do
        if docker compose -f docker-compose.yml -f docker-compose.production.yml ps | grep -q "healthy"; then
            log_success "All services are healthy"
            break
        fi
        sleep 5
        echo "Waiting for services... ($i/30)"
    done
    
    # Step 11: Run migrations
    log_info "Running database migrations..."
    docker compose -f docker-compose.yml -f docker-compose.production.yml exec api npx prisma migrate deploy --schema=/app/prisma/schema.prisma
    log_success "Database migrations applied"
    
    # Step 12: Seed database
    log_info "Seeding database..."
    docker compose -f docker-compose.yml -f docker-compose.production.yml exec api node /app/prisma/seed.js
    log_success "Database seeded"
    
    # Step 13: Verify deployment
    log_info "Verifying deployment..."
    for i in {1..10}; do
        HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health || echo "000")
        if [ "$HEALTH_STATUS" = "200" ]; then
            log_success "Health check passed"
            break
        fi
        sleep 5
        echo "Attempt $i/10 - Health status: $HEALTH_STATUS"
    done
    
    # Step 14: Show final status
    log_header "Deployment Complete"
    echo ""
    echo "🎉 Ayantaraz has been successfully deployed!"
    echo ""
    echo "📊 Services status:"
    docker compose -f docker-compose.yml -f docker-compose.production.yml ps
    echo ""
    echo "🌐 Access points:"
    echo "   - API:   http://${SERVER_IP}:3001"
    echo "   - Web:   http://${SERVER_IP}:3000"
    echo "   - Health: http://${SERVER_IP}:3001/health"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Configure SMS_API_KEY in .env.production for OTP functionality"
    echo "   2. Set up HTTPS with Let's Encrypt or your SSL certificate"
    echo "   3. Configure domain name if needed"
    echo ""
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

deploy
