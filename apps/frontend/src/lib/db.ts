import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { getCurrentTenantId, getCurrentBranchId, getCurrentBranchIds, getCurrentUserType } from './tenant-context'

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

// ─── Models that should be branch-isolated for staff ────────────
// Staff with a branchId can only see data from their assigned branch
const BRANCH_ISOLATED_MODELS = new Set([
  'patient', 'doctor', 'appointment', 'prescription', 'invoice',
  'pharmacySale', 'labTest', 'clinicalNote', 'expense',
  'patientPayment', 'radiologyStudy', 'radiologyTest',
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

// ─── DMMF-based write-payload sanitizer ──────────────────────────
// Strips keys from create/update payloads that don't exist on the model.
// UI panels send extra fields (days, appliedAt, staffName, logoUrl, email…)
// that previously crashed Prisma with "Unknown argument" 500s.
let _modelFields: Map<string, Set<string>> | null = null
function getModelFields(): Map<string, Set<string>> {
  if (!_modelFields) {
    _modelFields = new Map()
    for (const m of Prisma.dmmf.datamodel.models) {
      _modelFields.set(m.name, new Set(m.fields.map((f: { name: string }) => f.name)))
    }
  }
  return _modelFields
}

const WRITE_OPS = new Set(['create', 'createMany', 'createManyAndReturn', 'update', 'updateMany', 'upsert'])

function sanitizeData(model: string, data: unknown): unknown {
  const fields = getModelFields().get(model)
  if (!fields || !data || typeof data !== 'object') return data
  if (Array.isArray(data)) return data.map((d) => sanitizeData(model, d))
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(data as Record<string, unknown>)) {
    if (fields.has(key)) out[key] = (data as Record<string, unknown>)[key]
  }
  return out
}

// ─── Create PrismaClient with driver adapter ────────────────────
function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  })
  return new PrismaClient({ adapter })
}

// ─── Raw PrismaClient (NO tenant filtering; unknown-field stripping only) ──
let _rawClient: any | undefined
function getRawClient(): PrismaClient {
  if (!_rawClient) {
    _rawClient = createClient().$extends({
      query: {
        $allModels: {
          $allOperations({ model, operation, args, query }: any) {
            const a = args as any
            if (model && WRITE_OPS.has(operation)) {
              if (a.data) a.data = sanitizeData(model, a.data)
              if (operation === 'upsert') {
                if (a.create) a.create = sanitizeData(model, a.create)
                if (a.update) a.update = sanitizeData(model, a.update)
              }
            }
            return query(args)
          },
        },
      },
    })
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _rawClient
  }
  return _rawClient
}

// ─── Filtered PrismaClient (with $extends middleware) ────────────
let _filteredClient: any | undefined
function getFilteredClient(): PrismaClient {
  if (!_filteredClient) {
    _filteredClient = createClient().$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args: rawArgs, query }) {
            // Cast args to any — Prisma middleware union types are too broad for static typing
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const args = rawArgs as any
            // Strip fields that don't exist on the model — prevents Prisma
            // "Unknown argument" 500s when UI panels send extra keys.
            // Applies to ALL models, before any early return.
            if (model && WRITE_OPS.has(operation)) {
              if (args.data) args.data = sanitizeData(model, args.data)
              if (operation === 'upsert') {
                if (args.create) args.create = sanitizeData(model, args.create)
                if (args.update) args.update = sanitizeData(model, args.update)
              }
            }
            const tenantId = resolveTenantId()
            const branchId = getCurrentBranchId()
            const branchIds = getCurrentBranchIds()
            const userType = getCurrentUserType()

            // Only filter models that have tenantId
            const modelKey = model?.charAt(0).toLowerCase() + model?.slice(1)
            if (!model || !tenantId) {
              return query(args)
            }

            const isTenantModel = TENANT_MODELS.has(modelKey!)
            const isBranchModel = BRANCH_MODELS.has(modelKey!)
            const isBranchIsolated = BRANCH_ISOLATED_MODELS.has(modelKey!)

            if (!isTenantModel && !isBranchModel) {
              return query(args)
            }

            // READ / COUNT / AGGREGATE — add tenantId to where
            if (WHERE_OPS.has(operation)) {
              if (!args.where) args.where = {}

              // For findUnique, findUniqueOrThrow: always apply tenant filter
              // (Removed unsafe id-only bypass that allowed cross-tenant data access)

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

              // Branch isolation for staff — only see their assigned branch(es) data
              if (isBranchIsolated && userType === 'staff') {
                const effectiveBranchIds = branchIds.length > 0 ? branchIds : (branchId ? [branchId] : []);
                if (effectiveBranchIds.length > 0 && !args.where.branchId) {
                  if (effectiveBranchIds.length === 1) {
                    args.where = { ...args.where, branchId: effectiveBranchIds[0] }
                  } else {
                    args.where = { ...args.where, branchId: { in: effectiveBranchIds } }
                  }
                }
              }
            }

            // CREATE — force the tenantId to the current tenant.
            // Must OVERWRITE (not skip when present): a client-supplied tenantId
            // in the request body would otherwise write cross-tenant.
            if (operation === 'create') {
              if (isTenantModel && args.data) {
                args.data = { ...args.data, tenantId }
              }
              // For branch models, branchId should already be set by the route
            }

            // CREATE MANY — force tenantId on each data item
            if (operation === 'createMany') {
              if (isTenantModel && args.data) {
                const data = args.data
                args.data = Array.isArray(data)
                  ? data.map((d: any) => ({ ...d, tenantId }))
                  : { ...data, tenantId }
              }
            }

            // UPSERT — force tenantId in create, strip protected fields in update
            if (operation === 'upsert') {
              if (isTenantModel && args.create) {
                args.create = { ...args.create, tenantId }
              }
              if (isTenantModel && args.update) {
                delete args.update.tenantId
                delete args.update.id
                delete args.update.createdAt
              }
            }

            // UPDATE / UPDATE MANY — prevent override of protected fields
            if (operation === 'update' || operation === 'updateMany') {
              if (args.data) {
                const PROTECTED_FIELDS = ['id', 'tenantId', 'createdAt', 'updatedAt', 'createdBy', 'branchId']
                for (const field of PROTECTED_FIELDS) {
                  delete args.data[field]
                }
              }
            }

            // DELETE — prevent cross-tenant deletes
            if (operation === 'delete' || operation === 'deleteMany') {
              if (isTenantModel && args.where && !args.where.tenantId) {
                args.where = { ...args.where, tenantId }
              }
            }

            return query(args)
          },
        },
      },
    })

    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _filteredClient as any
  }
  return _filteredClient!
}

// ─── Exports ─────────────────────────────────────────────────────

// Normal db — all queries are auto-filtered by tenantId via middleware
export const db = getFilteredClient()

// Raw db — no filtering (for onboarding, login, migrations)
export const rawDb = getRawClient()

// Backward compatibility
export function getDb(): PrismaClient { return db }
export function getRawDb(): PrismaClient { return rawDb }
