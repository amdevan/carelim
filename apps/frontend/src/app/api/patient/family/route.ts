import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Get family members (patients linked by emergency contact or similar)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await db.patientUser.findUnique({ where: { id: userId } });
  if (!user || !user.patientId) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const patient = await db.patient.findUnique({ where: { id: user.patientId } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  // For now, return family members as patients with the same phone number or email domain
  // In production, you'd have a proper FamilyMember model
  const familyMembers = await db.patient.findMany({
    where: {
      OR: [
        { phone: patient.phone },
        { id: user.patientId },
      ],
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(familyMembers);
}

// POST - Add a family member
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, name, phone, gender, dob, bloodGroup, relationship } = body;
  if (!userId || !name) return NextResponse.json({ error: "userId and name required" }, { status: 400 });

  const count = await db.patient.count();
  const patient = await db.patient.create({
    data: {
      patientCode: `PT-${String(count + 1).padStart(5, "0")}`,
      name,
      phone: phone || "",
      gender: gender || "male",
      dob: dob ? new Date(dob) : null,
      bloodGroup: bloodGroup || null,
      status: "active",
      emergencyName: relationship || null,
    },
  });

  return NextResponse.json(patient, { status: 201 });
}
