#!/bin/sh
set -e

echo "Running database migrations..."
node /app/node_modules/prisma/build/index.js db push --skip-generate 2>&1 || echo "Warning: prisma db push failed"

echo "Starting application..."
exec node server.js
