/**
 * Doctors module — port of frontend /api/doctors and /api/doctors/[id].
 * Tenant isolation enforced by lib/prisma.ts (doctor is in TENANT_MODELS).
 */
import { Router, Request, Response } from "express";
import { db } from "../lib/prisma";
import { hashPassword } from "../lib/auth";
import { fail, wrap } from "../lib/http";
import { requirePermission } from "../middleware/permissions";
import { getCurrentUserId } from "../lib/tenant-context";

function toSafe(doctor: Record<string, unknown>) {
  const { password: _pw, ...safe } = doctor;
  return safe;
}

const DOCTOR_FIELDS = [
  "name", "email", "phone", "gender", "qualification", "specialization",
  "departmentId", "licenseNumber", "branchId",
  "experience", "consultationFee", "commissionPct", "rating",
  "workingDays", "startTime", "endTime", "status",
  "avatar", "signature", "password",
];

async function listDoctors(req: Request, res: Response) {
  const q = (req.query.q as string) || "";
  const deptId = req.query.departmentId as string | undefined;
  const branchId = req.query.branchId as string | undefined;
  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  if (q) where.OR = [{ name: { contains: q } }, { specialization: { contains: q } }, { email: { contains: q } }];
  if (deptId) where.departmentId = deptId;
  const doctors = await db.doctor.findMany({
    where,
    include: { department: true },
    orderBy: { name: "asc" },
  });
  res.json((doctors as unknown as Record<string, unknown>[]).map(toSafe));
}

async function createDoctor(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const data: Record<string, unknown> = {};
    for (const key of DOCTOR_FIELDS) {
      if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
        data[key] = body[key];
      }
    }
    if (!data.specialization) data.specialization = "General";
    if (!data.licenseNumber) data.licenseNumber = "";
    if (!data.phone) data.phone = "";
    data.password = await hashPassword(
      typeof data.password === "string" && data.password ? data.password : "Doctor@123"
    );
    const doctor = await db.doctor.create({ data: data as never });
    await db.auditLog.create({
      data: {
        user: req.headers["x-user-email"] as string || "system@carelim.health",
        action: "CREATE",
        module: "Doctor",
        detail: `Added doctor ${doctor.name}`,
      },
    });
    res.status(201).json(toSafe(doctor as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("Error creating doctor:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Unique constraint")) {
      return fail(res, 400, "A doctor with this email already exists");
    }
    if (msg.includes("Foreign key constraint")) {
      return fail(res, 400, "Invalid departmentId — department not found");
    }
    return fail(res, 500, "Failed to create doctor");
  }
}

async function getDoctor(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const doctor = await db.doctor.findUnique({
      where: { id },
      include: {
        department: true,
        appointments: { include: { patient: true }, orderBy: { date: "desc" }, take: 20 },
      },
    });
    if (!doctor) return fail(res, 404, "Not found");
    res.json(toSafe(doctor as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("Error fetching doctor:", error);
    fail(res, 500, "Failed to fetch doctor");
  }
}

async function updateDoctor(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const data: Record<string, unknown> = {};
    for (const key of DOCTOR_FIELDS) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (typeof data.password === "string" && data.password) {
      data.password = await hashPassword(data.password);
    } else {
      delete data.password;
    }
    const doctor = await db.doctor.update({ where: { id: req.params.id as string }, data: data as never });
    res.json(toSafe(doctor as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("Error updating doctor:", error);
    const msg = error instanceof Error ? error.message : "Failed to update doctor";
    fail(res, 500, msg);
  }
}

async function deleteDoctor(req: Request, res: Response) {
  try {
    await db.doctor.delete({ where: { id: req.params.id as string } });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting doctor:", error);
    fail(res, 500, "Failed to delete doctor");
  }
}

export function doctorsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listDoctors));
  r.post("/", requirePermission("Doctor", "create"), wrap(createDoctor));
  r.get("/:id", wrap(getDoctor));
  r.put("/:id", wrap(updateDoctor));
  r.delete("/:id", wrap(deleteDoctor));
  return r;
}
