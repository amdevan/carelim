/**
 * Lab module — port of frontend /api/lab-* routes:
 * lab-orders, lab-results, lab-samples, lab-tests, lab-tests-master,
 * lab-packages, lab-departments, lab-equipment, lab-inventory, lab-qc,
 * lab-dashboard.
 * Tenant isolation via lib/prisma.ts (labOrder, labTestMaster, labPackage,
 * labDepartment, labQualityControl, labEquipment, labInventory are tenant
 * models; labTest is branch-linked).
 */
import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { db } from "../lib/prisma";
import { fail, wrap } from "../lib/http";
import { getCurrentUserEmail } from "../lib/tenant-context";

// ─── Inlined helpers (frontend lib/id-generator.ts + nanoid) ──────
const NANOID_ALPHABET =
  "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict";

function nanoid(size: number): string {
  const bytes = randomBytes(size);
  let id = "";
  for (let i = 0; i < size; i++) id += NANOID_ALPHABET[bytes[i] % NANOID_ALPHABET.length];
  return id;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MAX_RETRIES = 5;

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
  // random/alphanumeric suffixes sort above serials and must not poison the
  // sequence (they made creation collide forever).
  const nums = latest
    .map(r => r.code.match(new RegExp(`^${escapeRegex(prefix)}(\\d+)$`)))
    .filter((m): m is RegExpMatchArray => !!m)
    .map(m => parseInt(m[1], 10));
  const nextNum = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(nextNum).padStart(5, "0")}`;
}

/**
 * Create a record with unique code, retrying on P2002 (unique constraint violation).
 * The DB enforces uniqueness, and we retry on conflict.
 */
async function createWithRetry<T>(
  createFn: () => Promise<T>,
  regenerateFn: () => Promise<void>
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

// ─── /api/lab-orders (+ /api/lab-orders/[id]) ─────────────────────

async function listLabOrders(req: Request, res: Response) {
  try {
    const status = req.query.status as string | undefined;
    const priority = req.query.priority as string | undefined;
    const patientId = req.query.patientId as string | undefined;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (patientId) where.patientId = patientId;
    const orders = await db.labOrder.findMany({
      where,
      include: {
        patient: true,
        items: { include: { test: { include: { department: true } } } },
        samples: { include: { tracking: true } },
        results: { include: { parameters: { include: { parameter: { include: { referenceRanges: true } } } } } },
      },
      orderBy: { orderedAt: "desc" },
    });
    res.json(orders);
  } catch (error) {
    console.error("Error fetching lab orders:", error);
    fail(res, 500, "Failed to fetch lab orders");
  }
}

async function createLabOrder(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const { testIds, patientId, doctorId, priority, clinicalNotes, discount } = body;

    let orderNo = await getNextSequenceNumber("LAB-ORD-", () =>
      db.labOrder.findMany({
        where: { orderNo: { startsWith: "LAB-ORD-" } },
        select: { orderNo: true },
      }).then(rows => rows.map(r => ({ code: r.orderNo })))
    );

    const tests = await db.labTestMaster.findMany({ where: { id: { in: testIds } } });
    const totalAmount = tests.reduce((s, t) => s + t.price, 0);
    const disc = discount || 0;
    const tax = Math.round((totalAmount - disc) * 0.13);
    const netAmount = totalAmount - disc + tax;

    const order = await createWithRetry(
      () => db.labOrder.create({
        data: {
          orderNo,
          patientId,
          doctorId: doctorId || null,
          priority: priority || "normal",
          clinicalNotes: clinicalNotes || null,
          status: "ordered",
          totalAmount,
          discount: disc,
          tax,
          netAmount,
          paidAmount: 0,
          paymentStatus: "unpaid",
          barcode: orderNo,
          items: {
            create: tests.map(t => ({ testId: t.id, price: t.price, status: "ordered", resultStatus: "pending" })),
          },
        },
        include: { items: { include: { test: true } }, patient: true },
      }),
      async () => {
        orderNo = await getNextSequenceNumber("LAB-ORD-", () =>
          db.labOrder.findMany({
            where: { orderNo: { startsWith: "LAB-ORD-" } },
            select: { orderNo: true },
          }).then(rows => rows.map(r => ({ code: r.orderNo })))
        );
      },
    );

    await db.auditLog.create({ data: { user: getCurrentUserEmail() || "system@carelim.health", action: "CREATE", module: "LabOrder", detail: `Created lab order ${order.orderNo}` } });
    res.status(201).json(order);
  } catch (error) {
    console.error("Error creating lab order:", error);
    fail(res, 500, "Failed to create lab order");
  }
}

async function getLabOrder(req: Request, res: Response) {
  const id = req.params.id as string;
  const order = await db.labOrder.findUnique({
    where: { id },
    include: {
      patient: true,
      items: { include: { test: { include: { department: true, parameters: { include: { referenceRanges: true } } } } } },
      samples: { include: { tracking: true } },
      results: { include: { parameters: { include: { parameter: { include: { referenceRanges: true } } } } } },
    },
  });
  if (!order) return fail(res, 404, "Not found");
  res.json(order);
}

async function updateLabOrder(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.status === "collected" && !body.collectedAt) data.collectedAt = new Date();
  if (body.status === "completed" && !body.completedAt) data.completedAt = new Date();
  if (body.paidAmount !== undefined) {
    const order = await db.labOrder.findUnique({ where: { id } });
    if (order) data.paymentStatus = body.paidAmount >= order.netAmount ? "paid" : "partial";
  }
  const order = await db.labOrder.update({ where: { id }, data: data as never });
  await db.auditLog.create({ data: { user: getCurrentUserEmail() || "system@carelim.health", action: "UPDATE", module: "LabOrder", detail: `Updated lab order ${order.orderNo}` } });
  res.json(order);
}

async function deleteLabOrder(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.labOrder.delete({ where: { id } });
  res.json({ ok: true });
}

// ─── /api/lab-results (+ /api/lab-results/[id]) ───────────────────

async function listLabResults(req: Request, res: Response) {
  try {
    const status = req.query.status as string | undefined;
    const orderId = req.query.orderId as string | undefined;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (orderId) where.orderId = orderId;
    const results = await db.labResult.findMany({
      where,
      include: {
        order: { include: { patient: true, samples: { select: { sampleCode: true, testId: true } } } },
        parameters: { include: { parameter: { include: { referenceRanges: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(results);
  } catch (error) {
    console.error("Error fetching lab results:", error);
    fail(res, 500, "Failed to fetch lab results");
  }
}

// Enter/update results, verify, approve, release
async function updateLabResult(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const { action, parameters, technicianName, pathologistComments, rejectionReason, verifiedBy, approvedBy, releasedBy } = body;

  const data: Record<string, unknown> = {};

  if (action === "enter") {
    data.status = "entered";
    data.technicianName = technicianName;
    data.enteredAt = new Date();
    // Update parameters
    if (parameters) {
      for (const p of parameters) {
        await db.labResultParameter.update({ where: { id: p.id }, data: { value: p.value, flag: p.flag || "normal", comment: p.comment || null } });
      }
    }
  } else if (action === "verify") {
    data.status = "verified";
    data.verifiedBy = verifiedBy;
    data.verifiedAt = new Date();
  } else if (action === "approve") {
    data.status = "approved";
    data.approvedBy = approvedBy;
    data.approvedAt = new Date();
    data.pathologistComments = pathologistComments || null;
    // Update order item result status
    const result = await db.labResult.findUnique({ where: { id } });
    if (result?.testItemId) {
      await db.labOrderItem.update({ where: { id: result.testItemId }, data: { resultStatus: "approved", status: "approved" } });
    }
  } else if (action === "release") {
    data.status = "released";
    data.releasedBy = releasedBy;
    data.releasedAt = new Date();
    const result = await db.labResult.findUnique({ where: { id } });
    if (result?.testItemId) {
      await db.labOrderItem.update({ where: { id: result.testItemId }, data: { resultStatus: "released" } });
    }
    // Check if all items in order are released/approved
    if (result?.orderId) {
      const order = await db.labOrder.findUnique({ where: { id: result.orderId }, include: { items: true } });
      if (order && order.items.every(i => i.resultStatus === "released" || i.resultStatus === "approved")) {
        await db.labOrder.update({ where: { id: order.id }, data: { status: "completed", completedAt: new Date() } });
      }
    }
  } else if (action === "reject") {
    data.status = "rejected";
    data.rejectionReason = rejectionReason;
  }

  const result = await db.labResult.update({ where: { id }, data: data as never, include: { parameters: { include: { parameter: true } } } });
  await db.auditLog.create({ data: { user: technicianName || verifiedBy || approvedBy || releasedBy || "system", action: action.toUpperCase(), module: "LabResult", detail: `Result ${result.id} → ${action}` } });
  res.json(result);
}

// ─── /api/lab-samples (+ /api/lab-samples/[id]) ───────────────────

async function listLabSamples(req: Request, res: Response) {
  const status = req.query.status as string | undefined;
  const orderId = req.query.orderId as string | undefined;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (orderId) where.orderId = orderId;
  const samples = await db.labSample.findMany({
    where,
    include: {
      order: { include: { patient: true, items: { include: { test: { select: { name: true } } } } } },
      tracking: { orderBy: { timestamp: "desc" } },
    },
    orderBy: { collectionTime: "desc" },
  });
  res.json(samples);
}

// Collect sample
async function createLabSample(req: Request, res: Response) {
  const body = req.body || {};
  const { orderId, testId, sampleType, containerType, collectorName, location } = body;
  const count = await db.labSample.count();
  const now = new Date();
  const sampleCode = `S-${nanoid(8).toUpperCase()}`;
  const sample = await db.labSample.create({
    data: {
      sampleCode,
      orderId,
      testId: testId || null,
      sampleType: sampleType || "Blood",
      containerType: containerType || "EDTA Tube",
      barcode: sampleCode,
      qrCode: sampleCode,
      collectorName: collectorName || null,
      collectionTime: now,
      collectedAt: now.toISOString(),
      receivedAt: now,
      status: "collected",
      location: location || "Sample Reception",
      tracking: {
        create: [
          { status: "collected", location: location || "Sample Reception", handler: collectorName || "Collector", timestamp: now },
        ],
      },
    },
    include: { tracking: true },
  });
  // Update order status to collected
  await db.labOrder.update({ where: { id: orderId }, data: { status: "collected", collectedAt: now } });
  await db.labOrderItem.updateMany({ where: { orderId, testId: testId || undefined }, data: { status: "collected" } });
  await db.auditLog.create({ data: { user: collectorName || "system", action: "CREATE", module: "LabSample", detail: `Collected sample ${sample.sampleCode}` } });
  res.status(201).json(sample);
}

// Update sample status (reject, recollect, send to department, complete)
async function updateLabSample(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const { status, location, handler, notes, rejectionReason } = body;
  const data: Record<string, unknown> = { status };
  if (rejectionReason) data.rejectionReason = rejectionReason;
  if (location) data.location = location;
  if (status === "received") data.receivedAt = new Date();
  const sample = await db.labSample.update({ where: { id }, data: data as never });
  // Add tracking entry
  await db.labSampleTracking.create({
    data: { sampleId: id, status, location: location || sample.location || null, handler: handler || null, notes: notes || null, timestamp: new Date() },
  });
  await db.auditLog.create({ data: { user: handler || "system", action: "UPDATE", module: "LabSample", detail: `Sample ${sample.sampleCode} → ${status}` } });
  res.json(sample);
}

// ─── /api/lab-tests (+ /api/lab-tests/[id]) ───────────────────────

async function listLabTests(req: Request, res: Response) {
  const status = req.query.status as string | undefined;
  const branchId = req.query.branchId as string | undefined;
  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  if (status) where.status = status;
  const tests = await db.labTest.findMany({
    where,
    include: { patient: true },
    orderBy: { orderedAt: "desc" },
  });
  res.json(tests);
}

async function createLabTest(req: Request, res: Response) {
  const body = req.body || {};
  const count = await db.labTest.count();
  const test = await db.labTest.create({
    data: { ...body, orderedAt: new Date(), testCode: `LAB-${nanoid(8).toUpperCase()}` },
  });
  await db.auditLog.create({ data: { user: getCurrentUserEmail() || "system@carelim.health", action: "CREATE", module: "LabTest", detail: `Ordered lab test ${test.testName}` } });
  res.status(201).json(test);
}

async function updateLabTest(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.status === "completed" || body.status === "approved") data.completedAt = new Date();
  const test = await db.labTest.update({ where: { id }, data: data as never });
  if (body.status === "approved") {
    await db.auditLog.create({ data: { user: getCurrentUserEmail() || "system@carelim.health", action: "APPROVE", module: "LabTest", detail: `Approved lab test ${test.testCode}` } });
  }
  res.json(test);
}

async function deleteLabTest(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.labTest.delete({ where: { id } });
  res.json({ ok: true });
}

// ─── /api/lab-tests-master (+ /api/lab-tests-master/[id]) ─────────

async function listLabTestsMaster(req: Request, res: Response) {
  const q = (req.query.q as string) || "";
  const deptId = req.query.departmentId as string | undefined;
  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ name: { contains: q } }, { code: { contains: q } }];
  if (deptId) where.departmentId = deptId;
  const tests = await db.labTestMaster.findMany({
    where,
    include: { department: true, parameters: { include: { referenceRanges: true }, orderBy: { displayOrder: "asc" } } },
    orderBy: { name: "asc" },
  });
  res.json(tests);
}

async function createLabTestMaster(req: Request, res: Response) {
  const body = req.body || {};
  const { parameters, ...data } = body;
  if (!data.code) {
    const count = await db.labTestMaster.count();
    data.code = `LTM-${String(count + 1).padStart(3, "0")}`;
  }
  const test = await db.labTestMaster.create({
    data: {
      ...data,
      parameters: parameters ? {
        create: parameters.map((p: { name: string; unit?: string; resultType?: string; displayOrder?: number; options?: string; referenceRanges?: { gender: string; lowNormal?: string; highNormal?: string; criticalLow?: string; criticalHigh?: string; textNormal?: string }[] }) => ({
          name: p.name,
          unit: p.unit || null,
          resultType: p.resultType || "numeric",
          displayOrder: p.displayOrder || 1,
          options: p.options || null,
          referenceRanges: p.referenceRanges ? { create: p.referenceRanges } : undefined,
        })),
      } : undefined,
    },
    include: { parameters: { include: { referenceRanges: true } } },
  });
  await db.auditLog.create({ data: { user: getCurrentUserEmail() || "system@carelim.health", action: "CREATE", module: "LabTest", detail: `Created lab test ${test.name}` } });
  res.status(201).json(test);
}

async function updateLabTestMaster(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const test = await db.labTestMaster.update({ where: { id }, data: body });
  res.json(test);
}

async function deleteLabTestMaster(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.labTestMaster.delete({ where: { id } });
  await db.auditLog.create({ data: { user: getCurrentUserEmail() || "system@carelim.health", action: "DELETE", module: "LabTest", detail: "Deleted lab test" } });
  res.json({ ok: true });
}

// ─── /api/lab-packages ────────────────────────────────────────────

async function listLabPackages(_req: Request, res: Response) {
  const pkgs = await db.labPackage.findMany({ include: { tests: { include: { test: true } } }, orderBy: { name: "asc" } });
  res.json(pkgs);
}

// ─── /api/lab-departments ─────────────────────────────────────────

async function listLabDepartments(_req: Request, res: Response) {
  const depts = await db.labDepartment.findMany({ include: { _count: { select: { tests: true, equipment: true } } }, orderBy: { name: "asc" } });
  res.json(depts);
}

// ─── /api/lab-equipment (+ /api/lab-equipment/[id]) ───────────────

async function listLabEquipment(_req: Request, res: Response) {
  const equip = await db.labEquipment.findMany({ include: { department: true }, orderBy: { name: "asc" } });
  res.json(equip);
}

async function createLabEquipment(req: Request, res: Response) {
  const body = req.body || {};
  if (!body.serialNumber) {
    const count = await db.labEquipment.count();
    body.serialNumber = `EQ-${String(count + 1).padStart(4, "0")}`;
  }
  const e = await db.labEquipment.create({ data: { ...body, purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null, warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null, lastCalibration: body.lastCalibration ? new Date(body.lastCalibration) : null, nextCalibration: body.nextCalibration ? new Date(body.nextCalibration) : null } });
  res.status(201).json(e);
}

async function updateLabEquipment(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data = { ...body };
  if (body.purchaseDate) data.purchaseDate = new Date(body.purchaseDate);
  if (body.warrantyExpiry) data.warrantyExpiry = new Date(body.warrantyExpiry);
  if (body.lastCalibration) data.lastCalibration = new Date(body.lastCalibration);
  if (body.nextCalibration) data.nextCalibration = new Date(body.nextCalibration);
  const e = await db.labEquipment.update({ where: { id }, data });
  res.json(e);
}

async function deleteLabEquipment(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.labEquipment.delete({ where: { id } });
  res.json({ ok: true });
}

// ─── /api/lab-inventory (+ /api/lab-inventory/[id]) ───────────────

async function listLabInventory(_req: Request, res: Response) {
  const inv = await db.labInventory.findMany({ include: { supplier: true }, orderBy: { name: "asc" } });
  res.json(inv);
}

async function createLabInventory(req: Request, res: Response) {
  const body = req.body || {};
  if (body.expiryDate) body.expiryDate = new Date(body.expiryDate);
  const inv = await db.labInventory.create({ data: body });
  res.status(201).json(inv);
}

async function updateLabInventory(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  if (body.expiryDate) body.expiryDate = new Date(body.expiryDate);
  const inv = await db.labInventory.update({ where: { id }, data: body });
  res.json(inv);
}

async function deleteLabInventory(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.labInventory.delete({ where: { id } });
  res.json({ ok: true });
}

// ─── /api/lab-qc (+ /api/lab-qc/[id]) ─────────────────────────────

async function listLabQc(_req: Request, res: Response) {
  const qc = await db.labQualityControl.findMany({ include: { test: true }, orderBy: { performedAt: "desc" } });
  res.json(qc);
}

async function createLabQc(req: Request, res: Response) {
  const body = req.body || {};
  const count = await db.labQualityControl.count();
  const qc = await db.labQualityControl.create({ data: { ...body, code: `QC-${nanoid(8).toUpperCase()}`, performedAt: new Date() } });
  await db.auditLog.create({ data: { user: body.performedBy || "system", action: "CREATE", module: "LabQC", detail: `QC ${qc.code} performed` } });
  res.status(201).json(qc);
}

async function deleteLabQc(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.labQualityControl.delete({ where: { id } });
  res.json({ ok: true });
}

// ─── /api/lab-dashboard ───────────────────────────────────────────

async function getLabDashboard(_req: Request, res: Response) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [orders, todayOrders, monthOrders, samples, results, qcRecords, inventory, departments] = await Promise.all([
    db.labOrder.findMany({ include: { items: { include: { test: true } }, patient: true, samples: true, results: true } }),
    db.labOrder.findMany({ where: { orderedAt: { gte: startOfDay, lt: endOfDay } } }),
    db.labOrder.findMany({ where: { orderedAt: { gte: startOfMonth } } }),
    db.labSample.count(),
    db.labResult.findMany({ include: { parameters: { include: { parameter: { include: { referenceRanges: true } } } } } }),
    db.labQualityControl.findMany(),
    db.labInventory.findMany(),
    db.labDepartment.findMany({ include: { _count: { select: { tests: true, equipment: true } } } }),
  ]);

  const pendingCollection = orders.filter(o => o.status === "ordered").length;
  const collectedSamples = samples;
  const processingSamples = await db.labSample.count({ where: { status: "processing" } });
  const pendingResults = orders.reduce((s, o) => s + o.items.filter(i => i.resultStatus === "pending").length, 0);
  const pendingApproval = orders.reduce((s, o) => s + o.items.filter(i => i.resultStatus === "entered" || i.resultStatus === "verified").length, 0);
  const completedReports = orders.reduce((s, o) => s + o.items.filter(i => i.resultStatus === "approved" || i.resultStatus === "released").length, 0);

  // Critical results
  const criticalResults = results.flatMap(r => r.parameters.filter(p => p.flag === "critical" || p.flag === "panic").map(p => ({ ...p, orderId: r.orderId })));

  // Today's revenue
  const todayRevenue = todayOrders.reduce((s, o) => s + o.paidAmount, 0);
  const monthRevenue = monthOrders.reduce((s, o) => s + o.paidAmount, 0);

  // Average TAT (approx from completed orders)
  const completed = orders.filter(o => o.completedAt && o.orderedAt);
  const avgTAT = completed.length > 0
    ? Math.round(completed.reduce((s, o) => s + ((o.completedAt!.getTime() - o.orderedAt.getTime()) / 3600000), 0) / completed.length * 10) / 10
    : 0;

  // Daily test volume (last 7 days)
  const dailyVolume: { date: string; count: number; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const dayOrders = await db.labOrder.findMany({ where: { orderedAt: { gte: ds, lt: de } }, include: { items: true } });
    dailyVolume.push({
      date: d.toLocaleDateString("en-US", { weekday: "short" }),
      count: dayOrders.reduce((s, o) => s + o.items.length, 0),
      revenue: dayOrders.reduce((s, o) => s + o.paidAmount, 0),
    });
  }

  // Department-wise test requests
  const deptRequests = departments.map(d => ({
    name: d.name,
    value: orders.reduce((s, o) => s + o.items.filter(i => i.test.departmentId === d.id).length, 0),
    color: d.color,
  })).filter(d => d.value > 0);

  // Most requested tests
  const testCounts: Record<string, { name: string; count: number }> = {};
  orders.forEach(o => o.items.forEach(i => {
    const name = i.test.name;
    if (!testCounts[name]) testCounts[name] = { name, count: 0 };
    testCounts[name].count++;
  }));
  const mostRequested = Object.values(testCounts).sort((a, b) => b.count - a.count).slice(0, 8);

  // Technician performance
  const techCounts: Record<string, { name: string; completed: number }> = {};
  results.forEach(r => {
    if (r.technicianName) {
      if (!techCounts[r.technicianName]) techCounts[r.technicianName] = { name: r.technicianName, completed: 0 };
      if (r.status === "approved" || r.status === "released") techCounts[r.technicianName].completed++;
    }
  });
  const techPerf = Object.values(techCounts).sort((a, b) => b.completed - a.completed).slice(0, 6);

  // Abnormal result stats
  const flagCounts: Record<string, number> = {};
  results.forEach(r => r.parameters.forEach(p => { flagCounts[p.flag] = (flagCounts[p.flag] || 0) + 1; }));

  // Live panels
  const waitingCollection = orders.filter(o => o.status === "ordered").slice(0, 5);
  const urgentTests = orders.filter(o => o.priority === "urgent" || o.priority === "emergency").slice(0, 5);
  const criticalAlerts = criticalResults.slice(0, 5).map(c => ({
    parameter: c.parameter.name,
    value: c.value,
    flag: c.flag,
    orderId: c.orderId,
  }));
  const pendingApprovalList = orders.filter(o => o.items.some(i => i.resultStatus === "entered" || i.resultStatus === "verified")).slice(0, 5);
  const recentlyReleased = orders.filter(o => o.status === "completed").slice(0, 5);

  // Low stock inventory
  const lowStock = inventory.filter(i => i.stockQty <= i.reorderLevel);

  res.json({
    kpis: {
      totalOrders: orders.length,
      pendingCollection,
      collectedSamples,
      processingSamples,
      pendingResults,
      pendingApproval,
      completedReports,
      criticalResults: criticalResults.length,
      todayRevenue,
      avgTAT,
    },
    dailyVolume,
    deptRequests,
    mostRequested,
    techPerf,
    flagCounts,
    waitingCollection: waitingCollection.map(o => ({ orderNo: o.orderNo, patient: o.patient.name, priority: o.priority, tests: o.items.length })),
    urgentTests: urgentTests.map(o => ({ orderNo: o.orderNo, patient: o.patient.name, priority: o.priority })),
    criticalAlerts,
    pendingApprovalList: pendingApprovalList.map(o => ({ orderNo: o.orderNo, patient: o.patient.name, tests: o.items.length })),
    recentlyReleased: recentlyReleased.map(o => ({ orderNo: o.orderNo, patient: o.patient.name, completedAt: o.completedAt })),
    lowStock,
    monthRevenue,
    qcStats: {
      total: qcRecords.length,
      pass: qcRecords.filter(q => q.status === "pass").length,
      fail: qcRecords.filter(q => q.status === "fail").length,
      warning: qcRecords.filter(q => q.status === "warning").length,
    },
    departments: departments.map(d => ({ id: d.id, name: d.name, code: d.code, color: d.color, tests: d._count.tests, equipment: d._count.equipment })),
  });
}

// ─── Routers ──────────────────────────────────────────────────────

export function labOrdersRouter(): Router {
  const r = Router();
  r.get("/", wrap(listLabOrders));
  r.post("/", wrap(createLabOrder));
  r.get("/:id", wrap(getLabOrder));
  r.patch("/:id", wrap(updateLabOrder));
  r.delete("/:id", wrap(deleteLabOrder));
  return r;
}

export function labResultsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listLabResults));
  r.patch("/:id", wrap(updateLabResult));
  return r;
}

export function labSamplesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listLabSamples));
  r.post("/", wrap(createLabSample));
  r.patch("/:id", wrap(updateLabSample));
  return r;
}

export function labTestsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listLabTests));
  r.post("/", wrap(createLabTest));
  r.patch("/:id", wrap(updateLabTest));
  r.delete("/:id", wrap(deleteLabTest));
  return r;
}

export function labTestsMasterRouter(): Router {
  const r = Router();
  r.get("/", wrap(listLabTestsMaster));
  r.post("/", wrap(createLabTestMaster));
  r.put("/:id", wrap(updateLabTestMaster));
  r.delete("/:id", wrap(deleteLabTestMaster));
  return r;
}

export function labPackagesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listLabPackages));
  return r;
}

export function labDepartmentsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listLabDepartments));
  return r;
}

export function labEquipmentRouter(): Router {
  const r = Router();
  r.get("/", wrap(listLabEquipment));
  r.post("/", wrap(createLabEquipment));
  r.put("/:id", wrap(updateLabEquipment));
  r.delete("/:id", wrap(deleteLabEquipment));
  return r;
}

export function labInventoryRouter(): Router {
  const r = Router();
  r.get("/", wrap(listLabInventory));
  r.post("/", wrap(createLabInventory));
  r.put("/:id", wrap(updateLabInventory));
  r.delete("/:id", wrap(deleteLabInventory));
  return r;
}

export function labQcRouter(): Router {
  const r = Router();
  r.get("/", wrap(listLabQc));
  r.post("/", wrap(createLabQc));
  r.delete("/:id", wrap(deleteLabQc));
  return r;
}

export function labDashboardRouter(): Router {
  const r = Router();
  r.get("/", wrap(getLabDashboard));
  return r;
}