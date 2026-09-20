/**
 * Pharmacy & Inventory module — port of frontend /api routes:
 * medicines, medicine-batches, pharmacy-sales, pharmacy-dashboard,
 * inventory-items, inventory-locations, inventory-movements,
 * inventory-dashboard, stock-audits, stock-movements, stock-transfers,
 * purchase-orders, purchase-returns, sales-returns, suppliers,
 * supplier-payments.
 * Tenant isolation enforced by lib/prisma.ts (all models are tenant-scoped).
 */
import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { db } from "../lib/prisma";
import { fail, wrap } from "../lib/http";
import { requirePermission } from "../middleware/permissions";
import { getCurrentUserEmail } from "../lib/tenant-context";

// ---------------------------------------------------------------------------
// Inline helpers (identical to the frontend originals)
// ---------------------------------------------------------------------------

/** Port of frontend getAuthEmail(req): header email or default. */
function authEmail(): string {
  return getCurrentUserEmail() || "system@carelim.health";
}

/**
 * Inline nanoid equivalent (nanoid is not a backend dependency).
 * Same algorithm & 64-char url-safe alphabet as the nanoid package.
 */
const URL_ALPHABET =
  "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict";

function nanoid(size = 21): string {
  const bytes = randomBytes(size);
  let id = "";
  for (let i = 0; i < size; i++) id += URL_ALPHABET[bytes[i] % URL_ALPHABET.length];
  return id;
}

// ---------------------------------------------------------------------------
// medicines — /api/medicines, /api/medicines/[id]
// ---------------------------------------------------------------------------

async function listMedicines(req: Request, res: Response) {
  const q = (req.query.q as string) || "";
  const branchId = req.query.branchId as string | undefined;
  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  if (q) {
    where.OR = [{ name: { contains: q } }, { genericName: { contains: q } }, { batchNo: { contains: q } }, { barcode: { contains: q } }];
  }
  const medicines = await db.medicine.findMany({ where, include: { supplier: true }, orderBy: { name: "asc" } });
  res.json(medicines);
}

async function createMedicine(req: Request, res: Response) {
  const body = req.body || {};
  const { name, genericName, batchNo, barcode, category, dosageForm, strength, unit, purchasePrice, mrp, salePrice, wholesalePrice, expiryDate, supplierId, minStock, reorderLevel, description } = body;
  if (!name || !batchNo) {
    return fail(res, 400, "Medicine name and batch number are required");
  }
  const med = await db.medicine.create({
    data: {
      name, genericName: genericName || null, batchNo, barcode: barcode || null,
      category: category || "General", dosageForm: dosageForm || null, strength: strength || null,
      purchasePrice: purchasePrice || 0, mrp: mrp || 0, salePrice: salePrice || 0, wholesalePrice: wholesalePrice || 0,
      expiryDate: expiryDate ? new Date(expiryDate) : new Date(), supplierId: supplierId || null,
    },
  });
  await db.auditLog.create({ data: { user: authEmail(), action: "CREATE", module: "Medicine", detail: `Added medicine ${med.name}` } });
  res.status(201).json(med);
}

async function getMedicine(req: Request, res: Response) {
  const id = req.params.id as string;
  const med = await db.medicine.findUnique({ where: { id }, include: { supplier: true } });
  if (!med) return fail(res, 404, "Not found");
  res.json(med);
}

async function updateMedicine(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  if (body.expiryDate) body.expiryDate = new Date(body.expiryDate);
  const med = await db.medicine.update({ where: { id }, data: body });
  res.json(med);
}

async function deleteMedicine(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.medicine.delete({ where: { id } });
  res.json({ ok: true });
}

export function medicinesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listMedicines));
  r.post("/", wrap(createMedicine));
  r.get("/:id", wrap(getMedicine));
  r.put("/:id", wrap(updateMedicine));
  r.delete("/:id", wrap(deleteMedicine));
  return r;
}

// ---------------------------------------------------------------------------
// medicine-batches — /api/medicine-batches
// ---------------------------------------------------------------------------

async function listBatches(req: Request, res: Response) {
  const medicineId = req.query.medicineId as string | undefined;
  const where: Record<string, unknown> = {};
  if (medicineId) where.medicineId = medicineId;
  const batches = await db.medicineBatch.findMany({
    where,
    include: { medicine: true },
    orderBy: { expiryDate: "asc" },
  });
  res.json(batches);
}

async function createBatch(req: Request, res: Response) {
  const body = req.body || {};
  const batch = await db.medicineBatch.create({
    data: {
      ...body,
      expiryDate: new Date(body.expiryDate),
      manufactureDate: body.manufactureDate ? new Date(body.manufactureDate) : null,
    },
  });
  res.status(201).json(batch);
}

export function medicineBatchesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listBatches));
  r.post("/", wrap(createBatch));
  return r;
}

// ---------------------------------------------------------------------------
// pharmacy-sales — /api/pharmacy-sales, /api/pharmacy-sales/[id]
// ---------------------------------------------------------------------------

async function listSales(req: Request, res: Response) {
  const branchId = req.query.branchId as string | undefined;
  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  const sales = await db.pharmacySale.findMany({
    where,
    include: { items: { include: { medicine: true } } },
    orderBy: { saleDate: "desc" },
  });
  res.json(sales);
}

