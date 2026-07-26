#!/usr/bin/env bash
# ============================================
# ayantaraz — Rollback (trace-correlated, WAL)
# ============================================
set -euo pipefail

SERVER_IP="202.133.91.13"
SERVER_USER="ayan"
FORCE=false
[ "${1:-}" = "--force" ] && FORCE=true

TRACE_ID="rollback_$(date -u +%Y%m%d%H%M%S)_$(head -c 4 /dev/urandom | od -An -tx1 | tr -d ' ' 2>/dev/null || echo "x")"
remote() { ssh "${SERVER_USER}@${SERVER_IP}" "TRACE_ID=${TRACE_ID} $*"; }

echo "Rollback (trace: ${TRACE_ID})..."

if ! remote "sudo ayan-deploy lock" 2>/dev/null; then
  if $FORCE; then remote "sudo ayan-deploy lock-recover"; remote "sudo ayan-deploy lock"; else echo "❌ In progress (--force)"; exit 1; fi
fi

remote "sudo ayan-deploy rollback"
sleep 5
if remote "sudo ayan-deploy health" 2>/dev/null; then remote "sudo ayan-deploy pass" 2>/dev/null || true; echo "✅ Rollback complete!"; else echo "⚠️  Health failed"; fi

remote "sudo ayan-deploy consistency" 2>/dev/null || true
remote "rm -rf /var/lock/ayan-deploy/deploy.lock"
echo "   Trace: ${TRACE_ID}"
remote "sudo ayan-deploy events 10" 2>/dev/null || true
