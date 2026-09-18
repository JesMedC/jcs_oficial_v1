#!/usr/bin/env bash
# Launch mock + vite, wait for both, print status.
set -e
cd /home/jesusmedina/proyectos/jcs_oficial

# Kill any leftovers.
pkill -f "jarvis-mock-server" 2>/dev/null || true
pkill -f "vite.*5174" 2>/dev/null || true
sleep 1

# Mock server.
nohup node scripts/jarvis-mock-server.mjs > /tmp/mock-server.log 2>&1 &
MOCK_PID=$!
echo "mock PID: $MOCK_PID"

# Vite dev with env. Both the axios baseURL (VITE_API_BASE_URL) AND
# the browser-fetch proxy (JARVIS_DEV_PROXY) point at the local mock
# so the SPA can talk to /api/v1/* whether it's an axios call OR a
# fetch('/api/v1/...') relative-URL call.
nohup env VITE_API_BASE_URL=http://localhost:8001/api/v1 JARVIS_DEV_PROXY=http://localhost:8001 pnpm dev --host 0.0.0.0 --port 5174 > /tmp/vite-jarvis.log 2>&1 &
VITE_PID=$!
echo "vite PID: $VITE_PID"

# Wait for both.
for i in 1 2 3 4 5 6 7 8 9 10; do
  MOCK_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/v1/auth/me || echo 000)
  VITE_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5174/ || echo 000)
  echo "[$i] mock=$MOCK_OK vite=$VITE_OK"
  if [ "$MOCK_OK" = "200" ] && [ "$VITE_OK" = "200" ]; then
    echo "READY"
    exit 0
  fi
  sleep 1
done

echo "TIMEOUT — see logs"
echo "--- mock ---"
tail -10 /tmp/mock-server.log
echo "--- vite ---"
tail -10 /tmp/vite-jarvis.log
exit 1