async function createSale(req: Request, res: Response) {
  const body = req.body || {};
  const { items, patientName, doctorName, prescriptionRef, discount, tax, paymentMethod, branchId, paidAmount } = body;
  const userEmail = authEmail();

  // Compute subtotal with per-item discounts
  const subtotal = items.reduce((s: number, it: { unitPrice: number; quantity: number; discount?: number }) =>
    s + it.unitPrice * it.quantity - (Number(it.discount) || 0), 0);
  const total = Math.max(0, subtotal - (discount || 0) + (tax || 0));
  const finalPaidAmount = paidAmount !== undefined ? Number(paidAmount) : total;
  const paymentStatus = finalPaidAmount >= total ? "paid" : finalPaidAmount > 0 ? "partial" : "unpaid";

  // Use transaction to ensure stock and sale are consistent
  const sale = await db.$transaction(async (tx) => {
    // Generate sequential invoice number: PH-00001, PH-00002, ...
    const count = await tx.pharmacySale.count();
    const invoiceNo = `PH-${String(count + 1).padStart(5, "0")}`;

    const saleRecord = await tx.pharmacySale.create({
      data: {
        invoiceNo,
        branchId: branchId || null,
        patientName,
        doctorName,
        prescriptionRef,
        subtotal,
        discount: discount || 0,
        tax: tax || 0,
        total,
        paidAmount: finalPaidAmount,
        paymentMethod: paymentMethod || "Cash",
        paymentStatus,
        status: "completed",
        items: {
          create: items.map((it: { medicineId: string; quantity: number; unitPrice: number; discount?: number }) => ({
            medicineId: it.medicineId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: Number(it.discount) || 0,
            total: it.unitPrice * it.quantity - (Number(it.discount) || 0),
          })),
        },
      },
      include: { items: true },
    });

    // Reduce stock atomically
    for (const item of saleRecord.items) {
      const med = await tx.medicine.findUnique({ where: { id: item.medicineId } });
      if (med) {
        const newQty = Math.max(0, med.stockQty - item.quantity);
        await tx.medicine.update({ where: { id: item.medicineId }, data: { stockQty: newQty } });
        await tx.stockMovement.create({
          data: {
            medicineId: item.medicineId,
            type: "sale",
            quantity: -item.quantity,
            balanceAfter: newQty,
            reference: saleRecord.invoiceNo,
            performedBy: userEmail,
          },
        });
      }
    }

    await tx.auditLog.create({ data: { user: userEmail, action: "CREATE", module: "PharmacySale", detail: `Sale ${saleRecord.invoiceNo}` } });
    return saleRecord;
  });

  res.status(201).json(sale);
}

async function updateSale(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const userEmail = authEmail();

  const existing = await db.pharmacySale.findUnique({ where: { id } });
  if (!existing) return fail(res, 404, "Not found");

  const paidAmount = body.paidAmount !== undefined ? Number(body.paidAmount) : existing.paidAmount;
  const paymentStatus = paidAmount >= existing.total ? "paid" : paidAmount > 0 ? "partial" : "unpaid";

  const sale = await db.pharmacySale.update({
    where: { id },
    data: {
      patientName: body.patientName ?? existing.patientName,
      doctorName: body.doctorName !== undefined ? body.doctorName : existing.doctorName,
      paymentMethod: body.paymentMethod ?? existing.paymentMethod,
      paidAmount,
      paymentStatus,
    },
  });

  await db.auditLog.create({ data: { user: userEmail, action: "UPDATE", module: "PharmacySale", detail: `Sale ${existing.invoiceNo}` } });
  res.json(sale);
}

async function deleteSale(req: Request, res: Response) {
  const id = req.params.id as string;
  const userEmail = authEmail();

  const existing = await db.pharmacySale.findUnique({ where: { id }, include: { items: true } });
  if (!existing) return fail(res, 404, "Not found");

  await db.$transaction(async (tx) => {
    // Restore stock for each item
    for (const item of existing.items) {
      const med = await tx.medicine.findUnique({ where: { id: item.medicineId } });
      if (med) {
        const newQty = med.stockQty + item.quantity;
        await tx.medicine.update({ where: { id: item.medicineId }, data: { stockQty: newQty } });
        await tx.stockMovement.create({
          data: {
            medicineId: item.medicineId,
            type: "adjustment",
            quantity: item.quantity,
            balanceAfter: newQty,
            reference: existing.invoiceNo,
            performedBy: userEmail,
          },
        });
      }
    }
    await tx.pharmacySaleItem.deleteMany({ where: { saleId: id } });
    await tx.pharmacySale.delete({ where: { id } });
    await tx.auditLog.create({ data: { user: userEmail, action: "DELETE", module: "PharmacySale", detail: `Sale ${existing.invoiceNo}` } });
  });

  res.json({ success: true });
}

export function pharmacySalesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listSales));
  r.post("/", requirePermission("Pharmacy", "create"), wrap(createSale));
  r.patch("/:id", wrap(updateSale));
  r.delete("/:id", wrap(deleteSale));
  return r;
}

