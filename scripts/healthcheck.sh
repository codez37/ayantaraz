#!/bin/bash

# Health Check Script for Ayantaraz Production
# Usage: ./scripts/healthcheck.sh

set -e

echo "🏥 Starting Health Check for Ayantaraz..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service health
check_service() {
    local name=$1
    local url=$2
    local expected_status=$3
    
    echo -n "🔍 Checking ${name}... "
    
    if curl -s --head --request GET "$url" | grep "HTTP/1.1 ${expected_status}"; then
        echo -e "${GREEN}✅ Healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ Unhealthy${NC}"
        return 1
    fi
}

# Function to check database connection
check_database() {
    echo -n "🔍 Checking PostgreSQL connection... "
    
    if docker-compose exec postgres pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB} >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Connected${NC}"
        return 0
    else
        echo -e "${RED}❌ Connection Failed${NC}"
        return 1
    fi
}

# Function to check Redis connection
check_redis() {
    echo -n "🔍 Checking Redis connection... "
    
    if docker-compose exec redis redis-cli -a "${REDIS_PASSWORD}" ping >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Connected${NC}"
        return 0
    else
        echo -e "${RED}❌ Connection Failed${NC}"
        return 1
    fi
}

# Function to check container status
check_container() {
    local name=$1
    
    echo -n "🔍 Checking ${name} container... "
    
    if docker-compose ps | grep -q "${name}"; then
        echo -e "${GREEN}✅ Running${NC}"
        return 0
    else
        echo -e "${RED}❌ Not Running${NC}"
        return 1
    fi
}

# Main health check
echo ""
echo "📦 Container Status:"
echo "------------------"

FAILED=0

check_container "ayantaraz-api" || FAILED=$((FAILED + 1))
check_container "ayantaraz-web" || FAILED=$((FAILED + 1))
check_container "ayantaraz-postgres" || FAILED=$((FAILED + 1))
check_container "ayantaraz-redis" || FAILED=$((FAILED + 1))
check_container "ayantaraz-nginx" || FAILED=$((FAILED + 1))

echo ""
echo "🌐 Service Health:"
echo "----------------"

check_service "API" "http://localhost:3001/api/health" "200" || FAILED=$((FAILED + 1))
check_service "Web" "http://localhost:3000" "200" || FAILED=$((FAILED + 1))
check_service "Nginx" "http://localhost" "200" || FAILED=$((FAILED + 1))

echo ""
echo "🗄️ Database Status:"
echo "------------------"

check_database || FAILED=$((FAILED + 1))
check_redis || FAILED=$((FAILED + 1))

echo ""
echo "=========================================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All Health Checks Passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED Health Check(s) Failed!${NC}"
    exit 1
fi
