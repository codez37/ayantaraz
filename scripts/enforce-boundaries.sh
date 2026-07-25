#!/bin/bash
# Package Boundary Enforcement
# Ensures no source imports across packages in runtime
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

FAIL=0

echo "=== Package Boundary Enforcement ==="
echo ""

# ── 1. Check for source imports in dist ──
echo "--- Source Import Check ---"

# shared/dist should NOT import from apps/
if grep -r "require.*apps/" packages/shared/dist --include='*.js' 2>/dev/null; then
  echo -e "${RED}✗ shared/dist imports from apps/ — VIOLATION${NC}"
  ((FAIL++))
else
  echo -e "${GREEN}✓ shared/dist has no apps/ imports${NC}"
fi

# api/dist should NOT import from other apps/
if grep -r "require.*apps/" apps/api/dist --include='*.js' 2>/dev/null; then
  echo -e "${RED}✗ api/dist imports from other apps/ — VIOLATION${NC}"
  ((FAIL++))
else
  echo -e "${GREEN}✓ api/dist has no cross-app imports${NC}"
fi

# ── 2. Check for TypeScript source files in dist ──
echo ""
echo "--- TypeScript Source Check ---"

for dir in packages/shared/dist apps/api/dist; do
  if [ -d "$dir" ]; then
    ts_count=$(find "$dir" -name "*.ts" ! -name "*.d.ts" 2>/dev/null | wc -l)
    if [ "$ts_count" -gt 0 ]; then
      echo -e "${RED}✗ $dir contains $ts_count .ts files — VIOLATION${NC}"
      ((FAIL++))
    else
      echo -e "${GREEN}✓ $dir has no .ts files${NC}"
    fi
  fi
done

# ── 3. Check for test files in dist ──
echo ""
echo "--- Test File Check ---"

for dir in packages/shared/dist apps/api/dist; do
  if [ -d "$dir" ]; then
    test_count=$(find "$dir" -name "*.spec.js" -o -name "*.test.js" 2>/dev/null | wc -l)
    if [ "$test_count" -gt 0 ]; then
      echo -e "${RED}✗ $dir contains $test_count test files — VIOLATION${NC}"
      ((FAIL++))
    else
      echo -e "${GREEN}✓ $dir has no test files${NC}"
    fi
  fi
done

# ── 4. Check for node_modules in dist ──
echo ""
echo "--- node_modules Check ---"

for dir in packages/shared/dist apps/api/dist; do
  if [ -d "$dir/node_modules" ]; then
    echo -e "${RED}✗ $dir/node_modules exists — VIOLATION${NC}"
    ((FAIL++))
  else
    echo -e "${GREEN}✓ $dir has no node_modules${NC}"
  fi
done

# ── 5. Check package.json main/types point to dist ──
echo ""
echo "--- Package Contract Check ---"

for pkg in packages/shared; do
  main=$(node -e "console.log(require('./$pkg/package.json').main || '')")
  types=$(node -e "console.log(require('./$pkg/package.json').types || '')")

  if [[ "$main" == *"dist"* ]]; then
    echo -e "${GREEN}✓ $pkg main points to dist: $main${NC}"
  else
    echo -e "${RED}✗ $pkg main does NOT point to dist: $main — VIOLATION${NC}"
    ((FAIL++))
  fi

  if [[ "$types" == *"dist"* ]]; then
    echo -e "${GREEN}✓ $pkg types points to dist: $types${NC}"
  else
    echo -e "${RED}✗ $pkg types does NOT point to dist: $types — VIOLATION${NC}"
    ((FAIL++))
  fi
done

echo ""
echo "=== Results ==="
if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}BOUNDARY VIOLATIONS: $FAIL${NC}"
  exit 1
fi
echo -e "${GREEN}ALL BOUNDARIES ENFORCED${NC}"
exit 0
