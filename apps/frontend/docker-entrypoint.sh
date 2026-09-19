#!/bin/sh
set -e

echo "Syncing database schema..."
node scripts/schema-sync.js 2>&1 || echo "Schema sync skipped"

# Tell instrumentation.ts the sync already ran (fallback path skips)
export SCHEMA_SYNC_DONE=1

echo "Starting application..."
exec node server.js
