#!/bin/sh
set -e

echo "Syncing database schema..."
node scripts/schema-sync.js 2>&1 || echo "Schema sync skipped"

# Tell instrumentation.ts the sync already ran (fallback path skips)
export SCHEMA_SYNC_DONE=1

# Verify the Express backend is reachable — all /api/* traffic is proxied to it
if [ -n "$INTERNAL_API_URL" ]; then
  if wget -qO- --timeout=5 "$INTERNAL_API_URL/api/health" >/dev/null 2>&1; then
    echo "✓ Backend API reachable at $INTERNAL_API_URL"
  else
    echo "⚠ WARNING: Backend API NOT reachable at $INTERNAL_API_URL — every /api/* call will fail."
    echo "  INTERNAL_API_URL must be the Express backend container's DNS name and port,"
    echo "  e.g. http://<backend-app-name>:3010 (verify with: wget -qO- $INTERNAL_API_URL/api/health)"
  fi
else
  echo "⚠ INTERNAL_API_URL is not set — the /api/* proxy falls back to http://localhost:4000 (fails in production)."
fi

echo "Starting application..."
exec node server.js
