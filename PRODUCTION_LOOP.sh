#!/bin/bash

# =============================================================================
# ayantaraz Production Loop Script
# Continuous Monitoring and Auto-Recovery System
# Server: 202.133.91.13
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

# Configuration
PROJECT_DIR="/opt/ayantaraz"
SERVER_IP="202.133.91.13"
CHECK_INTERVAL=60
MAX_RETRIES=3
LOG_FILE="/var/log/ayantaraz-loop.log"

# =============================================================================
# FUNCTIONS
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO $(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS $(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING $(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR $(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_header() {
    echo -e "\n${PURPLE}========================================${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}========================================${NC}" | tee -a "$LOG_FILE"
}

# =============================================================================
# HEALTH CHECKS
# =============================================================================

check_api_health() {
    local retries=0
    local success=false
    
    while [ $retries -lt $MAX_RETRIES ]; do
        local status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null || echo "000")
        if [ "$status" = "200" ]; then
            success=true
            break
        fi
        retries=$((retries + 1))
        sleep 5
    done
    
    if [ "$success" = true ]; then
        log_success "API health check passed"
        return 0
    else
        log_error "API health check failed after $MAX_RETRIES attempts"
        return 1
    fi
}

check_web_health() {
    local retries=0
    local success=false
    
    while [ $retries -lt $MAX_RETRIES ]; do
        local status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
        if [ "$status" = "200" ]; then
            success=true
            break
        fi
        retries=$((retries + 1))
        sleep 5
    done
    
    if [ "$success" = true ]; then
        log_success "Web health check passed"
        return 0
    else
        log_error "Web health check failed after $MAX_RETRIES attempts"
        return 1
    fi
}

check_database() {
    local retries=0
    local success=false
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if docker compose -f docker-compose.yml -f docker-compose.production.yml exec postgres pg_isready -U ayantaraz 2>/dev/null; then
            success=true
            break
        fi
        retries=$((retries + 1))
        sleep 5
    done
    
    if [ "$success" = true ]; then
        log_success "Database health check passed"
        return 0
    else
        log_error "Database health check failed after $MAX_RETRIES attempts"
        return 1
    fi
}

check_redis() {
    local retries=0
    local success=false
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if docker compose -f docker-compose.yml -f docker-compose.production.yml exec redis redis-cli -a ayantarazRedis@2025 ping 2>/dev/null | grep -q "PONG"; then
            success=true
            break
        fi
        retries=$((retries + 1))
        sleep 5
    done
    
    if [ "$success" = true ]; then
        log_success "Redis health check passed"
        return 0
    else
        log_error "Redis health check failed after $MAX_RETRIES attempts"
        return 1
    fi
}

check_containers() {
    local running=$(docker compose -f docker-compose.yml -f docker-compose.production.yml ps --services --filter "status=running" 2>/dev/null | wc -l)
    local total=$(docker compose -f docker-compose.yml -f docker-compose.production.yml ps --services 2>/dev/null | wc -l)
    
    if [ "$running" -eq "$total" ] && [ "$total" -gt 0 ]; then
        log_success "All containers are running ($running/$total)"
        return 0
    else
        log_error "Not all containers are running ($running/$total)"
        docker compose -f docker-compose.yml -f docker-compose.production.yml ps
        return 1
    fi
}

# =============================================================================
# RECOVERY FUNCTIONS
# =============================================================================

restart_container() {
    local container=$1
    log_info "Restarting container: $container"
    docker compose -f docker-compose.yml -f docker-compose.production.yml restart "$container" 2>/dev/null || true
    sleep 10
}

restart_all() {
    log_info "Restarting all containers..."
    docker compose -f docker-compose.yml -f docker-compose.production.yml down 2>/dev/null || true
    sleep 5
    docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build 2>/dev/null || true
    sleep 30
}

run_migrations() {
    log_info "Running database migrations..."
    docker compose -f docker-compose.yml -f docker-compose.production.yml exec api npx prisma migrate deploy --schema=/app/prisma/schema.prisma 2>/dev/null || true
    sleep 5
}

run_seed() {
    log_info "Running database seed..."
    docker compose -f docker-compose.yml -f docker-compose.production.yml exec api node /app/prisma/seed.js 2>/dev/null || true
    sleep 5
}

# =============================================================================
# MONITORING LOOP
# =============================================================================

monitor_loop() {
    log_header "AYANTARAZ PRODUCTION MONITORING LOOP"
    log_info "Starting continuous monitoring..."
    log_info "Check interval: ${CHECK_INTERVAL} seconds"
    log_info "Max retries: ${MAX_RETRIES}"
    
    while true; do
        log_header "Health Check Cycle - $(date +'%Y-%m-%d %H:%M:%S')"
        
        local all_healthy=true
        
        # Check containers
        if ! check_containers; then
            all_healthy=false
            log_info "Attempting to restart all containers..."
            restart_all
            if ! check_containers; then
                log_error "Failed to restart containers"
            fi
        fi
        
        # Check database
        if ! check_database; then
            all_healthy=false
            log_info "Attempting to restart database..."
            restart_container postgres
            run_migrations
            run_seed
        fi
        
        # Check Redis
        if ! check_redis; then
            all_healthy=false
            log_info "Attempting to restart Redis..."
            restart_container redis
        fi
        
        # Check API
        if ! check_api_health; then
            all_healthy=false
            log_info "Attempting to restart API..."
            restart_container api
            sleep 15
        fi
        
        # Check Web
        if ! check_web_health; then
            all_healthy=false
            log_info "Attempting to restart Web..."
            restart_container web
            sleep 15
        fi
        
        if [ "$all_healthy" = true ]; then
            log_success "All services are healthy!"
        else
            log_warning "Some services had issues but recovery was attempted"
        fi
        
        # Show status
        echo ""
        docker compose -f docker-compose.yml -f docker-compose.production.yml ps
        echo ""
        
        # Wait for next check
        log_info "Next check in ${CHECK_INTERVAL} seconds..."
        sleep $CHECK_INTERVAL
    done
}

# =============================================================================
# MAIN
# =============================================================================

main() {
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Check if we're in the right directory
    if [ ! -d "$PROJECT_DIR" ]; then
        log_error "Not in project directory: $PROJECT_DIR"
        exit 1
    fi
    
    cd "$PROJECT_DIR"
    
    # Start monitoring loop
    monitor_loop
}

# Run main function
main "$@"