// ---------------------------------------------------------------------------
// pharmacy-dashboard — /api/pharmacy-dashboard
// ---------------------------------------------------------------------------

async function getPharmacyDashboard(_req: Request, res: Response) {
  const branchId = _req.query.branchId as string | undefined;
  const branchFilter = branchId ? { branchId } : {};
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [medicines, todaySales, todayPurchases, allSales, monthSales, purchaseOrders, suppliers, salesReturns, purchaseReturns] = await Promise.all([
    db.medicine.findMany({ where: branchFilter, include: { supplier: true, batches: true } }),
    db.pharmacySale.findMany({ where: { ...branchFilter, saleDate: { gte: startOfDay, lt: endOfDay } } }),
    db.purchaseOrder.findMany({ where: { orderDate: { gte: startOfDay, lt: endOfDay } } }),
    db.pharmacySale.findMany({ where: branchFilter }),
    db.pharmacySale.findMany({ where: { ...branchFilter, saleDate: { gte: startOfMonth } } }),
    db.purchaseOrder.findMany({ include: { supplier: true, items: true } }),
    db.supplier.findMany(),
    db.salesReturn.findMany(),
    db.purchaseReturn.findMany(),
  ]);

  const totalInventoryValue = medicines.reduce((s, m) => s + (m.purchasePrice * m.stockQty), 0);
  const todaySalesTotal = todaySales.reduce((s, sale) => s + sale.total, 0);
  const todayPurchasesTotal = todayPurchases.reduce((s, po) => s + po.totalAmount, 0);
  const todayProfit = todaySales.reduce((s, sale) => s + (sale.subtotal - sale.total * 0.7), 0);
  const lowStock = medicines.filter(m => m.stockQty <= m.reorderLevel && m.stockQty > 0);
  const outOfStock = medicines.filter(m => m.stockQty === 0);
  const nearExpiry = medicines.filter(m => {
    const days = Math.floor((m.expiryDate.getTime() - today.getTime()) / 86400000);
    return days <= 30 && days >= 0;
  });
  const expired = medicines.filter(m => m.expiryDate < today);
  const pendingPOs = purchaseOrders.filter(po => po.status === "draft" || po.status === "sent");
  const pendingSupplierPayments = purchaseOrders.filter(po => po.paidAmount < po.totalAmount);
  const pendingCustomerDues = allSales.filter(s => s.paymentStatus !== "paid");

  // Monthly sales trend (last 6 months)
  const monthlyTrend: { month: string; sales: number; purchases: number; profit: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const s = await db.pharmacySale.findMany({ where: { ...branchFilter, saleDate: { gte: d, lt: dn } } });
    const p = await db.purchaseOrder.findMany({ where: { orderDate: { gte: d, lt: dn } } });
    const salesTotal = s.reduce((sum, sale) => sum + sale.total, 0);
    monthlyTrend.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      sales: salesTotal,
      purchases: p.reduce((sum, po) => sum + po.totalAmount, 0),
      profit: Math.round(salesTotal * 0.3),
    });
  }

  // Revenue by category
  const categoryRevenue: Record<string, number> = {};
  allSales.forEach(sale => {
    // We'd need items for accurate category revenue, approximate from medicine categories
  });
  const categoryStock: Record<string, { value: number; count: number }> = {};
  medicines.forEach(m => {
    if (!categoryStock[m.category]) categoryStock[m.category] = { value: 0, count: 0 };
    categoryStock[m.category].value += m.salePrice * m.stockQty;
    categoryStock[m.category].count++;
  });
  const revenueByCategory = Object.entries(categoryStock).map(([name, data]) => ({ name, value: Math.round(data.value), count: data.count }));

  // Top selling medicines (by sale item count)
  const saleItems = await db.pharmacySaleItem.findMany({ where: { sale: branchFilter }, include: { medicine: true } });
  const medSales: Record<string, { name: string; qty: number; revenue: number }> = {};
  saleItems.forEach(si => {
    const key = si.medicineId;
    if (!medSales[key]) medSales[key] = { name: si.medicine.name, qty: 0, revenue: 0 };
    medSales[key].qty += si.quantity;
    medSales[key].revenue += si.total;
  });
  const topSelling = Object.values(medSales).sort((a, b) => b.qty - a.qty).slice(0, 8);
  const fastMoving = Object.values(medSales).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const slowMoving = medicines.filter(m => !medSales[m.id]).slice(0, 5).map(m => ({ name: m.name, qty: 0, revenue: 0 }));

  // Expiry trend
  const expiryBuckets = { expired: expired.length, days7: 0, days15: 0, days30: 0, days60: 0 };
  medicines.forEach(m => {
    const days = Math.floor((m.expiryDate.getTime() - today.getTime()) / 86400000);
    if (days < 0) expiryBuckets.expired++;
    else if (days <= 7) expiryBuckets.days7++;
    else if (days <= 15) expiryBuckets.days15++;
    else if (days <= 30) expiryBuckets.days30++;
    else if (days <= 60) expiryBuckets.days60++;
  });

  // ABC Analysis (by revenue contribution)
  const abcData = Object.values(medSales).sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = abcData.reduce((s, d) => s + d.revenue, 0);
  let cumulative = 0;
  const abcAnalysis = abcData.map(d => {
    cumulative += d.revenue;
    const pct = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0;
    return { ...d, classification: pct <= 70 ? "A" : pct <= 90 ? "B" : "C", cumulativePct: Math.round(pct) };
  });

  // Live widgets
  const todayExpiring = medicines.filter(m => {
    const days = Math.floor((m.expiryDate.getTime() - today.getTime()) / 86400000);
    return days <= 7 && days >= 0;
  }).slice(0, 5);
  const recentSales = allSales.sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime()).slice(0, 5);
  const recentPurchases = purchaseOrders.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime()).slice(0, 5);
  const pendingTransferRequests: unknown[] = []; // Would come from a transfer model

  res.json({
    kpis: {
      totalMedicines: medicines.length,
      totalInventoryValue,
      todaySales: todaySalesTotal,
      todayPurchases: todayPurchasesTotal,
      todayProfit,
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
      nearExpiry: nearExpiry.length,
      expired: expired.length,
      pendingPOs: pendingPOs.length,
      pendingSupplierPayments: pendingSupplierPayments.length,
      pendingCustomerDues: pendingCustomerDues.length,
    },
    monthlyTrend,
    revenueByCategory,
    topSelling,
    fastMoving,
    slowMoving,
    expiryBuckets,
    abcAnalysis: abcAnalysis.slice(0, 10),
    todayExpiring: todayExpiring.map(m => ({ id: m.id, name: m.name, batchNo: m.batchNo, expiryDate: m.expiryDate, stockQty: m.stockQty })),
    lowStockAlerts: lowStock.map(m => ({ id: m.id, name: m.name, stockQty: m.stockQty, reorderLevel: m.reorderLevel, supplier: m.supplier?.name })),
    recentSales: recentSales.map(s => ({ invoiceNo: s.invoiceNo, patientName: s.patientName, total: s.total, saleDate: s.saleDate, paymentMethod: s.paymentMethod })),
    recentPurchases: recentPurchases.map(p => ({ poNumber: p.poNumber, supplier: p.supplier?.name, totalAmount: p.totalAmount, status: p.status, orderDate: p.orderDate })),
    pendingPOs: pendingPOs.map(p => ({ poNumber: p.poNumber, supplier: p.supplier?.name, totalAmount: p.totalAmount, status: p.status })),
    pendingTransfers: pendingTransferRequests.length,
  });
}

