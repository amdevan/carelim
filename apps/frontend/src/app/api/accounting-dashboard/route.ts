import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfPrevMonth = startOfMonth;

  const [invoices, monthInvoices, prevMonthInvoices, expenses, monthExpenses, prevMonthExpenses, patientPayments, todayPayments, supplierPayments, commissions, claims, cashTxns, bankTxns, journalEntries, pharmacySales, labOrders, radiologyTests] = await Promise.all([
    db.invoice.findMany(),
    db.invoice.findMany({ where: { date: { gte: startOfMonth } } }),
    db.invoice.findMany({ where: { date: { gte: startOfPrevMonth, lt: endOfPrevMonth } } }),
    db.expense.findMany(),
    db.expense.findMany({ where: { date: { gte: startOfMonth } } }),
    db.expense.findMany({ where: { date: { gte: startOfPrevMonth, lt: endOfPrevMonth } } }),
    db.patientPayment.findMany(),
    db.patientPayment.findMany({ where: { date: { gte: startOfDay, lt: endOfDay } } }),
    db.supplierPayment.findMany(),
    db.doctorCommission.findMany(),
    db.insuranceClaim.findMany(),
    db.cashTransaction.findMany({ orderBy: { date: "desc" }, take: 50 }),
    db.bankTransaction.findMany({ orderBy: { date: "desc" }, take: 50 }),
    db.journalEntry.findMany({ include: { items: { include: { account: true } } }, orderBy: { date: "desc" }, take: 10 }),
    db.pharmacySale.findMany({ where: { saleDate: { gte: startOfMonth } } }),
    db.labOrder.findMany({ where: { orderedAt: { gte: startOfMonth } } }),
    db.radiologyStudy.findMany({ where: { createdAt: { gte: startOfMonth } }, include: { modality: true } }),
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

  return NextResponse.json({
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
