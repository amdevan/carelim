/**
 * Finance module — port of frontend /api routes:
 *   invoices, invoices/[id], patient-payments, patient-payments/[id],
 *   expenses, expenses/[id], bank-transactions, cash-transactions,
 *   chart-of-accounts, journal-entries, accounting-dashboard,
 *   payroll, payroll/[id], leave, leave/[id], leave-requests, leave-requests/[id].
 * Tenant isolation enforced by lib/prisma.ts (invoice is branch-linked;
 * expense/account/journalEntry/patientPayment/cashTransaction/bankTransaction/
 * leaveRequest are tenant models).
 */
import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { db } from "../lib/prisma";
import { fail, wrap } from "../lib/http";
import { requirePermission } from "../middleware/permissions";
import { getCurrentUserEmail } from "../lib/tenant-context";

// ─── Inlined frontend lib/id-generator.ts helpers (identical behavior) ──
const MAX_RETRIES = 5;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Generate the next sequential number for a prefix by reading the latest code.
 * Caller should wrap in a try/catch and retry on Prisma P2002 (unique constraint).
 */
async function getNextSequenceNumber(
  prefix: string,
  latestQuery: () => Promise<{ code: string }[]>
): Promise<string> {
  const latest = await latestQuery();
  // Only consider codes that are exactly `prefix + digits`. Legacy rows with
  // random/alphanumeric suffixes (e.g. INV-VTPNMHHG) sort above serials and
  // must not poison the sequence (they made creation collide forever).
  const nums = latest
    .map(r => r.code.match(new RegExp(`^${escapeRegex(prefix)}(\\d+)$`)))
    .filter((m): m is RegExpMatchArray => !!m)
    .map(m => parseInt(m[1], 10));
  const nextNum = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(nextNum).padStart(5, "0")}`;
}

/**
 * Create a record with unique code, retrying on P2002 (unique constraint violation).
 * This is the proper atomic approach — the DB enforces uniqueness, and we retry on conflict.
 */
async function createWithRetry<T>(
  createFn: () => Promise<T>,
  regenerateFn: () => Promise<void>,
): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await createFn();
    } catch (error: any) {
      if (error?.code === "P2002") {
        // Unique constraint violation — regenerate the code and retry
        await regenerateFn();
        continue;
      }
      throw error; // Non-constraint errors propagate immediately
    }
  }
  throw new Error(`Failed to create record after ${MAX_RETRIES} attempts (unique constraint conflicts)`);
}

// nanoid equivalent (backend has no nanoid dependency) — same default
// 64-char url alphabet, same size semantics, same uppercased usage.
const NANOID_ALPHABET = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict";

function nanoid(size = 21): string {
  const bytes = randomBytes(size);
  let id = "";
  for (let i = 0; i < size; i++) id += NANOID_ALPHABET[bytes[i] % NANOID_ALPHABET.length];
  return id;
}

/** Generate a unique nanoid-based code. */
function generateNanoCode(prefix: string, length: number = 8): string {
  return `${prefix}${nanoid(length).toUpperCase()}`;
}

// ─── Inlined frontend lib/leave.ts helper (identical behavior) ──
const LEAVE_TYPES = ["casual", "sick", "earned", "unpaid"];
const STATUSES = ["pending", "approved", "rejected"];

/** Build a whitelisted LeaveRequest create payload from client input.
 *  UI panels send extra keys (days, appliedAt, staffName, department) that
 *  don't exist on the model — passing them raw made Prisma fail with
 *  "Unknown argument" errors. */
async function buildLeaveCreateData(body: Record<string, unknown>) {
  let staffId = typeof body.staffId === "string" ? body.staffId : "";
  if (!staffId && typeof body.staffName === "string" && body.staffName.trim()) {
    // SaaS HR panel submits by staff name — resolve to a staff record
    const staff = await db.staff.findFirst({ where: { name: body.staffName.trim() }, select: { id: true } });
    if (!staff) return { error: `No staff member named "${body.staffName}" found` } as const;
    staffId = staff.id;
  }
  if (!staffId) return { error: "staffId or staffName is required" } as const;
  if (!body.startDate || !body.endDate) return { error: "startDate and endDate are required" } as const;
  const start = new Date(String(body.startDate));
  const end = new Date(String(body.endDate));
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { error: "Invalid start/end date" } as const;
  return {
    data: {
      staffId,
      type: typeof body.type === "string" && LEAVE_TYPES.includes(body.type) ? body.type : "casual",
      startDate: start,
      endDate: end,
      reason: typeof body.reason === "string" ? body.reason : null,
      status: typeof body.status === "string" && STATUSES.includes(body.status) ? body.status : "pending",
    },
  } as const;
}

// ════════════════════════════════════════════════════════════════
// Invoices — /api/invoices and /api/invoices/[id]
// ════════════════════════════════════════════════════════════════

async function listInvoices(req: Request, res: Response) {
  try {
    const status = req.query.status as string | undefined;
    const branchId = req.query.branchId as string | undefined;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (branchId) where.branchId = branchId;
    const invoices = await db.invoice.findMany({
      where,
      include: { patient: true, items: true },
      orderBy: { date: "desc" },
    });
    res.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    fail(res, 500, "Failed to fetch invoices");
  }
}

async function createInvoice(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const { items, testIds, ...data } = body;

    let invoiceNo = await getNextSequenceNumber("INV-", () =>
      db.invoice.findMany({
        where: { invoiceNo: { startsWith: "INV-" } },
        select: { invoiceNo: true },
      }).then(rows => rows.map(r => ({ code: r.invoiceNo })))
    );
    const invoice = await createWithRetry(
      async () => {
        return db.invoice.create({
          data: {
            ...data,
            date: new Date(),
            invoiceNo,
            items: { create: items || [] },
          },
          include: { items: true, patient: true },
        });
      },
      async () => {
        invoiceNo = await getNextSequenceNumber("INV-", () =>
          db.invoice.findMany({
            where: { invoiceNo: { startsWith: "INV-" } },
            select: { invoiceNo: true },
          }).then(rows => rows.map(r => ({ code: r.invoiceNo })))
        );
      },
    );

    // Create lab order if lab test IDs provided
    if (data.type === "lab" && testIds && testIds.length > 0) {
      try {
        const tests = await db.labTestMaster.findMany({ where: { id: { in: testIds } } });
        if (tests.length > 0) {
          let labOrderNo = await getNextSequenceNumber("LAB-ORD-", () =>
            db.labOrder.findMany({
              where: { orderNo: { startsWith: "LAB-ORD-" } },
              select: { orderNo: true },
            }).then(rows => rows.map(r => ({ code: r.orderNo })))
          );
          const totalAmount = tests.reduce((s, t) => s + t.price, 0);
          const disc = data.discount || 0;
          const tax = Math.round((totalAmount - disc) * 0.13);
          const netAmount = totalAmount - disc + tax;

          await createWithRetry(
            () => db.labOrder.create({
              data: {
                orderNo: labOrderNo,
                patientId: data.patientId,
                doctorId: data.doctorId || null,
                priority: "normal",
                status: "ordered",
                totalAmount,
                discount: disc,
                tax,
                netAmount,
                paidAmount: data.paid || 0,
                paymentStatus: data.paid >= netAmount ? "paid" : data.paid > 0 ? "partial" : "unpaid",
                invoiceId: invoice.id,
                barcode: labOrderNo,
                items: {
                  create: tests.map(t => ({ testId: t.id, price: t.price, status: "ordered", resultStatus: "pending" })),
                },
              },
            }),
            async () => {
              labOrderNo = await getNextSequenceNumber("LAB-ORD-", () =>
                db.labOrder.findMany({
                  where: { orderNo: { startsWith: "LAB-ORD-" } },
                  select: { orderNo: true },
                }).then(rows => rows.map(r => ({ code: r.orderNo })))
              );
            },
          );
        }
      } catch (labErr) {
        console.error("Failed to create lab order:", labErr);
      }
    }

    await db.auditLog.create({ data: { user: getCurrentUserEmail() || "system@carelim.health", action: "CREATE", module: "Invoice", detail: `Created invoice ${invoice.invoiceNo}` } });
    res.status(201).json(invoice);
  } catch (error) {
    console.error("Error creating invoice:", error);
    fail(res, 500, "Failed to create invoice");
  }
}

async function getInvoice(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const inv = await db.invoice.findUnique({ where: { id }, include: { patient: true, items: true } });
    if (!inv) return fail(res, 404, "Not found");
    res.json(inv);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    fail(res, 500, "Failed to fetch invoice");
  }
}

async function updateInvoice(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const body = req.body || {};

    // Recalculate due from total and paid
    const current = await db.invoice.findUnique({ where: { id } });
    if (!current) return fail(res, 404, "Not found");

    const newPaid = body.paid !== undefined ? body.paid : current.paid;
    const newTotal = body.total !== undefined ? body.total : current.total;
    const due = Math.max(0, newTotal - newPaid);

    // Auto-update status based on due
    let status = body.status || current.status;
    if (body.paid !== undefined) {
      status = due <= 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid";
    }

    // Whitelist allowed fields
    const data: Record<string, unknown> = { due, status };
    if (body.paid !== undefined) data.paid = body.paid;
    if (body.total !== undefined) data.total = body.total;
    if (body.discount !== undefined) data.discount = body.discount;
    if (body.tax !== undefined) data.tax = body.tax;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod;

    const inv = await db.invoice.update({ where: { id }, data: data as never });
    if (body.paid !== undefined) {
      await db.auditLog.create({ data: { user: getCurrentUserEmail() || "system@carelim.health", action: "PAYMENT", module: "Billing", detail: `Payment for invoice ${inv.invoiceNo}` } });
    }
    res.json(inv);
  } catch (error) {
    console.error("Error updating invoice:", error);
    fail(res, 500, "Failed to update invoice");
  }
}

async function deleteInvoice(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    await db.invoice.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    fail(res, 500, "Failed to delete invoice");
  }
}

export function invoicesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listInvoices));
  r.post("/", requirePermission("Billing", "create"), wrap(createInvoice));
  r.get("/:id", wrap(getInvoice));
  r.patch("/:id", wrap(updateInvoice));
  r.delete("/:id", wrap(deleteInvoice));
  return r;
}

// ════════════════════════════════════════════════════════════════
// Patient payments — /api/patient-payments and /api/patient-payments/[id]
// ════════════════════════════════════════════════════════════════

async function listPatientPayments(_req: Request, res: Response) {
  const payments = await db.patientPayment.findMany({ orderBy: { date: "desc" } });
  res.json(payments);
}

async function createPatientPayment(req: Request, res: Response) {
  const body = req.body || {};
  const count = await db.patientPayment.count();
  const payment = await db.patientPayment.create({
    data: { ...body, receiptNo: `RCP-${nanoid(8).toUpperCase()}` },
  });
  // Auto journal entry
  const cashAcc = await db.account.findFirst({ where: { code: "1000" } });
  const revAcc = await db.account.findFirst({ where: { code: "4000" } });
  if (cashAcc && revAcc) {
    const jeCount = await db.journalEntry.count();
    await db.journalEntry.create({
      data: {
        entryNo: `JE-${String(jeCount + 1).padStart(5, "0")}`,
        description: `Payment received from ${body.patientName}`,
        reference: payment.receiptNo,
        module: "billing",
        totalDebit: body.amount, totalCredit: body.amount,
        status: "posted", createdBy: "system",
        items: {
          create: [
            { accountId: cashAcc.id, debit: body.amount, credit: 0 },
            { accountId: revAcc.id, debit: 0, credit: body.amount },
          ],
        },
      },
    });
  }
  await db.auditLog.create({ data: { user: "system", action: "CREATE", module: "Payment", detail: `Payment ${payment.receiptNo}` } });
  res.status(201).json(payment);
}

async function deletePatientPayment(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.patientPayment.delete({ where: { id } });
  res.json({ ok: true });
}

export function patientPaymentsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listPatientPayments));
  r.post("/", wrap(createPatientPayment));
  r.delete("/:id", wrap(deletePatientPayment));
  return r;
}

// ════════════════════════════════════════════════════════════════
// Expenses — /api/expenses and /api/expenses/[id]
// ════════════════════════════════════════════════════════════════

async function listExpenses(req: Request, res: Response) {
  try {
    const branchId = req.query.branchId as string | undefined;
    const where: Record<string, unknown> = {};
    if (branchId) where.branchId = branchId;
    const expenses = await db.expense.findMany({ where, orderBy: { date: "desc" } });
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const byCategory: Record<string, number> = {};
    expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
    res.json({ expenses, total, byCategory });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    fail(res, 500, "Failed to fetch expenses");
  }
}

async function createExpense(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const { category, description, amount, date, paymentMode, branchId } = body;
    if (!category || !amount) {
      return fail(res, 400, "Category and amount are required");
    }
    const expense = await db.expense.create({
      data: { category, description: description || "", amount: Number(amount), date: date ? new Date(date) : new Date(), paymentMode: paymentMode || "cash", branchId: branchId || null, code: generateNanoCode("EXP-") },
    });
    await db.auditLog.create({ data: { user: getCurrentUserEmail() || "system@carelim.health", action: "CREATE", module: "Expense", detail: `Recorded expense ${expense.code}` } });
    res.status(201).json(expense);
  } catch (error) {
    console.error("Error creating expense:", error);
    fail(res, 500, "Failed to create expense");
  }
}

async function deleteExpense(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    await db.expense.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    fail(res, 500, "Failed to delete expense");
  }
}

export function expensesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listExpenses));
  r.post("/", wrap(createExpense));
  r.delete("/:id", wrap(deleteExpense));
  return r;
}

// ════════════════════════════════════════════════════════════════
// Bank transactions — /api/bank-transactions
// ════════════════════════════════════════════════════════════════

async function listBankTransactions(_req: Request, res: Response) {
  const txns = await db.bankTransaction.findMany({ orderBy: { date: "desc" }, take: 50 });
  res.json(txns);
}

export function bankTransactionsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listBankTransactions));
  return r;
}

// ════════════════════════════════════════════════════════════════
// Cash transactions — /api/cash-transactions
// ════════════════════════════════════════════════════════════════

async function listCashTransactions(_req: Request, res: Response) {
  const txns = await db.cashTransaction.findMany({ orderBy: { date: "desc" }, take: 50 });
  res.json(txns);
}

export function cashTransactionsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listCashTransactions));
  return r;
}

// ════════════════════════════════════════════════════════════════
// Chart of accounts — /api/chart-of-accounts
// ════════════════════════════════════════════════════════════════

async function listAccounts(_req: Request, res: Response) {
  const accounts = await db.account.findMany({ orderBy: { code: "asc" } });
  res.json(accounts);
}

export function chartOfAccountsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listAccounts));
  return r;
}

// ════════════════════════════════════════════════════════════════
// Journal entries — /api/journal-entries
// ════════════════════════════════════════════════════════════════

async function listJournalEntries(_req: Request, res: Response) {
  const entries = await db.journalEntry.findMany({
    include: { items: { include: { account: true } } },
    orderBy: { date: "desc" },
    take: 100,
  });
  res.json(entries);
}

export function journalEntriesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listJournalEntries));
  return r;
}

// ════════════════════════════════════════════════════════════════
// Accounting dashboard — /api/accounting-dashboard
// ════════════════════════════════════════════════════════════════

async function getAccountingDashboard(req: Request, res: Response) {
  const branchId = req.query.branchId as string | undefined;
  const branchFilter: Record<string, unknown> = branchId ? { branchId } : {};
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfPrevMonth = startOfMonth;

  const [invoices, monthInvoices, prevMonthInvoices, expenses, monthExpenses, prevMonthExpenses, patientPayments, todayPayments, supplierPayments, commissions, claims, cashTxns, bankTxns, journalEntries, pharmacySales, labOrders, radiologyTests] = await Promise.all([
    db.invoice.findMany({ where: branchFilter }),
    db.invoice.findMany({ where: { ...branchFilter, date: { gte: startOfMonth } } }),
    db.invoice.findMany({ where: { ...branchFilter, date: { gte: startOfPrevMonth, lt: endOfPrevMonth } } }),
    db.expense.findMany({ where: branchFilter }),
    db.expense.findMany({ where: { ...branchFilter, date: { gte: startOfMonth } } }),
    db.expense.findMany({ where: { ...branchFilter, date: { gte: startOfPrevMonth, lt: endOfPrevMonth } } }),
    db.patientPayment.findMany(),
    db.patientPayment.findMany({ where: { date: { gte: startOfDay, lt: endOfDay } } }),
    db.supplierPayment.findMany(),
    db.doctorCommission.findMany(),
    db.insuranceClaim.findMany(),
    db.cashTransaction.findMany({ orderBy: { date: "desc" }, take: 50 }),
    db.bankTransaction.findMany({ orderBy: { date: "desc" }, take: 50 }),
    db.journalEntry.findMany({ include: { items: { include: { account: true } } }, orderBy: { date: "desc" }, take: 10 }),
    db.pharmacySale.findMany({ where: { ...branchFilter, saleDate: { gte: startOfMonth } } }),
    db.labOrder.findMany({ where: { orderedAt: { gte: startOfMonth } } }),
    db.radiologyStudy.findMany({ where: { ...branchFilter, createdAt: { gte: startOfMonth } }, include: { modality: true } }),
  ]);

  // Financial position
  const cashInHand = cashTxns.length > 0 ? cashTxns[0].balanceAfter : 0;
  const bankBalance = bankTxns.length > 0 ? bankTxns[0].balanceAfter : 0;
  const pettyCash = Math.round(cashInHand * 0.1);
  const totalCashPosition = cashInHand + bankBalance + pettyCash;

  // Receivables & Payables
  const accountsReceivable = invoices.reduce((s, i) => s + i.due, 0);
  const accountsPayable = supplierPayments.reduce((s, sp) => s + sp.amount, 0);
  const patientOutstanding = invoices.filter(i => i.due > 0).reduce((s, i) => s + i.due, 0);
  const insuranceReceivable = claims.filter(c => c.status === "approved" || c.status === "submitted").reduce((s, c) => s + c.claimAmount, 0);
  const supplierOutstanding = supplierPayments.filter(sp => !sp.purchaseOrderId).reduce((s, sp) => s + sp.amount, 0);

  // Monthly P&L
  const monthRevenue = monthInvoices.reduce((s, i) => s + i.total, 0);
  const prevMonthRevenue = prevMonthInvoices.reduce((s, i) => s + i.total, 0);
  const monthExpenseTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const prevMonthExpense = prevMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const grossProfit = monthRevenue - (monthExpenseTotal * 0.6);
  const netProfit = monthRevenue - monthExpenseTotal;
  const prevNetProfit = prevMonthRevenue - prevMonthExpense;

  // Cash flow
  const cashInflow = todayPayments.reduce((s, p) => s + p.amount, 0);
  const cashOutflow = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const cashFlowStatus = cashInflow - cashOutflow;

  // Revenue by type (department)
  const revenueByType: Record<string, number> = {};
  monthInvoices.forEach(i => { revenueByType[i.type] = (revenueByType[i.type] || 0) + i.total; });

  // Revenue by doctor
  const doctors = await db.doctor.findMany({ include: { appointments: { where: { date: { gte: startOfMonth } } } } });
  const revenueByDoctor = doctors.map(d => ({
    name: d.name,
    revenue: d.appointments.length * d.consultationFee,
    patients: d.appointments.length,
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  // Expense breakdown
  const expenseByCategory: Record<string, number> = {};
  monthExpenses.forEach(e => { expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount; });

  // Monthly trend (6 months)
  const monthlyTrend: { month: string; revenue: number; expense: number; profit: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const mInvs = await db.invoice.findMany({ where: { date: { gte: d, lt: dn } } });
    const mExps = await db.expense.findMany({ where: { date: { gte: d, lt: dn } } });
    const rev = mInvs.reduce((s, inv) => s + inv.total, 0);
    const exp = mExps.reduce((s, e) => s + e.amount, 0);
    monthlyTrend.push({ month: d.toLocaleDateString("en-US", { month: "short" }), revenue: rev, expense: exp, profit: rev - exp });
  }

  // AR Aging
  const arAging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
  invoices.filter(i => i.due > 0).forEach(i => {
    const days = Math.floor((today.getTime() - new Date(i.date).getTime()) / 86400000);
    if (days <= 0) arAging.current += i.due;
    else if (days <= 30) arAging.days30 += i.due;
    else if (days <= 60) arAging.days60 += i.due;
    else if (days <= 90) arAging.days90 += i.due;
    else arAging.over90 += i.due;
  });

  // AP Aging
  const apAging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
  supplierPayments.forEach(sp => {
    const days = Math.floor((today.getTime() - new Date(sp.date).getTime()) / 86400000);
    const amt = sp.amount;
    if (days <= 0) apAging.current += amt;
    else if (days <= 30) apAging.days30 += amt;
    else if (days <= 60) apAging.days60 += amt;
    else if (days <= 90) apAging.days90 += amt;
    else apAging.over90 += amt;
  });

  // Insurance status
  const insuranceStatus = {
    pending: claims.filter(c => c.status === "pending" || c.status === "submitted").length,
    approved: claims.filter(c => c.status === "approved").length,
    rejected: claims.filter(c => c.status === "rejected").length,
    paid: claims.filter(c => c.status === "paid").length,
    pendingAmount: claims.filter(c => c.status === "pending" || c.status === "submitted").reduce((s, c) => s + c.claimAmount, 0),
    paidAmount: claims.filter(c => c.status === "paid").reduce((s, c) => s + (c.approvedAmount || c.claimAmount), 0),
  };

  // Cash vs Bank
  const cashVsBank = [
    { name: "Cash", value: cashInHand },
    { name: "Bank", value: bankBalance },
    { name: "Petty Cash", value: pettyCash },
  ];

  // Helper for percentage change
  const pctChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  res.json({
    kpis: {
      cashInHand, bankBalance, pettyCash, totalCashPosition,
      accountsReceivable, accountsPayable,
      patientOutstanding, insuranceReceivable, supplierOutstanding,
      monthRevenue, prevMonthRevenue, monthRevenueChange: pctChange(monthRevenue, prevMonthRevenue),
      monthExpense: monthExpenseTotal, prevMonthExpense, monthExpenseChange: pctChange(monthExpenseTotal, prevMonthExpense),
      grossProfit, netProfit, prevNetProfit, netProfitChange: pctChange(netProfit, prevNetProfit),
      cashFlowStatus,
    },
    revenueByType: Object.entries(revenueByType).map(([name, value]) => ({ name, value })),
    revenueByDoctor,
    expenseByCategory: Object.entries(expenseByCategory).map(([name, value]) => ({ name, value })),
    monthlyTrend,
    arAging,
    apAging,
    insuranceStatus,
    cashVsBank,
    recentTransactions: journalEntries.map(je => ({
      entryNo: je.entryNo, date: je.date, description: je.description,
      module: je.module, totalDebit: je.totalDebit, totalCredit: je.totalCredit,
      items: je.items.map(it => ({ accountName: it.account.name, debit: it.debit, credit: it.credit })),
    })),
  });
}

export function accountingDashboardRouter(): Router {
  const r = Router();
  r.get("/", wrap(getAccountingDashboard));
  return r;
}

// ════════════════════════════════════════════════════════════════
// Payroll — /api/payroll and /api/payroll/[id]
// ════════════════════════════════════════════════════════════════

async function listPayrolls(_req: Request, res: Response) {
  const payrolls = await db.payroll.findMany({ include: { staff: true }, orderBy: { month: "desc" } });
  res.json(payrolls);
}

async function createPayroll(req: Request, res: Response) {
  const body = req.body || {};
  const payroll = await db.payroll.create({
    data: {
      ...body,
      netPay: body.basicSalary + (body.allowance || 0) - (body.deduction || 0),
    },
  });
  await db.auditLog.create({ data: { user: getCurrentUserEmail() || "system@carelim.health", action: "CREATE", module: "Payroll", detail: `Created payroll for ${body.month}` } });
  res.status(201).json(payroll);
}

async function updatePayroll(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.status === "paid") data.paidAt = new Date();
  const payroll = await db.payroll.update({ where: { id }, data: data as never });
  res.json(payroll);
}

export function payrollRouter(): Router {
  const r = Router();
  r.get("/", wrap(listPayrolls));
  r.post("/", wrap(createPayroll));
  r.patch("/:id", wrap(updatePayroll));
  return r;
}

// ════════════════════════════════════════════════════════════════
// Leave — /api/leave and /api/leave/[id]
// ════════════════════════════════════════════════════════════════

async function listLeave(req: Request, res: Response) {
  try {
    const leaves = await db.leaveRequest.findMany({ include: { staff: true }, orderBy: { createdAt: "desc" } });
    res.json(leaves);
  } catch (error) {
    console.error("Failed to fetch leave requests:", error);
    fail(res, 500, "Failed to fetch leave requests");
  }
}

async function createLeave(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const result = await buildLeaveCreateData(body);
    if ("error" in result) {
      return fail(res, 400, result.error as string);
    }
    const leave = await db.leaveRequest.create({ data: result.data });
    res.status(201).json(leave);
  } catch (error) {
    console.error("Failed to create leave request:", error);
    fail(res, 500, "Failed to create leave request");
  }
}

async function updateLeave(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const body = req.body || {};
    const data: Record<string, unknown> = {};
    if (typeof body.status === "string" && STATUSES.includes(body.status)) data.status = body.status;
    if (typeof body.type === "string" && LEAVE_TYPES.includes(body.type)) data.type = body.type;
    if (typeof body.reason === "string") data.reason = body.reason;
    if (body.startDate) {
      const d = new Date(String(body.startDate));
      if (!isNaN(d.getTime())) data.startDate = d;
    }
    if (body.endDate) {
      const d = new Date(String(body.endDate));
      if (!isNaN(d.getTime())) data.endDate = d;
    }
    if (Object.keys(data).length === 0) {
      return fail(res, 400, "No valid fields to update");
    }
    const leave = await db.leaveRequest.update({ where: { id }, data: data as never });
    res.json(leave);
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2025") {
      return fail(res, 404, "Leave request not found");
    }
    console.error("[PATCH /api/leave/[id]]", error);
    fail(res, 500, "Failed to update leave request");
  }
}

async function deleteLeave(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    await db.leaveRequest.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2025") {
      return fail(res, 404, "Leave request not found");
    }
    console.error("[DELETE /api/leave/[id]]", error);
    fail(res, 500, "Failed to delete leave request");
  }
}

export function leaveRouter(): Router {
  const r = Router();
  r.get("/", wrap(listLeave));
  r.post("/", wrap(createLeave));
  r.patch("/:id", wrap(updateLeave));
  r.delete("/:id", wrap(deleteLeave));
  return r;
}

// ════════════════════════════════════════════════════════════════
// Leave requests — /api/leave-requests and /api/leave-requests/[id]
// ════════════════════════════════════════════════════════════════

async function listLeaveRequests(_req: Request, res: Response) {
  try {
    const requests = await db.leaveRequest.findMany({
      include: { staff: { select: { id: true, name: true, email: true, department: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(requests);
  } catch (error) {
    console.error("Failed to fetch leave requests:", error);
    fail(res, 500, "Failed to fetch leave requests");
  }
}

async function createLeaveRequest(req: Request, res: Response) {
  try {
    const body = req.body || {};
    // Whitelisted payload — the CMS form sends an extra `days` field that is
    // not on the model (previously caused a Prisma "Unknown argument" 500)
    const result = await buildLeaveCreateData(body);
    if ("error" in result) {
      return fail(res, 400, result.error as string);
    }
    const request = await db.leaveRequest.create({ data: result.data });
    res.status(201).json(request);
  } catch (error) {
    console.error("Failed to create leave request:", error);
    fail(res, 500, "Failed to create leave request");
  }
}

async function updateLeaveRequest(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const body = req.body || {};
    const data: Record<string, unknown> = {};
    if (typeof body.status === "string" && STATUSES.includes(body.status)) data.status = body.status;
    if (typeof body.reason === "string") data.reason = body.reason;
    if (Object.keys(data).length === 0) {
      return fail(res, 400, "No valid fields to update");
    }
    const leave = await db.leaveRequest.update({
      where: { id },
      data: data as never,
      include: { staff: { select: { id: true, name: true, email: true, department: true } } },
    });
    res.json(leave);
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2025") {
      return fail(res, 404, "Leave request not found");
    }
    console.error("[PATCH /api/leave-requests/[id]]", error);
    fail(res, 500, "Failed to update leave request");
  }
}

async function deleteLeaveRequest(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    await db.leaveRequest.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2025") {
      return fail(res, 404, "Leave request not found");
    }
    console.error("[DELETE /api/leave-requests/[id]]", error);
    fail(res, 500, "Failed to delete leave request");
  }
}

export function leaveRequestsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listLeaveRequests));
  r.post("/", wrap(createLeaveRequest));
  r.patch("/:id", wrap(updateLeaveRequest));
  r.delete("/:id", wrap(deleteLeaveRequest));
  return r;
}