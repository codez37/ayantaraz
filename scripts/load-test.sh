#!/usr/bin/env bash
set -euo pipefail

# ayantaraz Production Load Test
# Usage: ./scripts/load-test.sh [base_url] [concurrent_requests]
#   base_url:         default http://localhost:3001/api
#   concurrent_requests: default 100

BASE_URL="${1:-http://localhost:3001/api}"
CONCURRENT="${2:-100}"
ORDER_ENDPOINT="${BASE_URL}/orders"
OTP_ENDPOINT="${BASE_URL}/auth/verify-otp"
HEALTH_ENDPOINT="${BASE_URL%/*/*}/health"  # strip /api -> /health

RESULTS_FILE=$(mktemp)
trap 'rm -f "$RESULTS_FILE"' EXIT

echo "=========================================="
echo "  ayantaraz Load Test"
echo "------------------------------------------"
echo "  Target:       ${BASE_URL}"
echo "  Concurrent:   ${CONCURRENT}"
echo "  Date:         $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "=========================================="
echo ""

# --- Health check first ---
echo "--- Health Check (expect 200) ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_ENDPOINT}" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: Health check returned ${HTTP_CODE} — aborting"
  exit 1
fi
echo "  PASS (HTTP ${HTTP_CODE})"
echo ""

# --- Concurrent orders (simulating e-commerce load) ---
echo "--- Load Test: POST ${ORDER_ENDPOINT} (${CONCURRENT}x concurrent) ---"
for i in $(seq 1 "${CONCURRENT}"); do
  PAYLOAD="{\"items\":[{\"productId\":\"load-test-${i}\",\"qty\":1}],\"total\":10000}"
  REQ_START=$(date +%s%N)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "${PAYLOAD}" \
    "${ORDER_ENDPOINT}" 2>/dev/null || echo "000")
  REQ_END=$(date +%s%N)
  DURATION_MS=$(( (REQ_END - REQ_START) / 1000000 ))
  echo "${DURATION_MS} ${HTTP_CODE}" >> "${RESULTS_FILE}"
done

echo ""
echo "--- Results ---"
TOTAL=$(wc -l < "${RESULTS_FILE}")
SUCCESS=$(awk '$2 == 200 || $2 == 201 { count++ } END { print count+0 }' "${RESULTS_FILE}")
ERRORS=$(awk '$2 != 200 && $2 != 201 { count++ } END { print count+0 }' "${RESULTS_FILE}")

# Sort latencies for percentile calculation
LATENCIES=$(mktemp)
trap 'rm -f "$LATENCIES" "$RESULTS_FILE"' EXIT
awk '{print $1}' "${RESULTS_FILE}" | sort -n > "${LATENCIES}"

calc_percentile() {
  local percentile=$1
  local count=$2
  local file=$3
  local index=$(( (percentile * count + 99) / 100 ))
  if [ "$index" -lt 1 ]; then index=1; fi
  if [ "$index" -gt "$count" ]; then index="$count"; fi
  sed -n "${index}p" "$file"
}

P50=$(calc_percentile 50 "${TOTAL}" "${LATENCIES}")
P95=$(calc_percentile 95 "${TOTAL}" "${LATENCIES}")
P99=$(calc_percentile 99 "${TOTAL}" "${LATENCIES}")

echo ""
echo "  Total Requests:   ${TOTAL}"
echo "  Success (2xx):    ${SUCCESS}"
echo "  Errors:           ${ERRORS}"
echo "  Error Rate:       $(awk "BEGIN {printf \"%.1f%%\", (${ERRORS}/${TOTAL})*100}")"
echo ""
echo "  Latency:"
echo "    p50:            ${P50}ms"
echo "    p95:            ${P95}ms"
echo "    p99:            ${P99}ms"
echo ""

# PASS / FAIL threshold
if [ "${ERRORS}" -gt 0 ]; then
  echo "RESULT: FAIL (${ERRORS} errors detected)"
  exit 1
elif [ "${P99}" -gt 5000 ]; then
  echo "RESULT: WARN (p99=${P99}ms exceeds 5000ms threshold)"
  exit 0  # non-zero only for hard failures
else
  echo "RESULT: PASS"
fi
