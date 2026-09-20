import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { authRouter } from "./modules/auth";
import { adminAuthHandler } from "./modules/admin-auth";
import { doctorsRouter } from "./modules/doctors";
import { tenantsRouter } from "./modules/tenants";
import { dashboardRouter } from "./modules/dashboard";
import {
  patientsRouter,
  appointmentsRouter,
  prescriptionsRouter,
  prescriptionPrintRouter,
  clinicalNotesRouter,
  insuranceClaimsRouter,
  doctorCommissionsRouter,
  doctorScheduleRouter,
  doctorWorkspaceRouter,
} from "./modules/clinical";
import {
  invoicesRouter,
  patientPaymentsRouter,
  expensesRouter,
  bankTransactionsRouter,
  cashTransactionsRouter,
  chartOfAccountsRouter,
  journalEntriesRouter,
  accountingDashboardRouter,
  payrollRouter,
  leaveRouter,
  leaveRequestsRouter,
} from "./modules/finance";
import {
  medicinesRouter,
  medicineBatchesRouter,
  pharmacySalesRouter,
  pharmacyDashboardRouter,
  inventoryItemsRouter,
  inventoryLocationsRouter,
  inventoryMovementsRouter,
  inventoryDashboardRouter,
  stockAuditsRouter,
  stockMovementsRouter,
  stockTransfersRouter,
  purchaseOrdersRouter,
  purchaseReturnsRouter,
  salesReturnsRouter,
  suppliersRouter,
  supplierPaymentsRouter,
} from "./modules/pharmacy-inventory";
import {
  labOrdersRouter,
  labResultsRouter,
  labSamplesRouter,
  labTestsRouter,
  labTestsMasterRouter,
  labPackagesRouter,
  labDepartmentsRouter,
  labEquipmentRouter,
  labInventoryRouter,
  labQcRouter,
  labDashboardRouter,
} from "./modules/lab";
import {
  radiologyRouter,
  radiologyAlertsRouter,
  radiologyDashboardRouter,
  radiologyEquipmentRouter,
  radiologyModalitiesRouter,
  radiologySchedulesRouter,
  radiologyStudiesRouter,
  reportsRouter,
  doctorDashboardRouter,
} from "./modules/radiology-reports";
import {
  dentalDashboardRouter,
  dentalExaminationsRouter,
  dentalFollowupsRouter,
  dentalImagesRouter,
  dentalImplantCasesRouter,
  dentalLabOrdersRouter,
  dentalOdontogramsRouter,
  dentalOrthoCasesRouter,
  dentalProceduresRouter,
  dentalReportsRouter,
  dentalTreatmentPlansRouter,
} from "./modules/dental";
import {
  ivfConsentsRouter,
  ivfCyclesRouter,
  ivfDashboardRouter,
  ivfDonorsRouter,
  ivfPackagesRouter,
  ivfProtocolsRouter,
  embryosRouter,
  eggRetrievalsRouter,
  embryoTransfersRouter,
  follicularMonitoringRouter,
  fertilityAssessmentsRouter,
  pregnancyTrackingRouter,
  cryobankRouter,
  semenProcessingRouter,
} from "./modules/ivf";
import { proceduresRouter } from "./modules/procedures";
import {
  staffRouter,
  rolesRouter,
  departmentsRouter,
  branchesRouter,
  settingsRouter,
  notificationsRouter,
  notificationTemplatesRouter,
  auditLogsRouter,
  tenantSelfRouter,
  debugTenantRouter,
  staffAuthLoginHandler,
  doctorAuthHandler,
} from "./modules/org";
import {
  adminUsersRouter,
  adminImpersonateRouter,
  adminExtrasRouter,
  tenantActionsRouter,
  saasAuditRouter,
  saasDashboardRouter,
  saasInvoicesRouter,
  saasModulesRouter,
  saasSettingsRouter,
  addOnsRouter,
  plansRouter,
  supportTicketsRouter,
  tenantBranchesRouter,
  tenantSettingsRouter,
} from "./modules/saas";
import {
  patientAuthRouter,
  patientPortalRouter,
  onboardingHandler,
  onboardingGetHandler,
  onboardingPutHandler,
  publicBookingRouter,
  publicBookingAltRouter,
  publicBookingsRouter,
} from "./modules/portal-public";
import {
  crmCommunicationsRouter,
  crmContactsRouter,
  crmDashboardRouter,
  crmDealsRouter,
  crmReportsRouter,
  crmTasksRouter,
  crmTemplatesRouter,
  cmsActivityLogsRouter,
  cmsAppointmentsExtRouter,
  cmsCampaignsRouter,
  cmsCareCoordinatorsRouter,
  cmsCommissionRouter,
  cmsDashboardRouter,
  cmsLeadsRouter,
  cmsPatientSourcesRouter,
  cmsReferralsRouter,
  cmsReportsRouter,
  leadsRouter,
} from "./modules/crm-cms";
import { uploadLogoRouter, filesRouter } from "./modules/uploads";
import { authenticate, requireSuperAdmin } from "./middleware/auth";

