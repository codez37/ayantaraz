#!/bin/bash

# =============================================================================
# ayantaraz Production Validation Script
# This script validates that the production deployment is working correctly
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PASS=0
FAIL=0

pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASS++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAIL++))
}

warning() {
    echo -e "${YELLOW}⚠ WARNING${NC}: $1"
}

check() {
    local test_name="$1"
    local command="$2"
    
    if eval "$command" > /dev/null 2>&1; then
        pass "$test_name"
        return 0
    else
        fail "$test_name"
        return 1
    fi
}

echo ""
echo "============================================================================"
echo "  ayantaraz Production Validation"
echo "  Server: 202.133.91.13"
echo "============================================================================"
echo ""

# =============================================================================
# ENVIRONMENT VALIDATION
# =============================================================================
echo "--- Environment Validation ---"

# Check .env.production exists
if [ -f "${SCRIPT_DIR}/.env.production" ]; then
    pass ".env.production file exists"
else
    fail ".env.production file not found"
fi

# Check required environment variables
REQUIRED_VARS=(
    "NODE_ENV"
    "DATABASE_URL"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "POSTGRES_DB"
    "REDIS_HOST"
    "REDIS_PORT"
    "REDIS_PASSWORD"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "FILE_ENCRYPTION_KEY"
    "SESSION_SECRET"
    "ADMIN_PHONE"
    "SITE_URL"
    "API_URL"
    "NEXT_PUBLIC_API_URL"
    "NEXT_PUBLIC_SITE_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${var}=" "${SCRIPT_DIR}/.env.production" 2>/dev/null; then
        pass "Environment variable ${var} is set"
    else
        fail "Environment variable ${var} is NOT set"
    fi
done

# Check SMS_API_KEY
if grep -q "SMS_API_KEY=CHANGE_ME" "${SCRIPT_DIR}/.env.production" 2>/dev/null; then
    warning "SMS_API_KEY is not configured - OTP/SMS will not work"
fi

echo ""

# =============================================================================
# DOCKER VALIDATION
# =============================================================================
echo "--- Docker Validation ---"

# Check Docker is running
check "Docker is running" "docker ps > /dev/null"

# Check containers are running
CONTAINERS=("ayantaraz-api" "ayantaraz-web" "ayantaraz-postgres" "ayantaraz-redis" "ayantaraz-nginx")

for container in "${CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        pass "Container ${container} is running"
    else
        fail "Container ${container} is NOT running"
    fi
done

echo ""

# =============================================================================
# DATABASE VALIDATION
# =============================================================================
echo "--- Database Validation ---"

# Check PostgreSQL connection
check "PostgreSQL is accessible" "docker exec ayantaraz-postgres pg_isready -U ayantaraz"

# Check database exists
check "Database 'ayantaraz' exists" "docker exec ayantaraz-postgres psql -U ayantaraz -l | grep -q ayantaraz"

# Check tables exist
check "Tables exist in database" "docker exec ayantaraz-postgres psql -U ayantaraz -d ayantaraz -c '\\dt' | grep -q user"

# Check admin users exist
ADMIN_COUNT=$(docker exec ayantaraz-postgres psql -U ayantaraz -d ayantaraz -t -c "SELECT COUNT(*) FROM \"User\" WHERE role = 'admin'" | tr -d ' ')
if [ "$ADMIN_COUNT" -gt 0 ]; then
    pass "Admin users exist in database (count: $ADMIN_COUNT)"
else
    fail "No admin users found in database"
fi

# Check specific admin phones
for phone in "09133374162" "09134292329"; do
    if docker exec ayantaraz-postgres psql -U ayantaraz -d ayantaraz -t -c "SELECT COUNT(*) FROM \"User\" WHERE phone = '${phone}' AND role = 'admin'" | grep -q "1"; then
        pass "Admin user ${phone} exists"
    else
        fail "Admin user ${phone} NOT found"
    fi
done

echo ""

# =============================================================================
# REDIS VALIDATION
# =============================================================================
echo "--- Redis Validation ---"

check "Redis is accessible" "docker exec ayantaraz-redis redis-cli -a ayantarazRedis@2025 ping | grep -q PONG"

# Check Redis keys
KEY_COUNT=$(docker exec ayantaraz-redis redis-cli -a ayantarazRedis@2025 DBSIZE | awk '{print $2}')
pass "Redis has ${KEY_COUNT} keys"

echo ""

# =============================================================================
# API VALIDATION
# =============================================================================
echo "--- API Validation ---"

# Check API health
check "API health endpoint" "curl -s http://localhost:3001/health | grep -q healthy"

# Check API through nginx
check "API through nginx" "curl -s http://localhost/api/health | grep -q healthy"

# Check CSRF endpoint
check "CSRF endpoint" "curl -s http://localhost:3001/api/csrf | grep -q token"

# Check auth endpoints
check "Auth OTP endpoint" "curl -s -X POST http://localhost:3001/api/auth/otp -H 'Content-Type: application/json' -d '{\"phone\":\"09120000000\"}' | grep -q message"

echo ""

# =============================================================================
# WEB VALIDATION
# =============================================================================
echo "--- Web Validation ---"

# Check web is serving
check "Web is serving" "curl -s http://localhost:3000 | grep -q html"

# Check web through nginx
check "Web through nginx" "curl -s http://localhost/ | grep -q html"

echo ""

# =============================================================================
# NGINX VALIDATION
# =============================================================================
echo "--- Nginx Validation ---"

check "Nginx is running" "docker ps --format '{{.Names}}' | grep -q ayantaraz-nginx"

check "Nginx configuration" "docker exec ayantaraz-nginx nginx -t"

# Check nginx can reach API
check "Nginx to API proxy" "curl -s http://localhost/api/health | grep -q healthy"

# Check nginx can reach Web
check "Nginx to Web proxy" "curl -s http://localhost/ | grep -q html"

echo ""

# =============================================================================
# FUNCTIONALITY VALIDATION
# =============================================================================
echo "--- Functionality Validation ---"

# Test registration flow (without SMS)
REGISTRATION_TEST=$(curl -s -X POST http://localhost:3001/api/auth/otp \
    -H 'Content-Type: application/json' \
    -d '{"phone": "09120000000"}' 2>&1)

if echo "$REGISTRATION_TEST" | grep -q "OTP sent"; then
    pass "OTP request works (SMS may not be sent without SMS_API_KEY)"
else
    fail "OTP request failed: $REGISTRATION_TEST"
fi

# Test health check details
HEALTH_DETAILS=$(curl -s http://localhost:3001/health)
if echo "$HEALTH_DETAILS" | grep -q "database.*up"; then
    pass "Database health check passes"
else
    fail "Database health check failed"
fi

if echo "$HEALTH_DETAILS" | grep -q "cache.*up"; then
    pass "Cache health check passes"
else
    fail "Cache health check failed"
fi

echo ""

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo "============================================================================"
echo "  VALIDATION SUMMARY"
echo "============================================================================"
echo ""
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED - Production is ready!${NC}"
    exit 0
else
    echo -e "${RED}✗ SOME CHECKS FAILED - Please fix the issues above${NC}"
    exit 1
fi