export function pharmacyDashboardRouter(): Router {
  const r = Router();
  r.get("/", wrap(getPharmacyDashboard));
  return r;
}

// ---------------------------------------------------------------------------
// inventory-items — /api/inventory-items, /api/inventory-items/[id]
// ---------------------------------------------------------------------------

async function listInventoryItems(_req: Request, res: Response) {
  const items = await db.inventoryItem.findMany({
    include: { stocks: { include: { location: true } }, batches: true },
    orderBy: { name: "asc" },
  });
  res.json(items);
}

async function createInventoryItem(req: Request, res: Response) {
  const body = req.body || {};
  const item = await db.inventoryItem.create({ data: body });
  await db.auditLog.create({ data: { user: "admin@medcore.health", action: "CREATE", module: "Inventory", detail: `Created item ${item.name}` } });
  res.status(201).json(item);
}

async function updateInventoryItem(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const item = await db.inventoryItem.update({ where: { id }, data: body });
  res.json(item);
}

async function deleteInventoryItem(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.inventoryItem.delete({ where: { id } });
  res.json({ ok: true });
}

export function inventoryItemsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listInventoryItems));
  r.post("/", wrap(createInventoryItem));
  r.put("/:id", wrap(updateInventoryItem));
  r.delete("/:id", wrap(deleteInventoryItem));
  return r;
}

// ---------------------------------------------------------------------------
// inventory-locations — /api/inventory-locations, /api/inventory-locations/[id]
// ---------------------------------------------------------------------------

async function listInventoryLocations(_req: Request, res: Response) {
  const locations = await db.inventoryLocation.findMany({
    include: { _count: { select: { stocks: true, transfersFrom: true, transfersTo: true } } },
    orderBy: { name: "asc" },
  });
  res.json(locations);
}

async function createInventoryLocation(req: Request, res: Response) {
  const body = req.body || {};
  if (!body.code) {
    const count = await db.inventoryLocation.count();
    body.code = `LOC-${String(count + 1).padStart(3, "0")}`;
  }
  const loc = await db.inventoryLocation.create({ data: body });
  res.status(201).json(loc);
}

async function updateInventoryLocation(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const loc = await db.inventoryLocation.update({ where: { id }, data: body });
  res.json(loc);
}

async function deleteInventoryLocation(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.inventoryLocation.delete({ where: { id } });
  res.json({ ok: true });
}

export function inventoryLocationsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listInventoryLocations));
  r.post("/", wrap(createInventoryLocation));
  r.put("/:id", wrap(updateInventoryLocation));
  r.delete("/:id", wrap(deleteInventoryLocation));
  return r;
}

