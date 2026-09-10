import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");
  const period = searchParams.get("period") || "month";
  const customStart = searchParams.get("startDate");
  const customEnd = searchParams.get("endDate");
  const branchFilter = branchId ? { branchId } : {};

  const today = new Date();
  let startDate: Date;
  let endDate: Date = today;
  if (period === "custom" && customStart && customEnd) {
    startDate = new Date(customStart);
    endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "week") {
    startDate = new Date(today); startDate.setDate(today.getDate() - 7);
  } else if (period === "quarter") {
    startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  } else if (period === "year") {
    startDate = new Date(today.getFullYear(), 0, 1);
  } else if (period === "all") {
    startDate = new Date(2020, 0, 1);
  } else {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  }
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // ============ Overview ============
  const invoices = await db.invoice.findMany({ where: { ...branchFilter, date: { gte: startDate } }, include: { patient: true } });
  const appointments = await db.appointment.findMany({ where: { ...branchFilter, date: { gte: startDate } }, include: { patient: true, doctor: true } });
  const patients = await db.patient.findMany({ where: branchFilter, orderBy: { registeredAt: "desc" } });
  const doctors = await db.doctor.findMany({ where: branchFilter, include: { appointments: { where: { date: { gte: startDate } } } } });

  const totalRevenue = invoices.reduce((s, i) => s + i.total, 0);
  const totalCollection = invoices.reduce((s, i) => s + i.paid, 0);
  const totalDue = invoices.reduce((s, i) => s + i.due, 0);

  const revenueByType: Record<string, number> = {};
  invoices.forEach(i => { revenueByType[i.type] = (revenueByType[i.type] || 0) + i.total; });
  const revenueByPayment: Record<string, number> = {};
  invoices.forEach(i => { if (i.paymentMethod) revenueByPayment[i.paymentMethod] = (revenueByPayment[i.paymentMethod] || 0) + i.paid; });

  const doctorPerf = doctors.map(d => ({
    name: d.name, patients: d.appointments.length, revenue: d.appointments.length * d.consultationFee,
  })).sort((a, b) => b.patients - a.patients).slice(0, 10);

  // Monthly revenue (last 6 months or within custom range)
  const monthlyRevenue: { month: string; revenue: number; collection: number; profit: number }[] = [];
  if (period === "custom" && customStart && customEnd) {
    // Group by month within custom range
    const ms = new Date(customStart);
    const me = new Date(customEnd);
    let cm = new Date(ms.getFullYear(), ms.getMonth(), 1);
    while (cm <= me) {
      const dn = new Date(cm.getFullYear(), cm.getMonth() + 1, 1);
      const invs = await db.invoice.findMany({ where: { ...branchFilter, date: { gte: cm, lt: dn } } });
      const rev = invs.reduce((s, j) => s + j.total, 0);
      const col = invs.reduce((s, j) => s + j.paid, 0);
      monthlyRevenue.push({ month: cm.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), revenue: rev, collection: col, profit: Math.round(rev * 0.3) });
      cm = dn;
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
      const invs = await db.invoice.findMany({ where: { ...branchFilter, date: { gte: d, lt: dn } } });
      const rev = invs.reduce((s, j) => s + j.total, 0);
      const col = invs.reduce((s, j) => s + j.paid, 0);
      monthlyRevenue.push({ month: d.toLocaleDateString("en-US", { month: "short" }), revenue: rev, collection: col, profit: Math.round(rev * 0.3) });
    }
  }

  // Daily revenue (within date range)
  const dailyRevenue: { date: string; revenue: number; collection: number; due: number }[] = [];
  const dayCount = Math.min(Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000), 90);
  for (let i = dayCount; i >= 0; i--) {
    const d = new Date(endDate); d.setDate(endDate.getDate() - i);
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const invs = await db.invoice.findMany({ where: { ...branchFilter, date: { gte: ds, lt: de } } });
    dailyRevenue.push({
      date: d.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      revenue: invs.reduce((s, j) => s + j.total, 0),
      collection: invs.reduce((s, j) => s + j.paid, 0),
      due: invs.reduce((s, j) => s + j.due, 0),
    });
  }

  // ============ Expenses ============
  const expenses = await db.expense.findMany({ where: { ...branchFilter, date: { gte: startDate } }, orderBy: { date: "desc" } });
  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const expenseByCategory: Record<string, number> = {};
  expenses.forEach(e => { expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount; });

  // ============ Patients ============
  const newPatientsMonth = patients.filter(p => new Date(p.registeredAt) >= startOfMonth).length;
  const patientByMonth: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const count = patients.filter(p => { const c = new Date(p.registeredAt); return c >= d && c < dn; }).length;
    patientByMonth.push({ month: d.toLocaleDateString("en-US", { month: "short" }), count });
  }

  // ============ Appointments ============
  const confirmedAppts = appointments.filter(a => a.status === "completed").length;
  const cancelledAppts = appointments.filter(a => a.status === "cancelled").length;
  const pendingAppts = appointments.filter(a => a.status === "scheduled").length;
  const noShowAppts = appointments.filter(a => a.status === "no-show").length;

  const apptByDoctor: { name: string; total: number; completed: number; cancelled: number }[] = [];
  doctors.forEach(d => {
    const docAppts = appointments.filter(a => a.doctorId === d.id);
    apptByDoctor.push({ name: d.name, total: docAppts.length, completed: docAppts.filter(a => a.status === "completed").length, cancelled: docAppts.filter(a => a.status === "cancelled").length });
  });

  const apptByDay: { day: string; count: number }[] = [];
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
    apptByDay.push({ day, count: appointments.filter(a => new Date(a.date).toLocaleDateString("en-US", { weekday: "short" }) === day).length });
  });

  const apptByHour: { hour: string; count: number }[] = [];
  for (let h = 8; h <= 18; h++) {
    apptByHour.push({ hour: `${h}:00`, count: appointments.filter(a => a.time && parseInt(a.time.split(":")[0]) === h).length });
  }

  // ============ Finance ============
  const allInvoices = await db.invoice.findMany({ where: { ...branchFilter, date: { gte: startDate } }, include: { patient: true, items: true } });
  const invoicesByType: Record<string, number> = {};
  allInvoices.forEach(i => { invoicesByType[i.type] = (invoicesByType[i.type] || 0) + i.total; });
  const paymentsByMethod: Record<string, number> = {};
  allInvoices.forEach(i => { if (i.paymentMethod) paymentsByMethod[i.paymentMethod] = (paymentsByMethod[i.paymentMethod] || 0) + i.paid; });

  const outstanding = allInvoices.filter(i => i.due > 0);
  const outstanding0_30 = outstanding.filter(i => { const days = Math.floor((today.getTime() - new Date(i.date).getTime()) / 86400000); return days <= 30; }).reduce((s, i) => s + i.due, 0);
  const outstanding31_60 = outstanding.filter(i => { const days = Math.floor((today.getTime() - new Date(i.date).getTime()) / 86400000); return days > 30 && days <= 60; }).reduce((s, i) => s + i.due, 0);
  const outstanding60plus = outstanding.filter(i => { const days = Math.floor((today.getTime() - new Date(i.date).getTime()) / 86400000); return days > 60; }).reduce((s, i) => s + i.due, 0);

  // ============ Pharmacy ============
  const pharmacySales = await db.pharmacySale.findMany({ where: { ...branchFilter, saleDate: { gte: startDate } } });
  const purchaseOrders = await db.purchaseOrder.findMany({ where: { orderDate: { gte: startDate } }, include: { items: true } });
  const medicines = await db.medicine.findMany({ where: branchFilter });

  const phSalesTotal = pharmacySales.reduce((s, ps) => s + ps.total, 0);
  const phSalesCollection = pharmacySales.reduce((s, ps) => s + ps.paidAmount, 0);
  const phPurchasesTotal = purchaseOrders.reduce((s, po) => s + po.totalAmount, 0);
  const phStockValue = medicines.reduce((s, m) => s + (m.stockQty * m.purchasePrice), 0);

  const expiry90 = new Date(today); expiry90.setDate(today.getDate() + 90);
  const expiringMedicines = medicines.filter(m => m.expiryDate && new Date(m.expiryDate) <= expiry90).map(m => ({
    name: m.name, batch: m.batchNo, expiry: m.expiryDate.toISOString(), stock: m.stockQty, status: new Date(m.expiryDate) < today ? "expired" : "expiring",
  }));

  const lowStockMedicines = medicines.filter(m => m.stockQty <= m.reorderLevel).map(m => ({
    name: m.name, stock: m.stockQty, reorder: m.reorderLevel,
  }));

  const monthlyPhSales: { month: string; sales: number; purchases: number }[] = [];
  if (period === "custom" && customStart && customEnd) {
    const ms = new Date(customStart); const me = new Date(customEnd);
    let cm = new Date(ms.getFullYear(), ms.getMonth(), 1);
    while (cm <= me) {
      const dn = new Date(cm.getFullYear(), cm.getMonth() + 1, 1);
      const sales = pharmacySales.filter(ps => { const dt = new Date(ps.saleDate); return dt >= cm && dt < dn; }).reduce((s, ps) => s + ps.total, 0);
      const purchases = purchaseOrders.filter(po => { const dt = new Date(po.orderDate); return dt >= cm && dt < dn; }).reduce((s, po) => s + po.totalAmount, 0);
      monthlyPhSales.push({ month: cm.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), sales, purchases });
      cm = dn;
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
      const sales = pharmacySales.filter(ps => { const dt = new Date(ps.saleDate); return dt >= d && dt < dn; }).reduce((s, ps) => s + ps.total, 0);
      const purchases = purchaseOrders.filter(po => { const dt = new Date(po.orderDate); return dt >= d && dt < dn; }).reduce((s, po) => s + po.totalAmount, 0);
      monthlyPhSales.push({ month: d.toLocaleDateString("en-US", { month: "short" }), sales, purchases });
    }
  }

  // ============ Laboratory ============
  const labOrders = await db.labOrder.findMany({ include: { patient: true, items: { include: { test: true } }, samples: true, results: true }, orderBy: { orderedAt: "desc" } });

  const labOrdersTotal = labOrders.reduce((s, o) => s + o.totalAmount, 0);
  const labOrdersPaid = labOrders.reduce((s, o) => s + o.paidAmount, 0);
  const labPendingOrders = labOrders.filter(o => o.status === "ordered" || o.status === "collected").length;
  const labCompletedOrders = labOrders.filter(o => o.status === "completed").length;
  const labInProgressOrders = labOrders.filter(o => o.status === "processing").length;

  const labByStatus: Record<string, number> = {};
  labOrders.forEach(o => { labByStatus[o.status] = (labByStatus[o.status] || 0) + 1; });

  const testCounts: Record<string, number> = {};
  labOrders.forEach(o => { o.items.forEach(item => { const testName = (item as unknown as { test?: { name: string } }).test?.name || "Unknown"; testCounts[testName] = (testCounts[testName] || 0) + 1; }); });
  const labTestsPopularity = Object.entries(testCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  const monthlyLabRevenue: { month: string; orders: number; revenue: number }[] = [];
  if (period === "custom" && customStart && customEnd) {
    const ms = new Date(customStart); const me = new Date(customEnd);
    let cm = new Date(ms.getFullYear(), ms.getMonth(), 1);
    while (cm <= me) {
      const dn = new Date(cm.getFullYear(), cm.getMonth() + 1, 1);
      const monthOrders = labOrders.filter(o => { const dt = new Date(o.orderedAt); return dt >= cm && dt < dn; });
      monthlyLabRevenue.push({ month: cm.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), orders: monthOrders.length, revenue: monthOrders.reduce((s, o) => s + o.totalAmount, 0) });
      cm = dn;
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
      const monthOrders = labOrders.filter(o => { const dt = new Date(o.orderedAt); return dt >= d && dt < dn; });
      monthlyLabRevenue.push({ month: d.toLocaleDateString("en-US", { month: "short" }), orders: monthOrders.length, revenue: monthOrders.reduce((s, o) => s + o.totalAmount, 0) });
    }
  }

  // ============ Staff ============
  const staff = await db.staff.findMany({ where: branchFilter, include: { attendance: { where: { date: { gte: startDate } } } } });
  const staffAttendance: { name: string; present: number; absent: number; leave: number }[] = [];
  staff.slice(0, 10).forEach(s => {
    staffAttendance.push({ name: s.name, present: s.attendance.filter(a => a.status === "present").length, absent: s.attendance.filter(a => a.status === "absent").length, leave: s.attendance.filter(a => a.status === "leave").length });
  });
  const staffByDept: Record<string, number> = {};
  staff.forEach(s => { staffByDept[s.department || "Unassigned"] = (staffByDept[s.department || "Unassigned"] || 0) + 1; });

  // ============ Invoice List ============
  const invoiceList = allInvoices.map(i => ({
    id: i.id, invoiceNo: i.invoiceNo, patientName: i.patient?.name || "",
    type: i.type, total: i.total, paid: i.paid, due: i.due,
    date: i.date.toISOString(), status: i.status, paymentMethod: i.paymentMethod || "",
  }));

  return NextResponse.json({
    totalRevenue, totalCollection, totalDue, revenueByType, revenueByPayment,
    doctorPerf, monthlyRevenue, dailyRevenue,
    patientCount: patients.length, appointmentCount: appointments.length,
    expensesTotal, netProfit: totalRevenue - expensesTotal,
    expenses: expenses.slice(0, 50), expenseByCategory,
    newPatientsMonth, patientByMonth,
    confirmedAppts, cancelledAppts, pendingAppts, noShowAppts,
    apptByDoctor, apptByDay, apptByHour,
    invoicesByType, paymentsByMethod, outstanding: outstanding.length,
    outstanding0_30, outstanding31_60, outstanding60plus, invoiceList,
    phSalesTotal, phSalesCollection, phPurchasesTotal, phStockValue,
    expiringMedicines, lowStockMedicines, monthlyPhSales,
    labOrdersTotal, labOrdersPaid, labOrdersDue: labOrdersTotal - labOrdersPaid,
    labPendingOrders, labCompletedOrders, labInProgressOrders,
    labByStatus, labTestsPopularity, monthlyLabRevenue,
    totalLabOrders: labOrders.length, totalLabTests: (await db.labTestMaster.count()),
    totalStaff: staff.length, activeStaff: staff.filter(s => s.status === "active").length,
    staffAttendance, staffByDept,
  });
});
