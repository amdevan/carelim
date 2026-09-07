import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async () => {
  try {
    const [contacts, deals, communications, tasks] = await Promise.all([
      db.cRMContact.findMany({ select: { id: true, type: true, status: true } }),
      db.cRMDeal.findMany({ select: { id: true, stage: true, value: true, source: true, createdAt: true } }),
      db.cRMCommunication.findMany({ select: { id: true, type: true, createdAt: true } }),
      db.cRMTask.findMany({ select: { id: true, status: true, priority: true } }),
    ]);

    const totalContacts = contacts.length;
    const activeDeals = deals.filter(d => !["closed_won", "closed_lost"].includes(d.stage)).length;
    const wonRevenue = deals.filter(d => d.stage === "closed_won").reduce((sum, d) => sum + d.value, 0);
    const wonDeals = deals.filter(d => d.stage === "closed_won").length;
    const lostDeals = deals.filter(d => d.stage === "closed_lost").length;
    const winRate = (wonDeals + lostDeals) > 0 ? Math.round((wonDeals / (wonDeals + lostDeals)) * 100) : 0;
    const avgDealValue = deals.length > 0 ? Math.round(deals.reduce((sum, d) => sum + d.value, 0) / deals.length) : 0;
    const pendingTasks = tasks.filter(t => t.status === "pending").length;

    // Deals by stage
    const stageCount: Record<string, number> = {};
    deals.forEach(d => { stageCount[d.stage] = (stageCount[d.stage] || 0) + 1; });
    const dealsByStage = Object.entries(stageCount).map(([stage, count]) => ({ stage, count }));

    // Contacts by type
    const typeCount: Record<string, number> = {};
    contacts.forEach(c => { typeCount[c.type] = (typeCount[c.type] || 0) + 1; });
    const contactsByType = Object.entries(typeCount).map(([type, count]) => ({ type, count }));

    // Deals by source
    const sourceCount: Record<string, number> = {};
    deals.forEach(d => { sourceCount[d.source] = (sourceCount[d.source] || 0) + 1; });
    const dealsBySource = Object.entries(sourceCount).map(([source, count]) => ({ source, count }));

    // Pipeline by stage (value)
    const stageValue: Record<string, number> = {};
    deals.forEach(d => { stageValue[d.stage] = (stageValue[d.stage] || 0) + d.value; });
    const pipelineByStage = Object.entries(stageValue).map(([stage, value]) => ({ stage, value }));

    // Monthly deals (last 12 months)
    const monthlyDeals: { month: string; won: number; lost: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toISOString().slice(0, 7); // YYYY-MM
      const monthLabel = date.toLocaleString("en-US", { month: "short", year: "2-digit" });
      const won = deals.filter(d => d.stage === "closed_won" && d.createdAt.toISOString().startsWith(monthStr)).length;
      const lost = deals.filter(d => d.stage === "closed_lost" && d.createdAt.toISOString().startsWith(monthStr)).length;
      monthlyDeals.push({ month: monthLabel, won, lost });
    }

    // Contact distribution
    const contactDistribution = Object.entries(typeCount).map(([type, count]) => ({
      type,
      count,
      percentage: totalContacts > 0 ? Math.round((count / totalContacts) * 100) : 0,
    }));

    // Deal performance
    const dealPerformance = [
      { metric: "Total Deals", value: String(deals.length) },
      { metric: "Active Deals", value: String(activeDeals) },
      { metric: "Won Deals", value: String(wonDeals) },
      { metric: "Lost Deals", value: String(lostDeals) },
      { metric: "Win Rate", value: `${winRate}%` },
      { metric: "Avg Deal Value", value: `Rs ${avgDealValue.toLocaleString()}` },
    ];

    return NextResponse.json({
      summary: { totalContacts, activeDeals, wonRevenue, winRate, avgDealValue, pendingTasks },
      dealsByStage,
      contactsByType,
      dealsBySource,
      pipelineByStage,
      monthlyDeals,
      contactDistribution,
      dealPerformance,
    });
  } catch (error) {
    console.error("crm-reports error:", error);
    return NextResponse.json({
      summary: { totalContacts: 0, activeDeals: 0, wonRevenue: 0, winRate: 0, avgDealValue: 0, pendingTasks: 0 },
      dealsByStage: [],
      contactsByType: [],
      dealsBySource: [],
      pipelineByStage: [],
      monthlyDeals: [],
      contactDistribution: [],
      dealPerformance: [],
    });
  }
});
