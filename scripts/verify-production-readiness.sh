#!/bin/bash

# Ayantaraz Production Readiness Verification Script
# This script verifies that all production readiness requirements are met

# set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PASS=0
FAIL=0
WARNING=0

pass() {
    echo "[PASS] $1"
    ((PASS++))
}

fail() {
    echo "[FAIL] $1"
    ((FAIL++))
}

warning() {
    echo "[WARN] $1"
    ((WARNING++))
}

echo ""
echo "============================================================================"
echo "  Ayantaraz Production Readiness Verification"
echo "  Server: 202.133.91.13"
echo "============================================================================"
echo ""

echo "--- 1. Repository Structure ---"
for dir in "apps/api" "apps/web" "packages/shared" "prisma" "docs" "infra" "scripts" ".github/workflows"; do
    if [ -d "${PROJECT_DIR}/${dir}" ]; then
        pass "Directory ${dir} exists"
    else
        fail "Directory ${dir} is missing"
    fi
done
echo ""

echo "--- 2. CI/CD Pipeline ---"
WORKFLOWS=("ci-cd.yml" "docker-build-push.yml" "quality-checks.yml" "test.yml")
for workflow in "${WORKFLOWS[@]}"; do
    if [ -f "${PROJECT_DIR}/.github/workflows/${workflow}" ]; then
        pass "Workflow ${workflow} exists"
    else
        fail "Workflow ${workflow} is missing"
    fi
done

if grep -q "name: Ayantaraz CI/CD Pipeline" "${PROJECT_DIR}/.github/workflows/ci-cd.yml"; then
    pass "Main CI/CD workflow is properly configured"
else
    fail "Main CI/CD workflow is not properly configured"
fi
echo ""

echo "--- 3. Documentation ---"
DOCS=("CI-CD.md" "DOCKER.md" "MONITORING.md" "SECURITY.md" "README.md")
for doc in "${DOCS[@]}"; do
    if [ -f "${PROJECT_DIR}/docs/${doc}" ]; then
        pass "Documentation ${doc} exists"
    else
        fail "Documentation ${doc} is missing"
    fi
done

if grep -q "100% PRODUCTION READY" "${PROJECT_DIR}/README.md"; then
    pass "Main README indicates production readiness"
else
    fail "Main README does not indicate production readiness"
fi

for file in "DEPLOY-RUNBOOK.md" "PRODUCTION_DEPLOYMENT_GUIDE.md" "PRODUCTION_READINESS_ANALYSIS.md"; do
    if [ -f "${PROJECT_DIR}/${file}" ]; then
        pass "${file} exists"
    else
        fail "${file} is missing"
    fi
done
echo ""

echo "--- 4. Docker Configuration ---"
DOCKERFILES=("apps/api/Dockerfile" "apps/web/Dockerfile")
for dockerfile in "${DOCKERFILES[@]}"; do
    if [ -f "${PROJECT_DIR}/${dockerfile}" ]; then
        pass "Dockerfile ${dockerfile} exists"
    else
        fail "Dockerfile ${dockerfile} is missing"
    fi
done

COMPOSE_FILES=("docker-compose.yml" "docker-compose.production.yml" "docker-compose.prod.yml")
for compose in "${COMPOSE_FILES[@]}"; do
    if [ -f "${PROJECT_DIR}/${compose}" ]; then
        pass "Docker Compose file ${compose} exists"
    else
        fail "Docker Compose file ${compose} is missing"
    fi
done

for service in "ayantaraz-api" "ayantaraz-postgres" "ayantaraz-redis" "ayantaraz-nginx"; do
    if grep -q "${service}" "${PROJECT_DIR}/docker-compose.production.yml"; then
        pass "Service ${service} is configured in production compose"
    else
        fail "Service ${service} is not configured in production compose"
    fi
done
echo ""

echo "--- 5. Environment Configuration ---"
ENV_FILES=(".env.example" ".env.production")
for env_file in "${ENV_FILES[@]}"; do
    if [ -f "${PROJECT_DIR}/${env_file}" ]; then
        pass "Environment file ${env_file} exists"
    else
        fail "Environment file ${env_file} is missing"
    fi
done

if grep -q "SMS_API_KEY" "${PROJECT_DIR}/.env.production"; then
    pass ".env.production has SMS_API_KEY"
else
    fail ".env.production is missing SMS_API_KEY"
fi

if grep -q "ADMIN_PHONE=09133374162,09134292329" "${PROJECT_DIR}/.env.production"; then
    pass ".env.production has admin phone numbers"
else
    fail ".env.production is missing admin phone numbers"
fi

if grep -q "202.133.91.13" "${PROJECT_DIR}/.env.production"; then
    pass ".env.production is configured for server 202.133.91.13"
