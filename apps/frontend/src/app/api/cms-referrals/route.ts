import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const referrals = await db.referral.findMany({ where, orderBy: { createdAt: "desc" } });
  // Enrich with patient, doctor, branch, campaign names
  const patientIds = [...new Set(referrals.map(r => r.patientId))];
  const doctorIds = [...new Set(referrals.map(r => r.doctorId).filter(Boolean) as string[])];
  const branchIds = [...new Set(referrals.map(r => r.clinicId).filter(Boolean) as string[])];
  const [patients, doctors, branches] = await Promise.all([
    db.patient.findMany({ where: { id: { in: patientIds } } }),
    db.doctor.findMany({ where: { id: { in: doctorIds } } }),
    db.branch.findMany({ where: { id: { in: branchIds } } }),
  ]);
  const pMap = Object.fromEntries(patients.map(p => [p.id, p.name]));
  const dMap = Object.fromEntries(doctors.map(d => [d.id, d.name]));
  const bMap = Object.fromEntries(branches.map(b => [b.id, b.name]));
  return NextResponse.json(referrals.map(r => ({
    ...r,
    patientName: pMap[r.patientId] || r.patientId,
    doctorName: r.doctorId ? dMap[r.doctorId] || "—" : "—",
    clinicName: r.clinicId ? bMap[r.clinicId] || "—" : "—",
  })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.referral.count();
  const referral = await db.referral.create({
    data: { ...body, referralNo: `REF-${String(count + 1).padStart(5, "0")}` },
  });
  // Tag patient as coming from Carelim MS (if not already tagged)
  const existingSource = await db.patientSource.findFirst({ where: { patientId: body.patientId } });
  if (!existingSource) {
    await db.patientSource.create({
      data: {
        patientId: body.patientId,
        sourceType: "carelim",
        sourceName: "carelim_ms",
        trackingId: `CMS-${Date.now().toString(36).toUpperCase()}`,
      },
    });
  }

  await db.patientActivityLog.create({ data: { patientId: body.patientId, activity: "commission_generated", description: `Referral ${referral.referralNo} created — ${body.commissionRate}% commission`, performedBy: "system" } });
  await db.auditLog.create({ data: { user: "system", action: "CREATE", module: "Carelim MS", detail: `Created referral ${referral.referralNo}` } });
  return NextResponse.json(referral, { status: 201 });
}
