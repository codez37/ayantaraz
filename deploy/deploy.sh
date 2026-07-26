#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$(dirname "$0")")" && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()  { echo -e "${GREEN}✓${NC} $1"; }
warn(){ echo -e "${YELLOW}⚠${NC} $1"; }
fail(){ echo -e "${RED}✗${NC} $1"; exit 1; }

# ========== 1. Validate .env ==========
echo "=== ayantaraz Deploy ==="
echo ""

[ -f .env ] || fail ".env not found — create from .env.example"

while IFS='=' read -r key val; do
  case "$key" in
    SERVER_IP) SERVER_IP="$val" ;;
    SMS_API_KEY) SMS_API_KEY="$val" ;;
    ADMIN_PHONE) ADMIN_PHONE="$val" ;;
    POSTGRES_PASSWORD) POSTGRES_PASSWORD="$val" ;;
    REDIS_PASSWORD) REDIS_PASSWORD="$val" ;;
    JWT_SECRET) JWT_SECRET="$val" ;;
    JWT_REFRESH_SECRET) JWT_REFRESH_SECRET="$val" ;;
  esac
done < .env

[ -z "${SERVER_IP:-}" ] && fail "SERVER_IP missing in .env"
[ "$SERVER_IP" = "change_me_to_your_server_ip" ] && fail "Set SERVER_IP in .env"
ok "SERVER_IP = ${SERVER_IP}"

# ========== 2. Auto-generate secrets ==========
GEN=false
gen_secret(){ openssl rand -base64 32 | tr -d '/+=' | cut -c1-32; }

[ -z "${POSTGRES_PASSWORD:-}" ] && { POSTGRES_PASSWORD=$(gen_secret); GEN=true; ok "POSTGRES_PASSWORD generated"; }
[ -z "${REDIS_PASSWORD:-}" ] && { REDIS_PASSWORD=$(gen_secret); GEN=true; ok "REDIS_PASSWORD generated"; }
[ -z "${JWT_SECRET:-}" ] && { JWT_SECRET=$(gen_secret); GEN=true; ok "JWT_SECRET generated"; }
[ -z "${JWT_REFRESH_SECRET:-}" ] && { JWT_REFRESH_SECRET=$(gen_secret); GEN=true; ok "JWT_REFRESH_SECRET generated"; }

DATABASE_URL="postgresql://ayantaraz:${POSTGRES_PASSWORD}@postgres:5432/ayantaraz?schema=public"
REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379"
CORS_ORIGINS="http://${SERVER_IP}"
NEXT_PUBLIC_API_URL="http://${SERVER_IP}/api"

# ========== 3. Ensure .env exists (required for deployment) ==========
if [ ! -f .env ]; then
  fail ".env does not exist. Copy .env.example to .env first."
fi
ok ".env exists"

# ========== 4. Check prerequisites ==========
echo ""
echo "--- Prerequisites ---"
command -v docker >/dev/null 2>&1 || fail "Docker not found"
docker info >/dev/null 2>&1 || fail "Docker daemon not running"
ok "Docker ready"
[ -d prisma/migrations ] || fail "prisma/migrations/ not found"

# ========== 5. Start postgres + redis ==========
echo ""
echo "--- Starting Database & Redis ---"
if docker compose up -d postgres redis; then
  ok "Databases started"
else
  fail "Failed to start databases"
fi

echo ""
echo "--- Waiting for postgres ---"
POSTGRES_READY=false
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U ayantaraz -d ayantaraz >/dev/null 2>&1; then
    ok "Postgres ready"
    POSTGRES_READY=true
    break
  fi
  if [ "$i" -eq 30 ]; then
    docker compose logs --tail=20 postgres > >(sed 's/^/  /') 2>/dev/null || true
    fail "Postgres did not become ready"
  fi
  echo -n "."
  sleep 2
done
echo ""

echo "--- Waiting for redis ---"
REDIS_READY=false
for i in $(seq 1 15); do
  if docker compose exec -T redis redis-cli -a "${REDIS_PASSWORD}" ping 2>/dev/null | grep -q PONG; then
    ok "Redis ready"
    REDIS_READY=true
    break
  fi
  if [ "$i" -eq 15 ]; then
    docker compose logs --tail=10 redis > >(sed 's/^/  /') 2>/dev/null || true
    warn "Redis not ready — continuing"
  fi
  echo -n "."
  sleep 2
done
echo ""

# ========== 6. Run migrations (pin prisma@5 to avoid v7 breaking) ==========
echo ""
echo "--- Database Migrations ---"
if docker run --rm \
  -v "${ROOT_DIR}/prisma:/prisma:ro" \
  --network ayantaraz-network \
  -e DATABASE_URL="${DATABASE_URL}" \
  node:22-bookworm \
  sh -c "
    npm i -g prisma@5.22.0 --silent 2>/dev/null
    npx prisma migrate deploy --schema=/prisma/schema.prisma
  "; then
  ok "Migrations complete"
else
  docker compose logs --tail=20 postgres > >(sed 's/^/  /') 2>/dev/null || true
  fail "Migration failed"
fi

# ========== 7. Seed admin users (via psql inside postgres container) ==========
echo ""
echo "--- Create Admin Users ---"
ADMIN_PHONES="${ADMIN_PHONE:-09120000000}"
IFS=',' read -ra PHONES <<< "$ADMIN_PHONES"
for phone in "${PHONES[@]}"; do
  phone="$(echo "$phone" | xargs)"
  docker compose exec -T postgres psql -U ayantaraz -d ayantaraz -c "
INSERT INTO \"User\" (phone, first_name, last_name, role, is_active, created_at, updated_at)
SELECT '${phone}', 'مدیر', 'سیستم', 'admin', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM \"User\" WHERE phone = '${phone}');
" 2>&1 | sed 's/^/  /' && ok "Admin user: ${phone}"
done

# ========== 8. Build and start all services ==========
echo ""
echo "--- Building & Starting Services ---"
docker compose up -d --build api web nginx 2>&1 | sed 's/^/  /'

# ========== 9. Wait for health ==========
echo ""
echo "--- Health Check ---"
for i in $(seq 1 30); do
  HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null || echo "000")
  if [ "$HEALTH" = "200" ]; then
    ok "All services healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo ""
    warn "Health check timeout — container status:"
    docker compose ps 2>/dev/null | sed 's/^/  /' || true
    echo ""
    warn "Last 30 lines from API:"
    docker compose logs --tail=30 api 2>/dev/null | sed 's/^/  [api] /' || true
    fail "Deploy failed"
  fi
  echo -n "."
  sleep 3
done
echo ""

# ========== 10. Done ==========
echo ""
echo -e "${GREEN}=== Deploy Complete ===${NC}"
echo "  URL:      http://${SERVER_IP}"
echo "  API:      http://${SERVER_IP}/api"
echo "  Health:   http://${SERVER_IP}/health"
echo "  Admin:    ${ADMIN_PHONE:-09120000000}"
echo ""
[ "${SMS_API_KEY:-}" = "change_me_to_your_sms_api_key" ] && warn "Set SMS_API_KEY in .env for OTP to work"
ok "System is live"
