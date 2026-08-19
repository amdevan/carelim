import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const doctor = await db.doctor.findFirst({
      where: { email },
    });

    if (!doctor) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Demo authentication: accept "carelim123" as the password for any existing doctor
    if (password !== "carelim123") {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      doctor: {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization,
        departmentId: doctor.departmentId,
        licenseNumber: doctor.licenseNumber,
        status: doctor.status,
      },
      token: `demo-token-${doctor.id}`,
    });
  } catch (error) {
    console.error("Doctor auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
