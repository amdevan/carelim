import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
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

  return NextResponse.json({
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
