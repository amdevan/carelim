import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [referrals, settlements] = await Promise.all([
    db.referral.findMany({ orderBy: { createdAt: "desc" } }),
    db.commissionSettlement.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const totalCommission = referrals.reduce((s, r) => s + r.commissionAmount, 0);
  const pendingCommission = referrals.filter(r => r.status === "pending" || r.status === "earned").reduce((s, r) => s + r.commissionAmount, 0);
  const paidCommission = settlements.filter(s => s.status === "paid").reduce((s, r) => s + r.amount, 0);
  const monthCommission = referrals.filter(r => r.createdAt >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).reduce((s, r) => s + r.commissionAmount, 0);

  // By clinic
  const byClinic: Record<string, { count: number; amount: number; pending: number }> = {};
  referrals.forEach(r => {
    const k = r.clinicId || "unassigned";
    byClinic[k] = byClinic[k] || { count: 0, amount: 0, pending: 0 };
    byClinic[k].count++;
    byClinic[k].amount += r.commissionAmount;
    if (r.status === "pending" || r.status === "earned") byClinic[k].pending += r.commissionAmount;
  });
  const branches = await db.branch.findMany();
  const bMap = Object.fromEntries(branches.map(b => [b.id, b.name]));
  const byClinicArray = Object.entries(byClinic).map(([id, v]) => ({ clinicId: id, clinicName: bMap[id] || id, ...v }));

  // By doctor
  const byDoctor: Record<string, { count: number; amount: number }> = {};
  referrals.forEach(r => {
    const k = r.doctorId || "unassigned";
    byDoctor[k] = byDoctor[k] || { count: 0, amount: 0 };
    byDoctor[k].count++;
    byDoctor[k].amount += r.commissionAmount;
  });
  const doctors = await db.doctor.findMany();
  const dMap = Object.fromEntries(doctors.map(d => [d.id, d.name]));
  const byDoctorArray = Object.entries(byDoctor).map(([id, v]) => ({ doctorId: id, doctorName: dMap[id] || id, ...v }));

  return NextResponse.json({
    summary: { totalCommission, pendingCommission, paidCommission, monthCommission, totalReferrals: referrals.length, totalSettlements: settlements.length },
    byClinic: byClinicArray,
    byDoctor: byDoctorArray,
    referrals: referrals.map(r => ({ ...r, settlement: settlements.find(s => s.referralId === r.id) })),
    settlements,
  });
}
