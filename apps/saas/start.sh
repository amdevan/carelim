#!/bin/sh
set -e

echo "Syncing database schema..."

# Run migration script
node -e "
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
async function migrate() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const columns = [
    'ALTER TABLE \"Tenant\" ADD COLUMN IF NOT EXISTS \"logoUrl\" TEXT;',
  ];
  for (const sql of columns) {
    try { await prisma.\$executeRawUnsafe(sql); } catch(e) {}
  }
  await prisma.\$disconnect();
  console.log('Schema sync complete');
}
migrate().catch(e => console.log('Schema sync skipped:', e.message));
" 2>/dev/null || echo "Schema sync skipped"

echo "Starting server..."
exec node server.js
