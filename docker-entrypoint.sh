#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma db push --skip-generate 2>&1 || echo "Warning: prisma db push failed (database may not be ready yet)"

echo "Starting application..."
exec node server.js