// ---------------------------------------------------------------------------
// inventory-movements — /api/inventory-movements
// ---------------------------------------------------------------------------

async function listInventoryMovements(req: Request, res: Response) {
  const itemId = req.query.itemId as string | undefined;
  const where: Record<string, unknown> = {};
  if (itemId) where.itemId = itemId;
  const movements = await db.inventoryMovement.findMany({
    where,
    include: { item: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(movements);
}

export function inventoryMovementsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listInventoryMovements));
  return r;
}

// ---------------------------------------------------------------------------
// inventory-dashboard — /api/inventory-dashboard
// ---------------------------------------------------------------------------

async function getInventoryDashboard(_req: Request, res: Response) {
  const today = new Date();

  const [items, locations, stocks, movements, transfers, audits, batches] = await Promise.all([
    db.inventoryItem.findMany({ include: { stocks: { include: { location: true } }, batches: true } }),
    db.inventoryLocation.findMany({ include: { _count: { select: { stocks: true } } } }),
    db.inventoryStock.findMany({ include: { item: true, location: true } }),
    db.inventoryMovement.findMany({ include: { item: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.stockTransfer.findMany({ include: { fromLocation: true, toLocation: true, items: { include: { item: true } } } }),
    db.stockAudit.findMany({ include: { location: true, items: true } }),
    db.inventoryBatch.findMany(),
  ]);

  const totalInventoryValue = items.reduce((s, i) => s + (i.purchasePrice * i.stocks.reduce((ss, st) => ss + st.quantity, 0)), 0);
  const totalItems = items.length;
  const availableStock = stocks.reduce((s, st) => s + st.quantity, 0);
  const reservedStock = stocks.reduce((s, st) => s + st.reservedQty, 0);
  const damagedStock = stocks.reduce((s, st) => s + st.damagedQty, 0);
  const expiredStock = items.reduce((s, i) => s + i.batches.filter(b => b.expiryDate && b.expiryDate < today).reduce((ss, b) => ss + b.quantity, 0), 0);
  const nearExpiry = items.reduce((s, i) => s + i.batches.filter(b => {
    if (!b.expiryDate) return false;
    const days = Math.floor((b.expiryDate.getTime() - today.getTime()) / 86400000);
    return days <= 30 && days >= 0;
  }).reduce((ss, b) => ss + b.quantity, 0), 0);
  const lowStockItems = items.filter(i => {
    const totalQty = i.stocks.reduce((s, st) => s + st.quantity, 0);
    return totalQty <= i.reorderLevel && totalQty > 0;
  });
  const pendingPOs = await db.purchaseOrder.count({ where: { status: { in: ["draft", "sent", "pending"] } } });
  const pendingTransfers = transfers.filter(t => t.status === "pending" || t.status === "approved").length;

  // Stock value by category
  const categoryValue: Record<string, number> = {};
  items.forEach(i => {
    const qty = i.stocks.reduce((s, st) => s + st.quantity, 0);
    categoryValue[i.category] = (categoryValue[i.category] || 0) + (i.purchasePrice * qty);
  });
  const stockByCategory = Object.entries(categoryValue).map(([name, value]) => ({ name, value: Math.round(value) }));

  // Stock movement trend (last 7 days)
  const movementTrend: { date: string; in: number; out: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const dayMoves = await db.inventoryMovement.findMany({ where: { createdAt: { gte: ds, lt: de } } });
    movementTrend.push({
      date: d.toLocaleDateString("en-US", { weekday: "short" }),
      in: dayMoves.filter(m => m.direction === "in").reduce((s, m) => s + m.quantity, 0),
      out: dayMoves.filter(m => m.direction === "out").reduce((s, m) => s + m.quantity, 0),
    });
  }

  // Fast/slow/dead stock (based on movements)
  const itemMoveCounts: Record<string, number> = {};
  movements.forEach(m => { itemMoveCounts[m.itemId] = (itemMoveCounts[m.itemId] || 0) + m.quantity; });
  const fastMoving = Object.entries(itemMoveCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, qty]) => {
    const item = items.find(i => i.id === id);
    return { name: item?.name || "Unknown", qty };
  });
  const slowMoving = items.filter(i => !itemMoveCounts[i.id]).slice(0, 5).map(i => ({ name: i.name, qty: 0 }));
  const deadStock = items.filter(i => {
    const age = Math.floor((today.getTime() - i.createdAt.getTime()) / 86400000);
    return age > 90 && !itemMoveCounts[i.id];
  }).slice(0, 5).map(i => ({ name: i.name, days: Math.floor((today.getTime() - i.createdAt.getTime()) / 86400000) }));

  // Expiry buckets
  const expiryBuckets = { expired: 0, days30: 0, days60: 0, days90: 0 };
  batches.forEach(b => {
    if (!b.expiryDate) return;
    const days = Math.floor((b.expiryDate.getTime() - today.getTime()) / 86400000);
    if (days < 0) expiryBuckets.expired++;
    else if (days <= 30) expiryBuckets.days30++;
    else if (days <= 60) expiryBuckets.days60++;
    else if (days <= 90) expiryBuckets.days90++;
  });

  // Location-wise stock summary
  const locationSummary = locations.map(loc => ({
    id: loc.id,
    name: loc.name,
    code: loc.code,
    type: loc.type,
    itemCount: loc._count.stocks,
    stockValue: stocks.filter(s => s.locationId === loc.id).reduce((sum, s) => sum + (s.item.purchasePrice * s.quantity), 0),
  }));

  res.json({
    kpis: {
      totalInventoryValue,
      totalItems,
      availableStock,
      reservedStock,
      damagedStock,
      expiredStock,
      nearExpiry,
      lowStockCount: lowStockItems.length,
      pendingPOs,
      pendingTransfers,
    },
    stockByCategory,
    movementTrend,
    fastMoving,
    slowMoving,
    deadStock,
    expiryBuckets,
    lowStockItems: lowStockItems.map(i => ({ id: i.id, name: i.name, stockQty: i.stocks.reduce((s, st) => s + st.quantity, 0), reorderLevel: i.reorderLevel, category: i.category })),
    locationSummary,
    recentMovements: movements.slice(0, 8).map(m => ({ id: m.id, itemName: m.item.name, type: m.type, direction: m.direction, quantity: m.quantity, department: m.department, performedBy: m.performedBy, createdAt: m.createdAt })),
    pendingTransfersList: transfers.filter(t => t.status === "pending" || t.status === "approved").slice(0, 5).map(t => ({ transferNo: t.transferNo, from: t.fromLocation.name, to: t.toLocation.name, status: t.status, items: t.items.length })),
  });
}

export function inventoryDashboardRouter(): Router {
  const r = Router();
  r.get("/", wrap(getInventoryDashboard));
  return r;
}

// ---------------------------------------------------------------------------
// stock-audits — /api/stock-audits, /api/stock-audits/[id]
// ---------------------------------------------------------------------------

async function listStockAudits(_req: Request, res: Response) {
  const audits = await db.stockAudit.findMany({
    include: { location: true, items: true },
    orderBy: { auditDate: "desc" },
  });
  res.json(audits);
}

async function createStockAudit(req: Request, res: Response) {
  const body = req.body || {};
  const { locationId, items, performedBy, notes } = body;
  const count = await db.stockAudit.count();
  const audit = await db.stockAudit.create({
    data: {
      auditNo: `AUD-${nanoid(8).toUpperCase()}`,
      locationId,
      status: "completed",
      performedBy,
      notes,
      items: { create: items },
    },
    include: { items: true },
  });
  await db.auditLog.create({ data: { user: performedBy || "system", action: "CREATE", module: "StockAudit", detail: `Audit ${audit.auditNo} completed` } });
  res.status(201).json(audit);
}

async function deleteStockAudit(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.stockAudit.delete({ where: { id } });
  res.json({ ok: true });
}

export function stockAuditsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listStockAudits));
  r.post("/", wrap(createStockAudit));
  r.delete("/:id", wrap(deleteStockAudit));
  return r;
}

