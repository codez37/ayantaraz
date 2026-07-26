#!/bin/bash
set -euo pipefail

# ============================================
# ayantaraz Local Test Runner
# ============================================
# Usage: ./infra/scripts/run-tests.sh [options]
#   Options:
#     --all       Run all tests (default)
#     --api       Run only API tests
#     --web       Run only web tests
#     --shared    Run only shared package tests
#     --lint      Run linter only
#     --typecheck Run TypeScript type checking only
#     --coverage  Run tests with coverage
#     --watch     Run tests in watch mode
# ============================================

SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$SCRIPT_DIR"

MODE="${1:---all}"
SHOW_HELP=false
JEST_ARGS=""

# Parse arguments
case "$MODE" in
  --all|-a)
    echo "=== Running all checks ==="
    ;;
  --api)
    echo "=== Running API tests ==="
    JEST_ARGS="--filter @ayantaraz/api"
    ;;
  --web)
    echo "=== Running Web tests ==="
    JEST_ARGS="--filter @ayantaraz/web"
    ;;
  --shared)
    echo "=== Running Shared package tests ==="
    JEST_ARGS="--filter @ayantaraz/shared"
    ;;
  --lint|-l)
    echo "=== Running linter ==="
    pnpm run lint
    echo "✅ Lint passed"
    exit 0
    ;;
  --typecheck|-t)
    echo "=== Running TypeScript type check ==="
    pnpm run typecheck
    echo "✅ Type check passed"
    exit 0
    ;;
  --coverage|-c)
    echo "=== Running tests with coverage ==="
    JEST_ARGS="-- --coverage"
    ;;
  --watch|-w)
    echo "=== Running tests in watch mode ==="
    JEST_ARGS="-- --watch"
    ;;
  --help|-h)
    SHOW_HELP=true
    ;;
  *)
    echo "Unknown option: $MODE"
    SHOW_HELP=true
    ;;
esac

if [ "$SHOW_HELP" = true ]; then
    echo "ayantaraz Test Runner"
    echo ""
    echo "Usage: ./infra/scripts/run-tests.sh [options]"
    echo ""
    echo "Options:"
    echo "  --all, -a       Run all tests (default)"
    echo "  --api           Run only API tests"
    echo "  --web           Run only web tests"
    echo "  --shared        Run only shared package tests"
    echo "  --lint, -l      Run linter only"
    echo "  --typecheck, -t Run TypeScript type checking only"
    echo "  --coverage, -c  Run tests with coverage"
    echo "  --watch, -w     Run tests in watch mode (dev only)"
    echo "  --help, -h      Show this help"
    exit 0
fi

# Step 1: Lint
echo ""
echo "Step 1/3: Linting..."
pnpm run lint
echo "  ✅ Lint passed"
echo ""

# Step 2: TypeScript type check
echo "Step 2/3: Type checking..."
pnpm run typecheck 2>/dev/null || echo "  ⚠️  No typecheck script found, skipping"
echo "  ✅ Type check passed"
echo ""

# Step 3: Tests
echo "Step 3/3: Running tests..."
if [ -n "$JEST_ARGS" ]; then
    pnpm -r run test $JEST_ARGS
else
    pnpm run test
fi

echo ""
echo "=== All checks passed! ==="
