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
    'CREATE TABLE IF NOT EXISTS \"AuditLog\" (\"id\" TEXT NOT NULL, \"tenantId\" TEXT, \"user\" TEXT NOT NULL, \"action\" TEXT NOT NULL, \"module\" TEXT NOT NULL, \"detail\" TEXT, \"ip\" TEXT, \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT \"AuditLog_pkey\" PRIMARY KEY (\"id\"));',
    'CREATE INDEX IF NOT EXISTS \"AuditLog_tenantId_idx\" ON \"AuditLog\"(\"tenantId\");',
    'CREATE TABLE IF NOT EXISTS \"StaffBranch\" (\"id\" TEXT NOT NULL, \"staffId\" TEXT NOT NULL, \"branchId\" TEXT NOT NULL, \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT \"StaffBranch_pkey\" PRIMARY KEY (\"id\"));',
    'CREATE UNIQUE INDEX IF NOT EXISTS \"StaffBranch_staffId_branchId_key\" ON \"StaffBranch\"(\"staffId\", \"branchId\");',
    'CREATE TABLE IF NOT EXISTS \"Role\" (\"id\" TEXT NOT NULL, \"name\" TEXT NOT NULL, \"description\" TEXT, \"isSystem\" BOOLEAN NOT NULL DEFAULT false, \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT \"Role_pkey\" PRIMARY KEY (\"id\"));',
    'CREATE UNIQUE INDEX IF NOT EXISTS \"Role_name_key\" ON \"Role\"(\"name\");',
    'CREATE TABLE IF NOT EXISTS \"Permission\" (\"id\" TEXT NOT NULL, \"module\" TEXT NOT NULL, \"action\" TEXT NOT NULL, \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT \"Permission_pkey\" PRIMARY KEY (\"id\"));',
    'CREATE TABLE IF NOT EXISTS \"RolePermission\" (\"roleId\" TEXT NOT NULL, \"permissionId\" TEXT NOT NULL, CONSTRAINT \"RolePermission_pkey\" PRIMARY KEY (\"roleId\",\"permissionId\"));',
    'DO $$ BEGIN ALTER TABLE \"RolePermission\" ADD CONSTRAINT \"RolePermission_roleId_fkey\" FOREIGN KEY (\"roleId\") REFERENCES \"Role\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;',
    'DO $$ BEGIN ALTER TABLE \"RolePermission\" ADD CONSTRAINT \"RolePermission_permissionId_fkey\" FOREIGN KEY (\"permissionId\") REFERENCES \"Permission\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;',
    'DO $$ BEGIN ALTER TABLE \"User\" ADD CONSTRAINT \"User_roleId_fkey\" FOREIGN KEY (\"roleId\") REFERENCES \"Role\"(\"id\") ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;',
    'ALTER TABLE \"Staff\" ADD COLUMN IF NOT EXISTS \"lastLogin\" TIMESTAMP(3);',
    'ALTER TABLE \"User\" ADD COLUMN IF NOT EXISTS \"lastLogin\" TIMESTAMP(3);',
    'ALTER TABLE \"Staff\" ADD COLUMN IF NOT EXISTS \"status\" TEXT DEFAULT \'active\';',
    'ALTER TABLE \"User\" ADD COLUMN IF NOT EXISTS \"status\" TEXT DEFAULT \'active\';',
    'CREATE TABLE IF NOT EXISTS \"Organization\" (\"id\" TEXT NOT NULL, \"tenantId\" TEXT, \"name\" TEXT NOT NULL, \"clinicType\" TEXT NOT NULL DEFAULT \'General\', \"registrationNo\" TEXT, \"panVatNo\" TEXT, \"country\" TEXT, \"stateProvince\" TEXT, \"city\" TEXT, \"fullAddress\" TEXT, \"googleMapUrl\" TEXT, \"logoUrl\" TEXT, \"clinicId\" TEXT NOT NULL, \"subdomain\" TEXT NOT NULL, \"adminUserId\" TEXT, \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT \"Organization_pkey\" PRIMARY KEY (\"id\"));',
    'CREATE UNIQUE INDEX IF NOT EXISTS \"Organization_clinicId_key\" ON \"Organization\"(\"clinicId\");',
    'CREATE UNIQUE INDEX IF NOT EXISTS \"Organization_subdomain_key\" ON \"Organization\"(\"subdomain\");',
    'CREATE TABLE IF NOT EXISTS \"ClinicSettings\" (\"id\" TEXT NOT NULL, \"tenantId\" TEXT, \"clinicName\" TEXT, \"clinicEmail\" TEXT, \"clinicPhone\" TEXT, \"clinicWebsite\" TEXT, \"clinicLogo\" TEXT, \"address\" TEXT, \"city\" TEXT, \"state\" TEXT, \"country\" TEXT DEFAULT \'Nepal\', \"zipCode\" TEXT, \"timezone\" TEXT DEFAULT \'Asia/Kathmandu\', \"currency\" TEXT DEFAULT \'NPR\', \"currencySymbol\" TEXT DEFAULT \'रू\', \"primaryColor\" TEXT, \"logo\" TEXT, \"taxRate\" DOUBLE PRECISION DEFAULT 0, \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT \"ClinicSettings_pkey\" PRIMARY KEY (\"id\"));',
    'CREATE UNIQUE INDEX IF NOT EXISTS \"ClinicSettings_tenantId_key\" ON \"ClinicSettings\"(\"tenantId\");',
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
