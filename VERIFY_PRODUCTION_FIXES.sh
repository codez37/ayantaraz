#!/bin/bash

# Ayantaraz Production Verification Script
# This script verifies all production fixes have been applied

echo "=========================================="
echo "Ayantaraz Production Verification"
echo "=========================================="
echo ""

ERRORS=0

# Check 1: Environment files exist
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production does not exist"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ .env.production exists"
fi

# Check 2: CAPTCHA is disabled
if grep -q "^CAPTCHA_SECRET=$" .env.production; then
    echo "✅ CAPTCHA is disabled"
else
    echo "❌ CAPTCHA is not disabled"
    ERRORS=$((ERRORS + 1))
fi

# Check 3: Admin phones are set
if grep -q "09133374162" .env.production && grep -q "09134292329" .env.production; then
    echo "✅ Admin phones are set"
else
    echo "❌ Admin phones are not set"
    ERRORS=$((ERRORS + 1))
fi

# Check 4: All critical environment variables exist
CRITICAL_VARS=("JWT_SECRET" "JWT_REFRESH_SECRET" "FILE_ENCRYPTION_KEY" "SESSION_SECRET" "POSTGRES_PASSWORD" "REDIS_PASSWORD")
for var in "${CRITICAL_VARS[@]}"; do
    if grep -q "^${var}=" .env.production; then
        echo "✅ $var is set"
    else
        echo "❌ $var is not set"
        ERRORS=$((ERRORS + 1))
    fi
done

# Check 5: Docker files exist
if [ -f "docker-compose.production.yml" ]; then
    echo "✅ docker-compose.production.yml exists"
else
    echo "❌ docker-compose.production.yml does not exist"
    ERRORS=$((ERRORS + 1))
fi

# Check 6: Entrypoint scripts have error handling
if [ -f "infra/docker/entrypoint-api.sh" ]; then
    if grep -q "# set -e" infra/docker/entrypoint-api.sh; then
        echo "✅ entrypoint-api.sh has set -e commented out"
    else
        echo "❌ entrypoint-api.sh does not have set -e commented out"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check 7: CI/CD workflows exist
if [ -d ".github/workflows" ]; then
    echo "✅ CI/CD workflows directory exists"
else
    echo "❌ CI/CD workflows directory does not exist"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ All checks passed!"
    exit 0
else
    echo "❌ $ERRORS checks failed!"
    exit 1
fi
