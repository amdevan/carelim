import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { getCurrentTenantId } from './tenant-context'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ─── Tenant ID (module-level fallback) ──────────────────────────
// Primary source: AsyncLocalStorage (set by withTenant, race-condition proof)
// Fallback: module-level variable (for routes that forget withTenant)
let _currentTenantId: string | null = null

export function setTenantId(id: string | null) {
  _currentTenantId = id
}

export function getTenantId(): string | null {
  return _currentTenantId
}

// ─── Models that have tenantId directly ──────────────────────────
const TENANT_MODELS = new Set([
  // Core HMS
  'department', 'doctor', 'patient', 'medicine', 'supplier', 'staff',
  'auditLog', 'setting', 'branch', 'clinicSettings', 'user',
  // Radiology
  'radiologyTest', 'radiologyModality', 'radiologyEquipment', 'radiologyStudy',
  'radiologyTemplate', 'radiologyAlert', 'radiologySchedule',
  // Finance
  'expense', 'account', 'journalEntry', 'patientPayment', 'supplierPayment',
  'doctorCommission', 'insuranceClaim', 'cashTransaction', 'bankTransaction',
  // Clinical
  'clinicalNote', 'leaveRequest',
  // Lab
  'labDepartment', 'labTestMaster', 'labPackage', 'labOrder',
  'labQualityControl', 'labEquipment', 'labInventory', 'labSupplier',
  // Inventory
  'inventoryLocation', 'inventoryItem', 'inventoryBatch', 'inventoryMovement',
  'stockTransfer', 'stockAudit',
  // Organization
  'organization', 'organizationSetting', 'tenantModule', 'patientDocument',
  // CRM
  'cRMContact', 'cRMDeal', 'emailTemplate',
  // IVF
  'iVFCycle', 'fertilityAssessment', 'treatmentProtocol', 'follicularMonitoring',
  'eggRetrieval', 'semenProcessing', 'embryo', 'embryoTransfer',
  'cryobankStorage', 'pregnancyFollowup', 'donorProfile', 'iVFConsent', 'iVFPackage',
  // Dental
  'dentalExamination', 'odontogram', 'dentalTreatmentPlan', 'dentalProcedure',
  'dentalImage', 'dentalLabOrder', 'orthodonticCase', 'implantCase', 'dentalFollowup',
  // Referral / Marketing
  'patientSource', 'appointmentExtension', 'referral', 'patientActivityLog',
  'careCoordinator', 'mSLead', 'campaign', 'commissionSettlement',
  // Booking
  'bookingConfig', 'bookingLink', 'publicBooking',
  // SaaS
  'saaSInvoice', 'usageTracking', 'supportTicket', 'saaSAuditLog',
  // Patient portal
  'patientUser',
])

// ─── Models WITHOUT tenantId but linked via Branch (filter by branch.tenantId) ──
const BRANCH_MODELS = new Set([
  'appointment', 'prescription', 'invoice',
  'pharmacySale', 'labTest',
])

// Operations that use a `where` clause
const WHERE_OPS = new Set([
  'findMany', 'findFirst', 'findUnique', 'findUniqueOrThrow', 'findFirstOrThrow',
  'update', 'updateMany', 'delete', 'deleteMany',
  'count', 'aggregate', 'groupBy',
])

// ─── Resolve tenant ID from AsyncLocalStorage (request-scoped, safe) ──
function resolveTenantId(): string | null {
  return getCurrentTenantId()
}

// ─── Create PrismaClient with driver adapter ────────────────────
function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  })
  return new PrismaClient({ adapter })
}

// ─── Raw PrismaClient (NO middleware, NO filtering) ──────────────
let _rawClient: PrismaClient | undefined
function getRawClient(): PrismaClient {
  if (!_rawClient) {
    _rawClient = createClient()
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _rawClient
  }
  return _rawClient
}

// ─── Filtered PrismaClient (with $extends middleware) ────────────
let _filteredClient: PrismaClient | undefined
function getFilteredClient(): PrismaClient {
  if (!_filteredClient) {
    _filteredClient = createClient().$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const tenantId = resolveTenantId()

            // Only filter models that have tenantId
            const modelKey = model?.charAt(0).toLowerCase() + model?.slice(1)
            if (!model || !tenantId) {
              return query(args)
            }

            const isTenantModel = TENANT_MODELS.has(modelKey!)
            const isBranchModel = BRANCH_MODELS.has(modelKey!)

            if (!isTenantModel && !isBranchModel) {
              return query(args)
            }

            // READ / COUNT / AGGREGATE — add tenantId to where
            if (WHERE_OPS.has(operation)) {
              if (!args.where) args.where = {}

              // For findUnique, findUniqueOrThrow: only filter if compound where
              if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                const whereKeys = Object.keys(args.where)
                if (whereKeys.length === 1) {
                  return query(args)
                }
              }

              if (isTenantModel) {
                // Models with tenantId — add directly
                if (!args.where.tenantId) {
                  args.where = { ...args.where, tenantId }
                }
              } else if (isBranchModel) {
                // Models linked via Branch — filter by branch.tenantId
                if (!args.where.branch) {
                  args.where = { ...args.where, branch: { tenantId } }
                }
              }
            }

            // CREATE — add tenantId to data
            if (operation === 'create') {
              if (isTenantModel && args.data && !args.data.tenantId) {
                args.data = { ...args.data, tenantId }
              }
              // For branch models, branchId should already be set by the route
            }

            // CREATE MANY — add tenantId to each data item
            if (operation === 'createMany') {
              if (isTenantModel && args.data) {
                const data = args.data
                args.data = Array.isArray(data)
                  ? data.map((d: any) => (d.tenantId ? d : { ...d, tenantId }))
                  : { ...data, tenantId }
              }
            }

            // UPSERT — add tenantId to both create and update
            if (operation === 'upsert') {
              if (isTenantModel && args.create && !args.create.tenantId) {
                args.create = { ...args.create, tenantId }
              }
              if (isTenantModel && args.update) {
                args.update = { ...args.update, tenantId }
              }
            }

            return query(args)
          },
        },
      },
    })

    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _filteredClient as any
  }
  return _filteredClient
}

// ─── Exports ─────────────────────────────────────────────────────

// Normal db — all queries are auto-filtered by tenantId via middleware
export const db = getFilteredClient()

// Raw db — no filtering (for onboarding, login, migrations)
export const rawDb = getRawClient()

// Backward compatibility
export function getDb(): PrismaClient { return db }
export function getRawDb(): PrismaClient { return rawDb }
