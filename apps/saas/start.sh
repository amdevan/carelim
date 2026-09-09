#!/bin/sh
set -e

echo "Syncing database schema with Prisma..."
npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss || echo "Schema sync skipped"

echo "Starting server..."
exec node server.js
