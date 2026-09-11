#!/bin/sh
set -e

echo "Syncing database schema..."

node -e "
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    let ok = 0, fail = 0;

    async function run(sql, label) {
      try {
        await client.query(sql);
        ok++;
      } catch(e) {
        fail++;
        if (!e.message.includes('already exists') && !e.message.includes('does not exist') && !e.message.includes('cannot drop')) {
          console.error('FAIL:', label || sql.substring(0, 60), '->', e.message.substring(0, 120));
        }
      }
    }

    // Parse Prisma schema to find models with tenantId and branchId
    let schema = '';
    try {
      schema = fs.readFileSync('/app/prisma/schema.prisma', 'utf8');
    } catch {
      try {
        schema = fs.readFileSync(path.join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
      } catch {
        console.log('Could not read schema.prisma, using hardcoded lists');
      }
    }

    const modelsWithTenantId = new Set();
    const modelsWithBranchId = new Set();

    if (schema) {
      // Parse model blocks
      const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
      let match;
      while ((match = modelRegex.exec(schema)) !== null) {
        const modelName = match[1];
        const body = match[2];
        if (body.includes('tenantId')) modelsWithTenantId.add(modelName);
        if (body.includes('branchId')) modelsWithBranchId.add(modelName);
      }
      console.log('Parsed schema: ' + modelsWithTenantId.size + ' models need tenantId, ' + modelsWithBranchId.size + ' need branchId');
    }

    // Fallback: hardcoded list if schema parsing failed
    if (modelsWithTenantId.size === 0) {
      ['Patient','Doctor','Appointment','Prescription','Medicine','PharmacySale','Invoice',
       'LabTest','LabOrder','LabTestMaster','LabResult','LabSample','LabPackage','LabDepartment',
       'LabQualityControl','LabEquipment','LabInventory','LabSupplier',
       'RadiologyStudy','RadiologyTest','RadiologyModality','RadiologyEquipment','RadiologyTemplate','RadiologyAlert','RadiologySchedule',
       'Expense','PatientPayment','ClinicalNote','Staff','Department','Supplier','Setting',
       'AuditLog','Account','JournalEntry','CashTransaction','BankTransaction',
       'DoctorCommission','InsuranceClaim','SupplierPayment','Referral',
       'InventoryItem','InventoryBatch','InventoryMovement','StockTransfer','StockAudit','PurchaseOrder',
       'PatientSource','CareCoordinator','LeaveRequest','StaffAttendance','Payroll',
       'Organization','ClinicSettings','BookingConfig','BookingLink','PublicBooking',
       'Role','Permission','RolePermission','SaaSInvoice','TenantModule','UsageTracking','SupportTicket','SaaSAuditLog',
       'IVFCycle','FertilityAssessment','TreatmentProtocol','DentalExamination','DentalTreatmentPlan',
       'MSLead','Campaign','CRMContact','CRMDeal','EmailTemplate',
       'PatientUser','PatientDocument','Odontogram','DentalLabOrder',
      ].forEach(m => modelsWithTenantId.add(m));
    }

    if (modelsWithBranchId.size === 0) {
      ['Patient','Doctor','Appointment','Prescription','Medicine','PharmacySale','Invoice',
       'LabTest','LabOrder','RadiologyStudy','Expense','PatientPayment','ClinicalNote',
       'Staff','Department','BookingLink',
      ].forEach(m => modelsWithBranchId.add(m));
    }

    // Get all existing tables
    const tablesRes = await client.query(\"SELECT tablename FROM pg_tables WHERE schemaname = 'public'\");
    const existingTables = new Set(tablesRes.rows.map(r => r.tablename));

    // Get all existing columns per table
    const colsRes = await client.query(\"SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'\");
    const existingCols = {};
    for (const row of colsRes.rows) {
      if (!existingCols[row.table_name]) existingCols[row.table_name] = new Set();
      existingCols[row.table_name].add(row.column_name);
    }

    function hasCol(table, col) {
      return existingCols[table] && existingCols[table].has(col);
    }

    // Add tenantId to all tables that need it
    for (const table of modelsWithTenantId) {
      if (existingTables.has(table) && !hasCol(table, 'tenantId')) {
        await run('ALTER TABLE \"' + table + '\" ADD COLUMN IF NOT EXISTS \"tenantId\" TEXT', table + '.tenantId');
      }
    }

    // Add branchId to all tables that need it
    for (const table of modelsWithBranchId) {
      if (existingTables.has(table) && !hasCol(table, 'branchId')) {
        await run('ALTER TABLE \"' + table + '\" ADD COLUMN IF NOT EXISTS \"branchId\" TEXT', table + '.branchId');
      }
    }

    // User table - ensure all needed columns exist
    const userCols = ['tenantId', 'roleId', 'branchId', 'status', 'lastLogin', 'phone', 'password', 'createdAt', 'name', 'email'];
    for (const col of userCols) {
      if (existingTables.has('User') && !hasCol('User', col)) {
        const def = col === 'status' ? \" DEFAULT 'active'\" : col === 'password' ? \" DEFAULT 'medcore123'\" : '';
        await run('ALTER TABLE \"User\" ADD COLUMN IF NOT EXISTS \"' + col + '\" TEXT' + def, 'User.' + col);
      }
    }

    // Staff table
    const staffCols = ['tenantId', 'branchId', 'password', 'status', 'lastLogin', 'department', 'designation', 'salary', 'joinDate', 'phone', 'name', 'email', 'role'];
    for (const col of staffCols) {
      if (existingTables.has('Staff') && !hasCol('Staff', col)) {
        const type = col === 'salary' ? 'DOUBLE PRECISION DEFAULT 0' : col === 'joinDate' || col === 'lastLogin' ? 'TIMESTAMP(3)' : 'TEXT';
        const def = col === 'status' ? \" DEFAULT 'active'\" : col === 'password' ? \" DEFAULT 'medcore123'\" : '';
        await run('ALTER TABLE \"Staff\" ADD COLUMN IF NOT EXISTS \"' + col + '\" ' + type + def, 'Staff.' + col);
      }
    }

    // Branch table
    if (existingTables.has('Branch') && !hasCol('Branch', 'clinicType')) {
      await run(\"ALTER TABLE \\\"Branch\\\" ADD COLUMN IF NOT EXISTS \\\"clinicType\\\" TEXT DEFAULT 'General'\", 'Branch.clinicType');
    }

    // Tenant table
    if (existingTables.has('Tenant') && !hasCol('Tenant', 'logoUrl')) {
      await run('ALTER TABLE \"Tenant\" ADD COLUMN IF NOT EXISTS \"logoUrl\" TEXT', 'Tenant.logoUrl');
    }

    // Drop and recreate AuditLog with tenantId
    await run('DROP TABLE IF EXISTS \"AuditLog\" CASCADE', 'drop AuditLog');
    await run('CREATE TABLE \"AuditLog\" (\"id\" TEXT NOT NULL, \"tenantId\" TEXT, \"user\" TEXT NOT NULL, \"action\" TEXT NOT NULL, \"module\" TEXT NOT NULL, \"detail\" TEXT, \"ip\" TEXT, \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT \"AuditLog_pkey\" PRIMARY KEY (\"id\"))', 'create AuditLog');
    await run('CREATE INDEX IF NOT EXISTS \"AuditLog_tenantId_idx\" ON \"AuditLog\"(\"tenantId\")', 'AuditLog index');

    // Create missing tables
    const createTables = [
      'CREATE TABLE IF NOT EXISTS \"BookingLink\" (\"id\" TEXT NOT NULL, \"tenantId\" TEXT, \"branchId\" TEXT, \"configId\" TEXT, \"doctorId\" TEXT, \"doctorName\" TEXT, \"department\" TEXT, \"label\" TEXT, \"url\" TEXT NOT NULL, \"slug\" TEXT NOT NULL, \"active\" BOOLEAN NOT NULL DEFAULT true, \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT \"BookingLink_pkey\" PRIMARY KEY (\"id\"));',
      'CREATE UNIQUE INDEX IF NOT EXISTS \"BookingLink_slug_key\" ON \"BookingLink\"(\"slug\");',
      'CREATE UNIQUE INDEX IF NOT EXISTS \"BookingLink_tenantId_slug_key\" ON \"BookingLink\"(\"tenantId\", \"slug\");',
      'CREATE TABLE IF NOT EXISTS \"BookingConfig\" (\"id\" TEXT NOT NULL, \"tenantId\" TEXT NOT NULL, \"slotDuration\" INTEGER NOT NULL DEFAULT 30, \"maxBookingsPerSlot\" INTEGER NOT NULL DEFAULT 5, \"allowWalkIn\" BOOLEAN NOT NULL DEFAULT true, \"requirePhone\" BOOLEAN NOT NULL DEFAULT false, \"enableWaitlist\" BOOLEAN NOT NULL DEFAULT false, \"workingHours\" JSONB, \"holidays\" JSONB, \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT \"BookingConfig_pkey\" PRIMARY KEY (\"id\"));',
      'CREATE UNIQUE INDEX IF NOT EXISTS \"BookingConfig_tenantId_key\" ON \"BookingConfig\"(\"tenantId\");',
      'CREATE TABLE IF NOT EXISTS \"Role\" (\"id\" TEXT NOT NULL, \"name\" TEXT NOT NULL, \"description\" TEXT, \"isSystem\" BOOLEAN NOT NULL DEFAULT false, \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT \"Role_pkey\" PRIMARY KEY (\"id\"));',
      'CREATE UNIQUE INDEX IF NOT EXISTS \"Role_name_key\" ON \"Role\"(\"name\");',
      'CREATE TABLE IF NOT EXISTS \"Permission\" (\"id\" TEXT NOT NULL, \"module\" TEXT NOT NULL, \"action\" TEXT NOT NULL, \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT \"Permission_pkey\" PRIMARY KEY (\"id\"));',
      'CREATE TABLE IF NOT EXISTS \"RolePermission\" (\"roleId\" TEXT NOT NULL, \"permissionId\" TEXT NOT NULL, CONSTRAINT \"RolePermission_pkey\" PRIMARY KEY (\"roleId\",\"permissionId\"));',
      'CREATE TABLE IF NOT EXISTS \"StaffBranch\" (\"id\" TEXT NOT NULL, \"staffId\" TEXT NOT NULL, \"branchId\" TEXT NOT NULL, \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT \"StaffBranch_pkey\" PRIMARY KEY (\"id\"));',
      'CREATE UNIQUE INDEX IF NOT EXISTS \"StaffBranch_staffId_branchId_key\" ON \"StaffBranch\"(\"staffId\", \"branchId\");',
    ];

    for (const sql of createTables) {
      await run(sql, 'create: ' + sql.substring(20, 50));
    }

    console.log('Schema sync complete: ' + ok + ' ok, ' + fail + ' failed');
  } finally {
    client.release();
    await pool.end();
  }
}
migrate().catch(e => { console.error('Schema sync error:', e.message); process.exit(0); });
" 2>&1 || echo "Schema sync skipped"

echo "Starting application..."
exec node server.js