const app = express();
const PORT = process.env.PORT || 4000;

// --- Database (Prisma 7 requires driver adapter) ---
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// --- Middleware ---
app.set("trust proxy", 1);
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// --- Public routes (mirror the frontend middleware's PUBLIC_API_ROUTES) ---
// Health check
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "error", database: "disconnected", timestamp: new Date().toISOString() });
  }
});

// Auth (login/refresh verify their own rate limits and tokens)
app.use("/api/auth", authRouter());

// SaaS platform login (AdminUser) — public, self rate-limited
app.post("/api/admin-auth", adminAuthHandler());

// Staff portal login (Staff table) — public, self rate-limited
app.post("/api/staff-auth/login", staffAuthLoginHandler());

// Doctor portal login — public
app.post("/api/doctor-auth", doctorAuthHandler());

// Patient portal auth (register/login) — public
app.use("/api/patient/auth", patientAuthRouter());

// Tenant onboarding (provisioning) — public
app.post("/api/onboarding", onboardingHandler());
app.get("/api/onboarding", onboardingGetHandler());
app.put("/api/onboarding", onboardingPutHandler());

// Public booking flow — public
app.use("/api/public", publicBookingRouter());
app.use("/api/public-booking", publicBookingAltRouter());
app.use("/api/public-bookings", publicBookingsRouter());

// SaaS pricing page + onboarding pricing step — public GET only
app.use("/api/plans", plansRouter());

// Uploaded logos — public read (IDs are unguessable cuids)
app.use("/api/files", filesRouter());

// --- Protected routes: every request below requires a valid JWT and runs
// inside AsyncLocalStorage tenant context (Prisma auto-filters by tenant) ---
const api = express.Router();
api.use(authenticate);

// Logo upload (only tenant settings pages call it — behind auth, like the
// Next middleware's default-deny)
api.use("/upload", uploadLogoRouter());

// SaaS platform (super-admin only)
api.use("/tenants", requireSuperAdmin, tenantsRouter());
api.use("/tenants/:id/branches", requireSuperAdmin, tenantBranchesRouter());
api.use("/tenants/:id/settings", requireSuperAdmin, tenantSettingsRouter());
api.use("/admin-users", requireSuperAdmin, adminUsersRouter());
api.use("/admin-impersonate", requireSuperAdmin, adminImpersonateRouter());
api.use("/admin", requireSuperAdmin, adminExtrasRouter());
api.use("/tenant-actions", requireSuperAdmin, tenantActionsRouter());
api.use("/saas-audit", requireSuperAdmin, saasAuditRouter());
api.use("/saas-dashboard", requireSuperAdmin, saasDashboardRouter());
api.use("/saas-invoices", requireSuperAdmin, saasInvoicesRouter());
api.use("/saas-modules", requireSuperAdmin, saasModulesRouter());
api.use("/saas-settings", requireSuperAdmin, saasSettingsRouter());
api.use("/add-ons", requireSuperAdmin, addOnsRouter());
api.use("/support-tickets", requireSuperAdmin, supportTicketsRouter());

// Tenant organization
api.use("/staff", staffRouter());
api.use("/roles", rolesRouter());
api.use("/departments", departmentsRouter());
api.use("/branches", branchesRouter());
api.use("/settings", settingsRouter());
api.use("/notifications", notificationsRouter());
api.use("/notification-templates", notificationTemplatesRouter());
api.use("/audit-logs", auditLogsRouter());
api.use("/tenant", tenantSelfRouter());
api.use("/debug-tenant", debugTenantRouter());

// Clinical core
api.use("/patients", patientsRouter());
api.use("/appointments", appointmentsRouter());
api.use("/prescriptions", prescriptionsRouter());
api.use("/prescription-print", prescriptionPrintRouter());
api.use("/clinical-notes", clinicalNotesRouter());
api.use("/procedures", proceduresRouter());
api.use("/insurance-claims", insuranceClaimsRouter());
api.use("/doctor-commissions", doctorCommissionsRouter());
api.use("/doctor-schedule", doctorScheduleRouter());
api.use("/doctors", doctorsRouter());
api.use("/doctors", doctorWorkspaceRouter());
api.use("/dashboard", dashboardRouter());
api.use("/doctor-dashboard", doctorDashboardRouter());

// Billing & accounting
api.use("/invoices", invoicesRouter());
api.use("/patient-payments", patientPaymentsRouter());
api.use("/expenses", expensesRouter());
api.use("/bank-transactions", bankTransactionsRouter());
api.use("/cash-transactions", cashTransactionsRouter());
api.use("/chart-of-accounts", chartOfAccountsRouter());
api.use("/journal-entries", journalEntriesRouter());
api.use("/accounting-dashboard", accountingDashboardRouter());
api.use("/payroll", payrollRouter());
api.use("/leave", leaveRouter());
api.use("/leave-requests", leaveRequestsRouter());