// ---------------------------------------------------------------------------
// stock-movements — /api/stock-movements
// ---------------------------------------------------------------------------

async function listStockMovements(req: Request, res: Response) {
  const medicineId = req.query.medicineId as string | undefined;
  const type = req.query.type as string | undefined;
  const where: Record<string, unknown> = {};
  if (medicineId) where.medicineId = medicineId;
  if (type) where.type = type;
  const movements = await db.stockMovement.findMany({
    where,
    include: { medicine: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(movements);
}

async function createStockMovement(req: Request, res: Response) {
  const body = req.body || {};
  const { medicineId, type, quantity, reference, notes } = body;
  const userEmail = authEmail();
  const med = await db.medicine.findUnique({ where: { id: medicineId } });
  if (!med) return fail(res, 404, "Medicine not found");
  const newBalance = Math.max(0, med.stockQty + quantity);
  const movement = await db.stockMovement.create({
    data: { medicineId, type, quantity, balanceAfter: newBalance, reference, notes, performedBy: userEmail },
  });
  await db.medicine.update({ where: { id: medicineId }, data: { stockQty: newBalance } });
  await db.auditLog.create({ data: { user: userEmail, action: "CREATE", module: "StockMovement", detail: `${type} ${quantity} of ${med.name}` } });
  res.status(201).json(movement);
}

export function stockMovementsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listStockMovements));
  r.post("/", wrap(createStockMovement));
  return r;
}

// ---------------------------------------------------------------------------
// stock-transfers — /api/stock-transfers, /api/stock-transfers/[id]
// ---------------------------------------------------------------------------

async function listStockTransfers(_req: Request, res: Response) {
  const transfers = await db.stockTransfer.findMany({
    include: { fromLocation: true, toLocation: true, items: { include: { item: true } } },
    orderBy: { transferDate: "desc" },
  });
  res.json(transfers);
}

