#!/bin/bash

# Pre-Deployment Check Script for ayantaraz
# Ensures all conditions are met before production deployment

set -e

echo "=========================================="
echo "ayantaraz Pre-Deployment Verification"
echo "=========================================="

# Function to print error
error() {
    echo "[ERROR] $1"
    exit 1
}

# Function to print warning
warning() {
    echo "[WARNING] $1"
}

# Function to print success
success() {
    echo "[OK] $1"
}

# 1. Check if we are on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    error "Deployment must be from main branch. Current branch: $CURRENT_BRANCH"
fi
success "Running from main branch"

# 2. Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    error "Uncommitted changes detected. Please commit all changes before deployment."
fi
success "No uncommitted changes"

# 3. Check for tag
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null)
if [ -z "$LATEST_TAG" ]; then
    warning "No tags found. Consider creating a release tag with: git tag -a v1.0.0 -m Initial production release"
else
    success "Latest tag: $LATEST_TAG"
fi

# 4. Run lint
echo ""
echo "Running ESLint..."
pnpm lint
success "Linting passed"

# 5. Run typecheck
echo ""
echo "Running TypeScript type check..."
pnpm typecheck
success "Type checking passed"

# 6. Run tests
echo ""
echo "Running tests..."
pnpm test
success "All tests passed"

# 7. Check build
echo ""
echo "Building application..."
pnpm build
success "Build successful"

# 8. Verify Docker configuration
echo ""
echo "Verifying Docker configuration..."
if [ ! -f "docker-compose.yml" ]; then
    error "docker-compose.yml not found"
fi
if [ ! -f "docker-compose.prod.yml" ]; then
    error "docker-compose.prod.yml not found"
fi
success "Docker configuration files exist"

# 9. Check environment variables
echo ""
echo "Checking environment variables..."
if [ ! -f ".env" ]; then
    warning ".env file not found. Please ensure environment variables are configured."
else
    success ".env file exists"
fi

# 10. Verify Prisma configuration
echo ""
echo "Verifying Prisma configuration..."
if [ ! -f "prisma/schema.prisma" ]; then
    error "Prisma schema file not found"
fi
success "Prisma schema exists"

# 11. Check Dockerfiles
echo ""
echo "Checking Dockerfiles..."
if [ ! -f "apps/api/Dockerfile" ]; then
    error "API Dockerfile not found"
fi
success "API Dockerfile exists"

# 12. Check required directories
echo ""
echo "Checking required directories..."
for dir in ".github/workflows" "apps/api" "apps/web" "prisma"; do
    if [ ! -d "$dir" ]; then
        error "Required directory $dir not found"
    fi
done
success "All required directories exist"

echo ""
echo "=========================================="
echo "All pre-deployment checks passed!"
echo "You can now proceed with deployment."
echo "=========================================="
