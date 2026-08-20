import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sourceType = searchParams.get("sourceType");
  const q = searchParams.get("q");
  const where: Record<string, unknown> = {};
  if (sourceType) where.sourceType = sourceType;
  const sources = await db.patientSource.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  // Enrich with patient, branch, campaign data
  const patientIds = [...new Set(sources.map(s => s.patientId))];
  const branchIds = [...new Set(sources.map(s => s.clinicId).filter(Boolean) as string[])];
  const campaignIds = [...new Set(sources.map(s => s.campaignId).filter(Boolean) as string[])];
  const [patients, branches, campaigns] = await Promise.all([
    db.patient.findMany({ where: { id: { in: patientIds } } }),
    db.branch.findMany({ where: { id: { in: branchIds } } }),
    db.campaign.findMany({ where: { id: { in: campaignIds } } }),
  ]);
  const patientMap = Object.fromEntries(patients.map(p => [p.id, p]));
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));
  const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c.name]));

  let result = sources.map(s => ({
    ...s,
    patient: patientMap[s.patientId] ? { id: patientMap[s.patientId].id, name: patientMap[s.patientId].name, patientCode: patientMap[s.patientId].patientCode, phone: patientMap[s.patientId].phone, age: patientMap[s.patientId].age, gender: patientMap[s.patientId].gender } : null,
    clinicName: s.clinicId ? branchMap[s.clinicId] || "—" : "—",
    campaignName: s.campaignId ? campaignMap[s.campaignId] || "—" : "—",
  }));
  if (q) {
    const ql = q.toLowerCase();
    result = result.filter(r => r.patient?.name.toLowerCase().includes(ql) || r.trackingId.toLowerCase().includes(ql) || r.patient?.phone.includes(q) || r.patient?.patientCode.toLowerCase().includes(ql));
  }
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.patientSource.count();
  const trackingId = `CMS-${String(count + 1).padStart(5, "0")}`;
  const source = await db.patientSource.create({
    data: { ...body, trackingId },
  });
  await db.patientActivityLog.create({ data: { patientId: body.patientId, activity: "appointment_booked", description: `Patient registered as ${body.sourceType} via ${body.sourceName}`, performedBy: body.createdBy || "system" } });
  await db.auditLog.create({ data: { user: body.createdBy || "system", action: "CREATE", module: "Carelim MS", detail: `Created patient source ${trackingId} (${body.sourceType}/${body.sourceName})` } });
  return NextResponse.json({ ...source, trackingId }, { status: 201 });
}
