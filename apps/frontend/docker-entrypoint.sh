#!/bin/sh
set -e

echo "Running database migrations..."
prisma db push --accept-data-loss 2>&1 || echo "Warning: prisma db push failed (database may not be reachable)"

echo "Starting application..."
exec node server.js
