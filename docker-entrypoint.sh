#!/bin/sh
set -e

echo "=== Carelim OS Starting ==="
echo "Node: $(node --version)"
echo "Environment: ${NODE_ENV:-development}"

# Wait for database to be ready
echo "Waiting for database connection..."
MAX_RETRIES=30
RETRY_COUNT=0
until /app/node_modules/.bin/prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1 || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "  Database not ready (attempt $RETRY_COUNT/$MAX_RETRIES)..."
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "ERROR: Database not reachable after $MAX_RETRIES attempts"
  exit 1
fi

echo "Database connected. Running migrations..."

# Apply pending migrations (idempotent, safe for existing data)
# Uses prisma.config.ts (Prisma 7+) — no --schema flag needed
if [ -f /app/node_modules/.bin/prisma ]; then
  /app/node_modules/.bin/prisma migrate deploy 2>&1
else
  npx prisma migrate deploy 2>&1
fi

echo "Migrations complete."

# Verify Prisma client is available
if [ ! -d /app/node_modules/.prisma/client ]; then
  echo "WARNING: Prisma client not found, regenerating..."
  /app/node_modules/.bin/prisma generate 2>&1 || npx prisma generate 2>&1
fi

echo "Starting application server..."
exec node server.js
