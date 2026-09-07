#!/bin/sh
set -e

echo "Running database migrations..."

# Use prisma.config.ts (Prisma 7+) — no --schema flag needed
if [ -f /app/node_modules/.bin/prisma ]; then
  /app/node_modules/.bin/prisma db push --accept-data-loss 2>&1 || echo "Warning: prisma db push failed (database may not be reachable)"
else
  npx prisma db push --accept-data-loss 2>&1 || echo "Warning: prisma db push failed (database may not be reachable)"
fi

echo "Starting application..."
exec node server.js
