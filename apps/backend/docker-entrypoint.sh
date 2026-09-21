#!/bin/sh
set -e

# Sync database schema at boot (same script the frontend runs).
# Fixes P2021 ("table does not exist") when the backend points at a fresh
# or drifted database — the sync is additive and idempotent.
echo "Syncing database schema (backend)..."
node scripts/schema-sync.js 2>&1 || echo "Schema sync skipped"

echo "Starting backend..."
exec node dist/server.js