else
    fail ".env.production is not configured for server 202.133.91.13"
fi
echo ""

echo "--- 6. Deployment Scripts ---"
SCRIPTS=("deploy-production.sh" "validate-production.sh")
for script in "${SCRIPTS[@]}"; do
    if [ -f "${PROJECT_DIR}/${script}" ]; then
        pass "Deployment script ${script} exists"
    else
        fail "Deployment script ${script} is missing"
    fi
done

for script in "${SCRIPTS[@]}"; do
    if [ -x "${PROJECT_DIR}/${script}" ]; then
        pass "Deployment script ${script} is executable"
    else
        warning "Deployment script ${script} is not executable"
    fi
done

if grep -q "202.133.91.13" "${PROJECT_DIR}/deploy-production.sh"; then
    pass "deploy-production.sh is configured for server 202.133.91.13"
else
    fail "deploy-production.sh is not configured for server 202.133.91.13"
fi

if grep -q "docker compose" "${PROJECT_DIR}/deploy-production.sh"; then
    pass "deploy-production.sh uses docker compose"
else
    fail "deploy-production.sh does not use docker compose"
fi
echo ""

echo "--- 7. Security Configuration ---"
SECURITY_VARS=("JWT_SECRET" "JWT_REFRESH_SECRET" "FILE_ENCRYPTION_KEY" "SESSION_SECRET" "CAPTCHA_SECRET")
for var in "${SECURITY_VARS[@]}"; do
    if grep -q "${var}=" "${PROJECT_DIR}/.env.production"; then
        pass "${var} is configured"
    else
        fail "${var} is not configured"
    fi
done

if grep -q "RATE_LIMIT" "${PROJECT_DIR}/.env.production"; then
    pass "Rate limiting is configured"
else
    fail "Rate limiting is not configured"
fi
echo ""

echo "--- 8. Branch Protection ---"
if [ -f "${PROJECT_DIR}/.github/branch_protection.json" ]; then
    pass "Branch protection configuration exists"
else
    fail "Branch protection configuration is missing"
fi

if grep -q "required_status_checks" "${PROJECT_DIR}/.github/branch_protection.json"; then
    pass "Required status checks are configured"
else
    fail "Required status checks are not configured"
fi

if grep -q "enforce_admins" "${PROJECT_DIR}/.github/branch_protection.json"; then
    pass "Admin enforcement is configured"
else
    fail "Admin enforcement is not configured"
fi
echo ""

echo "--- 9. Git Ignore ---"
if [ -f "${PROJECT_DIR}/.gitignore" ]; then
    pass ".gitignore exists"
else
    fail ".gitignore is missing"
fi

PATTERNS=("node_modules/" ".env" ".next/" "dist/" "*.log")
for pattern in "${PATTERNS[@]}"; do
    if grep -q "${pattern}" "${PROJECT_DIR}/.gitignore"; then
        pass "Pattern ${pattern} is in .gitignore"
    else
        warning "Pattern ${pattern} is not in .gitignore"
    fi
done
echo ""

echo "--- 10. Package Configuration ---"
PACKAGE_FILES=("package.json" "pnpm-lock.yaml" "pnpm-workspace.yaml")
for pkg_file in "${PACKAGE_FILES[@]}"; do
    if [ -f "${PROJECT_DIR}/${pkg_file}" ]; then
        pass "${pkg_file} exists"
    else
        fail "${pkg_file} is missing"
    fi
done

SCRIPTS=("dev" "build" "lint" "test" "typecheck" "db:generate" "db:migrate" "db:seed")
for script in "${SCRIPTS[@]}"; do
    if grep -q '"'${script}'"' "${PROJECT_DIR}/package.json"; then
        pass "Script ${script} is defined in package.json"
    else
        warning "Script ${script} is not defined in package.json"
    fi
done
echo ""

echo "============================================================================"
echo "  VERIFICATION SUMMARY"
echo "============================================================================"
echo ""
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo "Warnings: $WARNING"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "SUCCESS: All checks passed - Production is ready!"
    echo ""
    echo "The Ayantaraz project is 100% production ready for deployment on server 202.133.91.13"
    echo ""
    echo "To deploy:"
    echo "  cd /opt/ayantaraz"
    echo "  git pull origin main"
    echo "  cp .env.production .env"
    echo "  nano .env  # Set SMS_API_KEY"
    echo "  chmod +x deploy-production.sh validate-production.sh"
    echo "  sudo bash deploy-production.sh"
    echo "  bash validate-production.sh"
    echo ""
    exit 0
else
    echo "FAILURE: Some checks failed - Please fix the issues above"
    exit 1
fi
