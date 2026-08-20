import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [totalContacts, activeContacts, newContactsThisMonth, totalDeals, deals, allDeals, overdueTasks, pendingTasks, totalCommunications, commsThisWeek, recentActivities, contactsByType, dealsByStage, dealsBySource] = await Promise.all([
    db.cRMContact.count(),
    db.cRMContact.count({ where: { status: "active" } }),
    db.cRMContact.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.cRMDeal.count(),
    db.cRMDeal.findMany({ where: { stage: { notIn: ["closed_won", "closed_lost"] } } }),
    db.cRMDeal.findMany(),
    db.cRMTask.count({ where: { status: { notIn: ["completed", "cancelled"] }, dueDate: { lt: today } } }),
    db.cRMTask.count({ where: { status: { notIn: ["completed", "cancelled"] } } }),
    db.cRMCommunication.count(),
    db.cRMCommunication.count({ where: { createdAt: { gte: startOfWeek } } }),
    db.cRMActivity.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    db.cRMContact.groupBy({ by: ["type"], _count: true }),
    db.cRMDeal.groupBy({ by: ["stage"], _count: true }),
    db.cRMDeal.groupBy({ by: ["source"], _count: true }),
  ]);

  const activeDeals = deals.length;
  const totalDealValue = allDeals.reduce((s, d) => s + d.value, 0);
  const wonDeals = allDeals.filter((d) => d.stage === "closed_won");
  const lostDeals = allDeals.filter((d) => d.stage === "closed_lost");
  const wonDealValue = wonDeals.reduce((s, d) => s + d.value, 0);
  const lostDealValue = lostDeals.reduce((s, d) => s + d.value, 0);
  const winRate = wonDeals.length + lostDeals.length > 0 ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0;
  const avgDealValue = allDeals.length > 0 ? Math.round(totalDealValue / allDeals.length) : 0;

  const pipelineValue: { stage: string; value: number; count: number }[] = [];
  for (const row of dealsByStage) {
    const stageDeals = allDeals.filter((d) => d.stage === row.stage);
    pipelineValue.push({
      stage: row.stage,
      value: stageDeals.reduce((s, d) => s + d.value, 0),
      count: row._count,
    });
  }

  const monthlyDeals: { month: string; won: number; lost: number; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const monthDeals = allDeals.filter((dl) => dl.createdAt >= d && dl.createdAt < dn);
    monthlyDeals.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      won: monthDeals.filter((dl) => dl.stage === "closed_won").length,
      lost: monthDeals.filter((dl) => dl.stage === "closed_lost").length,
      total: monthDeals.length,
    });
  }

  const contactsByTypeMap: Record<string, number> = {};
  contactsByType.forEach((r) => { contactsByTypeMap[r.type] = r._count; });

  const dealsByStageMap: Record<string, number> = {};
  dealsByStage.forEach((r) => { dealsByStageMap[r.stage] = r._count; });

  const dealsBySourceMap: Record<string, number> = {};
  dealsBySource.forEach((r) => { dealsBySourceMap[r.source] = r._count; });

  return NextResponse.json({
    totalContacts,
    activeContacts,
    newContactsThisMonth,
    totalDeals,
    activeDeals,
    totalDealValue,
    wonDealValue,
    lostDealValue,
    winRate,
    avgDealValue,
    overdueTasks,
    pendingTasks,
    totalCommunications,
    commsThisWeek,
    contactsByType: contactsByTypeMap,
    dealsByStage: dealsByStageMap,
    dealsBySource: dealsBySourceMap,
    recentActivities,
    pipelineValue,
    monthlyDeals,
  });
}