// Pharmacy & inventory
api.use("/medicines", medicinesRouter());
api.use("/medicine-batches", medicineBatchesRouter());
api.use("/pharmacy-sales", pharmacySalesRouter());
api.use("/pharmacy-dashboard", pharmacyDashboardRouter());
api.use("/inventory-items", inventoryItemsRouter());
api.use("/inventory-locations", inventoryLocationsRouter());
api.use("/inventory-movements", inventoryMovementsRouter());
api.use("/inventory-dashboard", inventoryDashboardRouter());
api.use("/stock-audits", stockAuditsRouter());
api.use("/stock-movements", stockMovementsRouter());
api.use("/stock-transfers", stockTransfersRouter());
api.use("/purchase-orders", purchaseOrdersRouter());
api.use("/purchase-returns", purchaseReturnsRouter());
api.use("/sales-returns", salesReturnsRouter());
api.use("/suppliers", suppliersRouter());
api.use("/supplier-payments", supplierPaymentsRouter());

// Laboratory
api.use("/lab-orders", labOrdersRouter());
api.use("/lab-results", labResultsRouter());
api.use("/lab-samples", labSamplesRouter());
api.use("/lab-tests", labTestsRouter());
api.use("/lab-tests-master", labTestsMasterRouter());
api.use("/lab-packages", labPackagesRouter());
api.use("/lab-departments", labDepartmentsRouter());
api.use("/lab-equipment", labEquipmentRouter());
api.use("/lab-inventory", labInventoryRouter());
api.use("/lab-qc", labQcRouter());
api.use("/lab-dashboard", labDashboardRouter());

// Radiology & reports
api.use("/radiology", radiologyRouter());
api.use("/radiology-alerts", radiologyAlertsRouter());
api.use("/radiology-dashboard", radiologyDashboardRouter());
api.use("/radiology-equipment", radiologyEquipmentRouter());
api.use("/radiology-modalities", radiologyModalitiesRouter());
api.use("/radiology-schedules", radiologySchedulesRouter());
api.use("/radiology-studies", radiologyStudiesRouter());
api.use("/reports", reportsRouter());

// Dental
api.use("/dental-dashboard", dentalDashboardRouter());
api.use("/dental-examinations", dentalExaminationsRouter());
api.use("/dental-followups", dentalFollowupsRouter());
api.use("/dental-images", dentalImagesRouter());
api.use("/dental-implant-cases", dentalImplantCasesRouter());
api.use("/dental-lab-orders", dentalLabOrdersRouter());
api.use("/dental-odontograms", dentalOdontogramsRouter());
api.use("/dental-ortho-cases", dentalOrthoCasesRouter());
api.use("/dental-procedures", dentalProceduresRouter());
api.use("/dental-reports", dentalReportsRouter());
api.use("/dental-treatment-plans", dentalTreatmentPlansRouter());

// IVF & fertility
api.use("/ivf-consents", ivfConsentsRouter());
api.use("/ivf-cycles", ivfCyclesRouter());
api.use("/ivf-dashboard", ivfDashboardRouter());
api.use("/ivf-donors", ivfDonorsRouter());
api.use("/ivf-packages", ivfPackagesRouter());
api.use("/ivf-protocols", ivfProtocolsRouter());
api.use("/embryos", embryosRouter());
api.use("/egg-retrievals", eggRetrievalsRouter());
api.use("/embryo-transfers", embryoTransfersRouter());
api.use("/follicular-monitoring", follicularMonitoringRouter());
api.use("/fertility-assessments", fertilityAssessmentsRouter());
api.use("/pregnancy-tracking", pregnancyTrackingRouter());
api.use("/cryobank", cryobankRouter());
api.use("/semen-processing", semenProcessingRouter());

// CRM & case management
api.use("/crm-communications", crmCommunicationsRouter());
api.use("/crm-contacts", crmContactsRouter());
api.use("/crm-dashboard", crmDashboardRouter());
api.use("/crm-deals", crmDealsRouter());
api.use("/crm-reports", crmReportsRouter());
api.use("/crm-tasks", crmTasksRouter());
api.use("/crm-templates", crmTemplatesRouter());
api.use("/cms-activity-logs", cmsActivityLogsRouter());
api.use("/cms-appointments-ext", cmsAppointmentsExtRouter());
api.use("/cms-campaigns", cmsCampaignsRouter());
api.use("/cms-care-coordinators", cmsCareCoordinatorsRouter());
api.use("/cms-commission", cmsCommissionRouter());
api.use("/cms-dashboard", cmsDashboardRouter());
api.use("/cms-leads", cmsLeadsRouter());
api.use("/cms-patient-sources", cmsPatientSourcesRouter());
api.use("/cms-referrals", cmsReferralsRouter());
api.use("/cms-reports", cmsReportsRouter());
api.use("/leads", leadsRouter());

// Patient portal (patient JWT cookie; portal identifies the patient via
// userId params, exactly like the original routes)
api.use("/patient", patientPortalRouter());

app.use("/api", api);

// --- 404 for unknown API routes ---
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// --- Error handler ---
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// --- Graceful shutdown ---
async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down...`);
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// --- Start ---
app.listen(PORT, () => {
  console.log(`Carelim Backend (full API) running on port ${PORT}`);
});

export default app;