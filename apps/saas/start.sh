#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma || echo "Migration failed or already up to date"

echo "Starting server..."
exec node server.js