async function createStockTransfer(req: Request, res: Response) {
  const body = req.body || {};
  const { items, fromLocationId, toLocationId, notes, requestedBy } = body;
  const count = await db.stockTransfer.count();
  const transfer = await db.stockTransfer.create({
    data: {
      transferNo: `STR-${nanoid(8).toUpperCase()}`,
      fromLocationId,
      toLocationId,
      status: "pending",
      notes,
      requestedBy,
      items: {
        create: items.map((it: { itemId: string; quantity: number }) => ({
          itemId: it.itemId,
          quantity: it.quantity,
        })),
      },
    },
    include: { items: true },
  });
  await db.auditLog.create({ data: { user: requestedBy || "system", action: "CREATE", module: "StockTransfer", detail: `Created transfer ${transfer.transferNo}` } });
  res.status(201).json(transfer);
}

async function updateStockTransfer(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.status === "approved") data.approvedAt = new Date();
  if (body.status === "received") { data.receivedAt = new Date(); data.approvedAt = data.approvedAt || new Date(); }
  const transfer = await db.stockTransfer.update({ where: { id }, data: data as never });

  // If received, update stock levels
  if (body.status === "received") {
    const fullTransfer = await db.stockTransfer.findUnique({ where: { id }, include: { items: true } });
    if (fullTransfer) {
      for (const item of fullTransfer.items) {
        // Reduce from source
        const fromStock = await db.inventoryStock.findFirst({ where: { itemId: item.itemId, locationId: fullTransfer.fromLocationId } });
        if (fromStock) {
          await db.inventoryStock.update({ where: { id: fromStock.id }, data: { quantity: Math.max(0, fromStock.quantity - item.quantity) } });
        }
        // Add to destination
        const toStock = await db.inventoryStock.findFirst({ where: { itemId: item.itemId, locationId: fullTransfer.toLocationId } });
        if (toStock) {
          await db.inventoryStock.update({ where: { id: toStock.id }, data: { quantity: toStock.quantity + item.quantity } });
        } else {
          await db.inventoryStock.create({ data: { itemId: item.itemId, locationId: fullTransfer.toLocationId, quantity: item.quantity } });
        }
        // Create movement
        await db.inventoryMovement.create({ data: { itemId: item.itemId, locationId: fullTransfer.toLocationId, type: "transfer", direction: "in", quantity: item.quantity, balanceAfter: 0, reference: fullTransfer.transferNo, performedBy: "System" } });
      }
    }
  }
  res.json(transfer);
}

export function stockTransfersRouter(): Router {
  const r = Router();
  r.get("/", wrap(listStockTransfers));
  r.post("/", wrap(createStockTransfer));
  r.patch("/:id", wrap(updateStockTransfer));
  return r;
}

// ---------------------------------------------------------------------------
// purchase-orders — /api/purchase-orders, /api/purchase-orders/[id]
// ---------------------------------------------------------------------------

async function listPurchaseOrders(req: Request, res: Response) {
  const status = req.query.status as string | undefined;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const orders = await db.purchaseOrder.findMany({
    where,
    include: { supplier: true, items: { include: { medicine: true } }, grns: true },
    orderBy: { orderDate: "desc" },
  });
  res.json(orders);
}

async function createPurchaseOrder(req: Request, res: Response) {
  const body = req.body || {};
  const { items, supplierId, expectedDate, notes } = body;
  const userEmail = authEmail();
  const meds = await db.medicine.findMany({ where: { id: { in: items.map((i: { medicineId: string }) => i.medicineId) } } });

  // Compute per-item totals with discount and tax correctly
  const itemData = items.map((it: { medicineId: string; quantity: number; unitPrice: number; taxPct: number; discountPct: number }) => {
    const med = meds.find((m) => m.id === it.medicineId);
    const price = it.unitPrice || med?.purchasePrice || 0;
    const lineTotal = price * it.quantity;
    const discountAmt = lineTotal * ((it.discountPct || 0) / 100);
    const afterDiscount = lineTotal - discountAmt;
    const taxAmt = afterDiscount * ((it.taxPct || 0) / 100);
    const total = afterDiscount + taxAmt;
    return {
      medicineId: it.medicineId,
      quantity: it.quantity,
      unitPrice: price,
      taxPct: it.taxPct || 0,
      discountPct: it.discountPct || 0,
      total: Math.round(total),
    };
  });

  const subtotal = itemData.reduce((s: number, it: { total: number }) => s + it.total, 0);
  const totalDiscount = items.reduce((s: number, it: { unitPrice: number; quantity: number; discountPct: number }, i: number) => {
    const price = it.unitPrice || meds.find(m => m.id === items[i].medicineId)?.purchasePrice || 0;
    return s + price * it.quantity * ((it.discountPct || 0) / 100);
  }, 0);
  const totalTax = items.reduce((s: number, it: { unitPrice: number; quantity: number; taxPct: number; discountPct: number }, i: number) => {
    const price = it.unitPrice || meds.find(m => m.id === items[i].medicineId)?.purchasePrice || 0;
    const afterDiscount = price * it.quantity * (1 - (it.discountPct || 0) / 100);
    return s + afterDiscount * ((it.taxPct || 0) / 100);
  }, 0);

  const po = await db.purchaseOrder.create({
    data: {
      poNumber: `PO-${nanoid(8).toUpperCase()}`,
      supplierId,
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      status: "draft",
      subtotal: Math.round(subtotal - totalTax),
      taxAmount: Math.round(totalTax),
      discountAmount: Math.round(totalDiscount),
      totalAmount: Math.round(subtotal),
      paidAmount: 0,
      notes,
      createdBy: userEmail,
      items: { create: itemData },
    },
    include: { items: true, supplier: true },
  });
  await db.auditLog.create({ data: { user: userEmail, action: "CREATE", module: "PurchaseOrder", detail: `Created PO ${po.poNumber}` } });
  res.status(201).json(po);
}

