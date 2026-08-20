import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Search doctors
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const deptId = searchParams.get("departmentId");
  const where: Record<string, unknown> = { status: "active" };
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { specialization: { contains: q } },
    ];
  }
  if (deptId) where.departmentId = deptId;

  const doctors = await db.doctor.findMany({
    where,
    include: { department: true },
    orderBy: { name: "asc" },
  });

  // Get schedule slots for each doctor
  const doctorsWithSlots = await Promise.all(
    doctors.map(async (doc) => {
      const slots = await db.doctorScheduleSlot.findMany({
        where: { doctorId: doc.id, status: "available" },
        orderBy: [{ dayName: "asc" }, { startTime: "asc" }],
      });
      return { ...doc, scheduleSlots: slots };
    })
  );

  return NextResponse.json(doctorsWithSlots);
}
