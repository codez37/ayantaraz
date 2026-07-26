#!/bin/sh
cd /opt/ayantaraz
while true; do
  clear
  echo "=== ayantaraz Production Monitor ==="
  echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  echo "--- Container Status ---"
  docker compose ps
  echo ""
  echo "--- Last 10 API Logs ---"
  docker compose logs --tail=10 api 2>/dev/null
  echo ""
  echo "--- Last 5 Nginx Logs ---"
  docker compose logs --tail=5 nginx 2>/dev/null
  sleep 10
done