async function updatePurchaseOrder(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const userEmail = authEmail();
  const data: Record<string, unknown> = { ...body };
  if (body.status === "received") data.receivedDate = new Date();
  if (body.paidAmount !== undefined) {
    const po = await db.purchaseOrder.findUnique({ where: { id } });
    if (po) data.status = body.paidAmount >= po.totalAmount ? "received" : po.status;
  }
  const po = await db.purchaseOrder.update({ where: { id }, data: data as never });
  // If received, update stock for items not yet received (handle partial receipts)
  if (body.status === "received") {
    const fullPO = await db.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (fullPO) {
      for (const item of fullPO.items) {
        const remainingQty = item.quantity - (item.receivedQty || 0);
        if (remainingQty <= 0) continue;
        const med = await db.medicine.findUnique({ where: { id: item.medicineId } });
        if (med) {
          const newQty = med.stockQty + remainingQty;
          await db.medicine.update({ where: { id: item.medicineId }, data: { stockQty: newQty } });
          await db.stockMovement.create({
            data: {
              medicineId: item.medicineId,
              type: "purchase",
              quantity: remainingQty,
              balanceAfter: newQty,
              reference: fullPO.poNumber,
              performedBy: userEmail,
            },
          });
        }
      }
    }
  }
  res.json(po);
}

async function deletePurchaseOrder(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.purchaseOrder.delete({ where: { id } });
  res.json({ ok: true });
}

export function purchaseOrdersRouter(): Router {
  const r = Router();
  r.get("/", wrap(listPurchaseOrders));
  r.post("/", wrap(createPurchaseOrder));
  r.patch("/:id", wrap(updatePurchaseOrder));
  r.delete("/:id", wrap(deletePurchaseOrder));
  return r;
}

// ---------------------------------------------------------------------------
// purchase-returns — /api/purchase-returns, /api/purchase-returns/[id]
// ---------------------------------------------------------------------------

async function listPurchaseReturns(_req: Request, res: Response) {
  const returns = await db.purchaseReturn.findMany({
    include: { medicine: true },
    orderBy: { date: "desc" },
  });
  res.json(returns);
}

async function updatePurchaseReturn(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const ret = await db.purchaseReturn.update({ where: { id }, data: body });
  res.json(ret);
}

async function deletePurchaseReturn(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.purchaseReturn.delete({ where: { id } });
  res.json({ ok: true });
}

export function purchaseReturnsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listPurchaseReturns));
  r.patch("/:id", wrap(updatePurchaseReturn));
  r.delete("/:id", wrap(deletePurchaseReturn));
  return r;
}

// ---------------------------------------------------------------------------
// sales-returns — /api/sales-returns, /api/sales-returns/[id]
// ---------------------------------------------------------------------------

async function listSalesReturns(_req: Request, res: Response) {
  const returns = await db.salesReturn.findMany({
    include: { medicine: true },
    orderBy: { date: "desc" },
  });
  res.json(returns);
}

async function updateSalesReturn(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const ret = await db.salesReturn.update({ where: { id }, data: body });
  res.json(ret);
}

async function deleteSalesReturn(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.salesReturn.delete({ where: { id } });
  res.json({ ok: true });
}

export function salesReturnsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listSalesReturns));
  r.patch("/:id", wrap(updateSalesReturn));
  r.delete("/:id", wrap(deleteSalesReturn));
  return r;
}

// ---------------------------------------------------------------------------
// suppliers — /api/suppliers
// ---------------------------------------------------------------------------

async function listSuppliers(_req: Request, res: Response) {
  const suppliers = await db.supplier.findMany({ include: { _count: { select: { medicines: true, purchaseOrders: true } } }, orderBy: { name: "asc" } });
  res.json(suppliers);
}

async function createSupplier(req: Request, res: Response) {
  const body = req.body || {};
  const supplier = await db.supplier.create({ data: body });
  res.status(201).json(supplier);
}

export function suppliersRouter(): Router {
  const r = Router();
  r.get("/", wrap(listSuppliers));
  r.post("/", wrap(createSupplier));
  return r;
}

// ---------------------------------------------------------------------------
// supplier-payments — /api/supplier-payments
// ---------------------------------------------------------------------------

async function listSupplierPayments(_req: Request, res: Response) {
  const payments = await db.supplierPayment.findMany({ orderBy: { date: "desc" } });
  res.json(payments);
}

async function createSupplierPayment(req: Request, res: Response) {
  const body = req.body || {};
  const count = await db.supplierPayment.count();
  const payment = await db.supplierPayment.create({
    data: { ...body, paymentNo: `SP-${nanoid(8).toUpperCase()}` },
  });
  res.status(201).json(payment);
}

export function supplierPaymentsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listSupplierPayments));
  r.post("/", wrap(createSupplierPayment));
  return r;
}