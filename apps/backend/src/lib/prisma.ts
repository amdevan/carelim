/**
 * Prisma client with automatic tenant isolation — port of frontend lib/db.ts.
 *
 * `db`    — every query is auto-filtered by the tenantId in AsyncLocalStorage,
 *           writes are force-tagged with the current tenant.
 * `rawDb` — no tenant filtering (login, onboarding, super-admin tenants CRUD).
 *
 * Both strip write-payload fields that don't exist on the model, preventing
 * "Unknown argument" Prisma errors when clients send extra keys.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  getCurrentTenantId,
  getCurrentBranchId,
  getCurrentBranchIds,
  getCurrentUserType,
} from "./tenant-context";

// ─── Models that have tenantId directly ──────────────────────────
const TENANT_MODELS = new Set([
  "department", "doctor", "patient", "medicine", "supplier", "staff",
  "auditLog", "setting", "branch", "clinicSettings", "user",
  "radiologyTest", "radiologyModality", "radiologyEquipment", "radiologyStudy",
  "radiologyTemplate", "radiologyAlert", "radiologySchedule",
  "expense", "account", "journalEntry", "patientPayment", "supplierPayment",
  "doctorCommission", "insuranceClaim", "cashTransaction", "bankTransaction",
  "clinicalNote", "leaveRequest",
  "labDepartment", "labTestMaster", "labPackage", "labOrder",
  "labQualityControl", "labEquipment", "labInventory", "labSupplier",
  "inventoryLocation", "inventoryItem", "inventoryBatch", "inventoryMovement",
  "stockTransfer", "stockAudit",
  "organization", "organizationSetting", "tenantModule", "patientDocument",
  "cRMContact", "cRMDeal", "emailTemplate",
  "iVFCycle", "fertilityAssessment", "treatmentProtocol", "follicularMonitoring",
  "eggRetrieval", "semenProcessing", "embryo", "embryoTransfer",
  "cryobankStorage", "pregnancyFollowup", "donorProfile", "iVFConsent", "iVFPackage",
  "dentalExamination", "odontogram", "dentalTreatmentPlan", "dentalProcedure",
  "dentalImage", "dentalLabOrder", "orthodonticCase", "implantCase", "dentalFollowup",
  "patientSource", "appointmentExtension", "referral", "patientActivityLog",
  "careCoordinator", "mSLead", "campaign", "commissionSettlement",
  "bookingConfig", "bookingLink", "publicBooking",
  "saaSInvoice", "usageTracking", "supportTicket", "saaSAuditLog",
  "patientUser",
]);

// ─── Models WITHOUT tenantId but linked via Branch ───────────────
const BRANCH_MODELS = new Set([
  "appointment", "prescription", "invoice",
  "pharmacySale", "labTest",
]);

// ─── Branch-isolated models for staff ────────────────────────────
const BRANCH_ISOLATED_MODELS = new Set([
  "patient", "doctor", "appointment", "prescription", "invoice",
  "pharmacySale", "labTest", "clinicalNote", "expense",
  "patientPayment", "radiologyStudy", "radiologyTest",
]);

const WHERE_OPS = new Set([
  "findMany", "findFirst", "findUnique", "findUniqueOrThrow", "findFirstOrThrow",
  "update", "updateMany", "delete", "deleteMany",
  "count", "aggregate", "groupBy",
]);

const WRITE_OPS = new Set(["create", "createMany", "createManyAndReturn", "update", "updateMany", "upsert"]);

// ─── DMMF-based write-payload sanitizer ──────────────────────────
let _modelFields: Map<string, Set<string>> | null = null;
function getModelFields(): Map<string, Set<string>> {
  if (!_modelFields) {
    _modelFields = new Map();
    for (const m of Prisma.dmmf.datamodel.models) {
      _modelFields.set(m.name, new Set(m.fields.map((f: { name: string }) => f.name)));
    }
  }
  return _modelFields;
}

function sanitizeData(model: string, data: unknown): unknown {
  const fields = getModelFields().get(model);
  if (!fields || !data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map((d) => sanitizeData(model, d));
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(data as Record<string, unknown>)) {
    if (fields.has(key)) out[key] = (data as Record<string, unknown>)[key];
  }
  return out;
}

function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({ adapter });
}

// ─── Raw client (sanitizer only, no tenant filter) ───────────────
let _rawClient: any | undefined;
export function getRawClient(): PrismaClient {
  if (!_rawClient) {
    _rawClient = createClient().$extends({
      query: {
        $allModels: {
          $allOperations({ model, operation, args, query }: any) {
            const a = args as any;
            if (model && WRITE_OPS.has(operation)) {
              if (a.data) a.data = sanitizeData(model, a.data);
              if (operation === "upsert") {
                if (a.create) a.create = sanitizeData(model, a.create);
                if (a.update) a.update = sanitizeData(model, a.update);
              }
            }
            return query(args);
          },
        },
      },
    });
  }
  return _rawClient;
}

// ─── Tenant-filtered client ──────────────────────────────────────
let _filteredClient: any | undefined;
export function getFilteredClient(): PrismaClient {
  if (!_filteredClient) {
    _filteredClient = createClient().$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args: rawArgs, query }) {
            const args = rawArgs as any;
            if (model && WRITE_OPS.has(operation)) {
              if (args.data) args.data = sanitizeData(model, args.data);
              if (operation === "upsert") {
                if (args.create) args.create = sanitizeData(model, args.create);
                if (args.update) args.update = sanitizeData(model, args.update);
              }
            }
            const tenantId = getCurrentTenantId();
            const branchId = getCurrentBranchId();
            const branchIds = getCurrentBranchIds();
            const userType = getCurrentUserType();

            const modelKey = model?.charAt(0).toLowerCase() + model?.slice(1);
            if (!model || !tenantId) return query(args);

            const isTenantModel = TENANT_MODELS.has(modelKey!);
            const isBranchModel = BRANCH_MODELS.has(modelKey!);
            const isBranchIsolated = BRANCH_ISOLATED_MODELS.has(modelKey!);

            if (!isTenantModel && !isBranchModel) return query(args);

            if (WHERE_OPS.has(operation)) {
              if (!args.where) args.where = {};
              if (isTenantModel) {
                if (!args.where.tenantId) {
                  args.where = { ...args.where, tenantId };
                }
              } else if (isBranchModel) {
                if (!args.where.branch) {
                  args.where = { ...args.where, branch: { tenantId } };
                }
              }

              if (isBranchIsolated && userType === "staff") {
                const effectiveBranchIds = branchIds.length > 0 ? branchIds : branchId ? [branchId] : [];
                if (effectiveBranchIds.length > 0 && !args.where.branchId) {
                  if (effectiveBranchIds.length === 1) {
                    args.where = { ...args.where, branchId: effectiveBranchIds[0] };
                  } else {
                    args.where = { ...args.where, branchId: { in: effectiveBranchIds } };
                  }
                }
              }
            }

            if (operation === "create") {
              if (isTenantModel && args.data) {
                args.data = { ...args.data, tenantId };
              }
            }

            if (operation === "createMany") {
              if (isTenantModel && args.data) {
                const data = args.data;
                args.data = Array.isArray(data)
                  ? data.map((d: any) => ({ ...d, tenantId }))
                  : { ...data, tenantId };
              }
            }

            if (operation === "upsert") {
              if (isTenantModel && args.create) {
                args.create = { ...args.create, tenantId };
              }
              if (isTenantModel && args.update) {
                delete args.update.tenantId;
                delete args.update.id;
                delete args.update.createdAt;
              }
            }

            if (operation === "update" || operation === "updateMany") {
              if (args.data) {
                const PROTECTED_FIELDS = ["id", "tenantId", "createdAt", "updatedAt", "createdBy", "branchId"];
                for (const field of PROTECTED_FIELDS) {
                  delete args.data[field];
                }
              }
            }

            if (operation === "delete" || operation === "deleteMany") {
              if (isTenantModel && args.where && !args.where.tenantId) {
                args.where = { ...args.where, tenantId };
              }
            }

            return query(args);
          },
        },
      },
    });
  }
  return _filteredClient;
}

export const db = getFilteredClient();
export const rawDb = getRawClient();
