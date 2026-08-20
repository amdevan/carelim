import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/public/booking
 *
 * Query params:
 *   ?action=departments        → list active departments
 *   ?action=doctors&departmentId=X → doctors in a department
 *   ?action=slots&doctorId=X&date=YYYY-MM-DD → available time slots
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "departments";

  try {
    if (action === "departments") {
      const departments = await db.department.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: { _count: { select: { doctors: { where: { status: "active" } } } } },
      });
      return NextResponse.json(
        departments.map((d) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          description: d.description,
          color: d.color,
          doctorCount: d._count.doctors,
        }))
      );
    }

    if (action === "doctors") {
      const departmentId = searchParams.get("departmentId");
      if (!departmentId) {
        return NextResponse.json({ error: "departmentId is required" }, { status: 400 });
      }
      const doctors = await db.doctor.findMany({
        where: { departmentId, status: "active" },
        orderBy: { name: "asc" },
        include: { department: true },
      });
      return NextResponse.json(
        doctors.map((d) => ({
          id: d.id,
          name: d.name,
          specialization: d.specialization,
          qualification: d.qualification,
          experience: d.experience,
          consultationFee: d.consultationFee,
          rating: d.rating,
          avatar: d.avatar,
          department: { id: d.department.id, name: d.department.name, color: d.department.color },
          workingDays: d.workingDays,
          startTime: d.startTime,
          endTime: d.endTime,
        }))
      );
    }

    if (action === "slots") {
      const doctorId = searchParams.get("doctorId");
      const dateStr = searchParams.get("date");
      if (!doctorId || !dateStr) {
        return NextResponse.json({ error: "doctorId and date are required" }, { status: 400 });
      }

      const date = new Date(dateStr);
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayName = dayNames[date.getDay()];

      const doctor = await db.doctor.findUnique({ where: { id: doctorId } });
      if (!doctor) {
        return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
      }

      // Check if doctor works on this day
      const workingDays = doctor.workingDays.split(",").map((d) => d.trim());
      if (!workingDays.includes(dayName)) {
        return NextResponse.json({ slots: [], message: "Doctor is not available on this day" });
      }

      // Get schedule slots for this day
      const scheduleSlots = await db.doctorScheduleSlot.findMany({
        where: { doctorId, dayName, status: { not: "blocked" } },
      });

      // Count existing appointments for this date+doctor
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      const bookedAppointments = await db.appointment.findMany({
        where: {
          doctorId,
          date: { gte: dayStart, lt: dayEnd },
          status: { notIn: ["cancelled", "no-show"] },
        },
        select: { time: true },
      });
      const bookedTimes = new Set(bookedAppointments.map((a) => a.time));

      // Generate time slots
      const startTime = scheduleSlots.length > 0 ? scheduleSlots[0].startTime : doctor.startTime;
      const endTime = scheduleSlots.length > 0 ? scheduleSlots[0].endTime : doctor.endTime;
      const slotDuration = scheduleSlots.length > 0 ? scheduleSlots[0].slotDuration : 15;
      const capacity = scheduleSlots.length > 0 ? scheduleSlots[0].capacity : 1;

      const slots = generateTimeSlots(startTime, endTime, slotDuration);
      const slotsWithAvailability = slots.map((time) => {
        const bookedCount = bookedTimes.has(time) ? 1 : 0;
        return {
          time,
          available: bookedCount < capacity,
          booked: bookedCount,
          capacity,
        };
      });

      return NextResponse.json({ slots: slotsWithAvailability, dayName });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Public booking API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/public/booking
 * Creates a patient (if needed) and books an appointment.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { doctorId, departmentId, date, time, patientName, patientPhone, patientEmail, patientAge, patientGender, reason } = body;

    if (!doctorId || !date || !time || !patientName || !patientPhone) {
      return NextResponse.json(
        { error: "doctorId, date, time, patientName, and patientPhone are required" },
        { status: 400 }
      );
    }

    // Find or create patient
    let patient = await db.patient.findFirst({ where: { phone: patientPhone } });
    if (!patient) {
      const patientCode = `PT-${Date.now().toString(36).toUpperCase()}`;
      patient = await db.patient.create({
        data: {
          patientCode,
          name: patientName,
          phone: patientPhone,
          email: patientEmail || undefined,
          age: patientAge ? parseInt(patientAge) : 0,
          gender: patientGender || "male",
        },
      });
    }

    // Count existing appointments for token number
    const appointmentDate = new Date(date);
    const dayStart = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
    const dayEnd = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate() + 1);
    const count = await db.appointment.count({
      where: { date: { gte: dayStart, lt: dayEnd } },
    });

    // Get doctor fee
    const doctor = await db.doctor.findUnique({ where: { id: doctorId } });

    const appointment = await db.appointment.create({
      data: {
        patientId: patient.id,
        doctorId,
        departmentId: departmentId || doctor?.departmentId,
        date: dayStart,
        time,
        type: "online",
        reason: reason || undefined,
        fee: doctor?.consultationFee || 0,
        status: "scheduled",
        tokenNo: count + 1,
      },
      include: { patient: true, doctor: { include: { department: true } } },
    });

    await db.auditLog.create({
      data: {
        user: "public@booking",
        action: "CREATE",
        module: "Appointment",
        detail: `Public booking by ${patientName} with Dr. ${doctor?.name || "Unknown"} at ${time}`,
      },
    });

    return NextResponse.json(
      {
        success: true,
        appointment: {
          id: appointment.id,
          tokenNo: appointment.tokenNo,
          date: appointment.date,
          time: appointment.time,
          doctor: appointment.doctor?.name,
          department: appointment.doctor?.department?.name,
          fee: appointment.fee,
          patient: appointment.patient?.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Public booking POST error:", error);
    return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 });
  }
}

function generateTimeSlots(start: string, end: string, durationMinutes: number): string[] {
  const slots: string[] = [];
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (currentMinutes < endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    currentMinutes += durationMinutes;
  }

  return slots;
}
