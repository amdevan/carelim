#!/bin/sh
set -e

echo "Syncing database schema..."

# Add missing tables/columns
node -e "
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
async function migrate() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const statements = [
    'CREATE TABLE IF NOT EXISTS \"BookingLink\" (\"id\" TEXT NOT NULL, \"tenantId\" TEXT, \"branchId\" TEXT, \"configId\" TEXT, \"doctorId\" TEXT, \"doctorName\" TEXT, \"department\" TEXT, \"label\" TEXT, \"url\" TEXT NOT NULL, \"slug\" TEXT NOT NULL, \"active\" BOOLEAN NOT NULL DEFAULT true, \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT \"BookingLink_pkey\" PRIMARY KEY (\"id\"));',
    'CREATE UNIQUE INDEX IF NOT EXISTS \"BookingLink_slug_key\" ON \"BookingLink\"(\"slug\");',
    'CREATE UNIQUE INDEX IF NOT EXISTS \"BookingLink_tenantId_slug_key\" ON \"BookingLink\"(\"tenantId\", \"slug\");',
    'CREATE TABLE IF NOT EXISTS \"BookingConfig\" (\"id\" TEXT NOT NULL, \"tenantId\" TEXT NOT NULL, \"slotDuration\" INTEGER NOT NULL DEFAULT 30, \"maxBookingsPerSlot\" INTEGER NOT NULL DEFAULT 5, \"allowWalkIn\" BOOLEAN NOT NULL DEFAULT true, \"requirePhone\" BOOLEAN NOT NULL DEFAULT false, \"enableWaitlist\" BOOLEAN NOT NULL DEFAULT false, \"workingHours\" JSONB, \"holidays\" JSONB, \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT \"BookingConfig_pkey\" PRIMARY KEY (\"id\"));',
    'CREATE UNIQUE INDEX IF NOT EXISTS \"BookingConfig_tenantId_key\" ON \"BookingConfig\"(\"tenantId\");',
    'ALTER TABLE \"Staff\" ADD COLUMN IF NOT EXISTS \"password\" TEXT DEFAULT \'medcore123\';',
    'ALTER TABLE \"Tenant\" ADD COLUMN IF NOT EXISTS \"logoUrl\" TEXT;',
  ];
  for (const sql of statements) {
    try { await prisma.\$executeRawUnsafe(sql); } catch(e) {}
  }
  await prisma.\$disconnect();
  console.log('Schema sync complete');
}
migrate().catch(e => console.log('Schema sync skipped:', e.message));
" 2>/dev/null || echo "Schema sync skipped"

echo "Starting application..."
exec node server.js
