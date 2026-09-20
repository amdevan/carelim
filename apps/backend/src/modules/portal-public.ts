/**
 * Portal & Public routes — full port of 20 Next.js API routes:
 *
 *   patient/auth/login, patient/auth/register          → patientAuthRouter()
 *   patient/{appointments,doctors,documents,family,lab-reports,messages,
 *            notifications,payments,prescriptions,profile,reminders}
 *                                                      → patientPortalRouter()
 *   onboarding                                          → onboardingHandler
 *   public/booking, public/patient-lookup               → publicBookingRouter()
 *   public-booking                                      → publicBookingAltRouter()
 *   public-bookings (+ links, links/:id)                → publicBookingsRouter()
 *
 * Response shapes, status codes and error strings are identical to the
 * original Next routes. Public routes use rawDb exactly like the originals.
 */
import { Router, Request, Response } from "express";
import { db, rawDb } from "../lib/prisma";
import { createPatientWithSerialCode } from "../lib/patient-code";
import { hashPassword, verifyPassword, signToken } from "../lib/auth";
import { fail, wrap } from "../lib/http";
import { getCurrentUserId } from "../lib/tenant-context";

// ─── shared helpers ─────────────────────────────────────────────────────────

function makeId(len = 8) {
  return Math.random().toString(36).substring(2, 2 + len);
}

/** nanoid equivalent (nanoid is not a backend dependency). */
function nanoId(len = 8): string {
  const alphabet =
    "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GZQYQWLFV_"; // nanoid-style URL-safe alphabet
  let id = "";
  const bytes = new Uint8Array(len);
  require("crypto").webcrypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) {
    id += alphabet[bytes[i] % alphabet.length];
  }
  return id;
}

function isProd() {
  return process.env.NODE_ENV === "production";
}

/** Frontend getAuthTenantId(request) — reads the x-tenant-id header. */
function getAuthTenantId(req: Request): string | null {
  const v = req.headers["x-tenant-id"];
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** Parse a date string (YYYY-MM-DD) as a local date, not UTC */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
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

function generateSlug(...parts: (string | null | undefined)[]): string {
  const base = parts.filter(Boolean).join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base}-${Date.now().toString(36)}`;
}

// Minimal inlined MODULES lookup (frontend components/onboarding/module-data.ts)
const MODULES: { key: string; name: string; category: string }[] = [
  // Core
  { key: "patient-management", name: "Patient Management", category: "core" },
  { key: "appointment-management", name: "Appointment Management", category: "core" },
  { key: "doctor-management", name: "Doctor Management", category: "core" },
  { key: "reception", name: "Reception", category: "core" },
  { key: "emr-ehr", name: "EMR/EHR", category: "core" },
  { key: "prescription", name: "Prescription", category: "core" },
  { key: "billing", name: "Billing", category: "core" },
  { key: "accounts", name: "Accounts", category: "core" },
  { key: "inventory", name: "Inventory", category: "core" },
  { key: "pharmacy", name: "Pharmacy", category: "core" },
  { key: "laboratory", name: "Laboratory", category: "core" },
  { key: "radiology", name: "Radiology", category: "core" },
  { key: "opd", name: "OPD", category: "core" },
  { key: "ipd", name: "IPD", category: "core" },
  { key: "queue-management", name: "Queue Management", category: "core" },
  { key: "reports", name: "Reports", category: "core" },
  { key: "sms", name: "SMS", category: "core" },
  { key: "whatsapp", name: "WhatsApp", category: "core" },
  { key: "notification-center", name: "Notification Center", category: "core" },
  { key: "video-consultation", name: "Video Consultation", category: "core" },
  { key: "online-appointment", name: "Online Appointment", category: "core" },
  { key: "patient-portal", name: "Patient Portal", category: "core" },
  { key: "telemedicine", name: "Telemedicine", category: "core" },
  { key: "attendance", name: "Attendance", category: "core" },
  { key: "hr", name: "HR", category: "core" },
  { key: "payroll", name: "Payroll", category: "core" },
  // Specialty
  { key: "ivf-fertility", name: "IVF & Fertility", category: "specialty" },
  { key: "dental", name: "Dental", category: "specialty" },
  { key: "eye-care", name: "Eye Care", category: "specialty" },
  { key: "orthopedic", name: "Orthopedic", category: "specialty" },
  { key: "cardiology", name: "Cardiology", category: "specialty" },
  { key: "gynecology", name: "Gynecology", category: "specialty" },
  { key: "pediatrics", name: "Pediatrics", category: "specialty" },
  { key: "dermatology", name: "Dermatology", category: "specialty" },
  { key: "dialysis", name: "Dialysis", category: "specialty" },
  { key: "vaccination", name: "Vaccination", category: "specialty" },
  { key: "insurance", name: "Insurance", category: "specialty" },
  { key: "corporate-clients", name: "Corporate Clients", category: "specialty" },
  { key: "home-care", name: "Home Care", category: "specialty" },
  { key: "home-sample-collection", name: "Home Sample Collection", category: "specialty" },
  { key: "package-management", name: "Package Management", category: "specialty" },
  // AI
  { key: "ai-prescription", name: "AI Prescription", category: "ai" },
  { key: "ai-medical-notes", name: "AI Medical Notes", category: "ai" },
  { key: "ai-patient-follow-up", name: "AI Patient Follow-up", category: "ai" },
  { key: "ai-whatsapp-assistant", name: "AI WhatsApp Assistant", category: "ai" },
  { key: "ai-voice-dictation", name: "AI Voice Dictation", category: "ai" },
  { key: "ai-appointment-assistant", name: "AI Appointment Assistant", category: "ai" },
  { key: "ai-report-summary", name: "AI Report Summary", category: "ai" },
];

// ═══════════════════════════════════════════════════════════════════════════
// 1. patient/auth — login & register (PUBLIC, rawDb, exact cookie/token parity)
// ═══════════════════════════════════════════════════════════════════════════

async function patientLogin(req: Request, res: Response) {
  const { email, password } = (req.body || {}) as {
    email?: string;
    password?: string;
  };
  if (!email || !password) {
    return fail(res, 400, "Email and password are required");
  }
  const user = await rawDb.patientUser.findUnique({ where: { email } });
  if (!user) {
    return fail(res, 401, "Invalid credentials");
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return fail(res, 401, "Invalid credentials");
  }

  if (user.status !== "active") {
    return fail(res, 403, "Account is suspended");
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: "patient",
    type: "patient",
    tenantId: user.tenantId || undefined,
  });

  await rawDb.patientUser.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  await rawDb.auditLog.create({
    data: {
      user: user.email,
      action: "LOGIN",
      module: "PatientPortal",
      detail: "Patient logged in",
      ip: (req.headers["x-forwarded-for"] as string) || "127.0.0.1",
    },
  });

  res.append(
    "Set-Cookie",
    `carelim_token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${isProd() ? "; Secure" : ""}`
  );
  return res.status(200).json({
    id: user.id,
    patientId: user.patientId,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    token,
  });
}

async function patientRegister(req: Request, res: Response) {
  const { name, email, password, phone } = (req.body || {}) as {
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
  };
  if (!name || !email || !password) {
    return fail(res, 400, "Name, email and password are required");
  }

  if (password.length < 8) {
    return fail(res, 400, "Password must be at least 8 characters");
  }

  // Check if email already exists
  const existing = await rawDb.patientUser.findUnique({ where: { email } });
  if (existing) {
    return fail(res, 409, "Email already registered");
  }

  const hashedPassword = await hashPassword(password);

  // Create a Patient record first (serial file number)
  const patient = await createPatientWithSerialCode(rawDb, {
    name,
    email,
    phone: phone || "",
    gender: "male",
    status: "active",
  });

  // Tag patient as coming from Carelim Mobile App
  await rawDb.patientSource.create({
    data: {
      patientId: patient.id,
      sourceType: "carelim",
      sourceName: "mobile_app",
      trackingId: `CMS-${Date.now().toString(36).toUpperCase()}`,
    },
  });

  // Create PatientUser linked to the patient
  const patientUser = await rawDb.patientUser.create({
    data: {
      patientId: patient.id,
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      status: "active",
    },
  });

  await rawDb.auditLog.create({
    data: {
      user: email,
      action: "REGISTER",
      module: "PatientPortal",
      detail: `Patient registered: ${name}`,
    },
  });

  return res.status(201).json({
    id: patientUser.id,
    patientId: patientUser.patientId,
    name: patientUser.name,
    email: patientUser.email,
    phone: patientUser.phone,
  });
}

export function patientAuthRouter(): Router {
  const r = Router();
  r.post("/login", wrap(patientLogin));
  r.post("/register", wrap(patientRegister));
  return r;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. patient portal data routes (patient JWT via authenticate middleware, db)
// ═══════════════════════════════════════════════════════════════════════════

// ── appointments ────────────────────────────────────────────────────────────

async function listAppointments(req: Request, res: Response) {
  const userId = req.query.userId as string | undefined;
  if (!userId) return fail(res, 400, "userId required");

  const user = await db.patientUser.findUnique({ where: { id: userId as string } });
  if (!user || !user.patientId) return fail(res, 404, "Patient not found");

  const appointments = await db.appointment.findMany({
    where: { patientId: user.patientId },
    include: { doctor: { include: { department: true } }, department: true },
    orderBy: [{ date: "desc" }, { time: "desc" }],
  });
  return res.json(appointments);
}

async function createAppointment(req: Request, res: Response) {
  const body = (req.body || {}) as Record<string, string | undefined>;
  const { userId, doctorId, date, time, type, reason, fee } = body as any;
  if (!userId || !doctorId || !date || !time) {
    return fail(res, 400, "userId, doctorId, date and time are required");
  }

  const user = await db.patientUser.findUnique({ where: { id: userId as string } });
  if (!user || !user.patientId) return fail(res, 404, "Patient not found");

  const doctor = await db.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) return fail(res, 404, "Doctor not found");

  const count = await db.appointment.count({ where: { date: new Date(date), doctorId } });
  const appointment = await db.appointment.create({
    data: {
      patientId: user.patientId,
      doctorId,
      date: new Date(date),
      time,
      type: type || "online",
      reason: reason || null,
      fee: fee || doctor.consultationFee,
      status: "scheduled",
      tokenNo: count + 1,
    },
    include: { doctor: true },
  });

  // Create notification
  await db.patientNotification.create({
    data: {
      userId,
      title: "Appointment Booked",
      message: `Your appointment with ${doctor.name} is scheduled for ${date} at ${time}`,
      type: "reminder",
    },
  });

  return res.status(201).json(appointment);
}

// ── doctors ─────────────────────────────────────────────────────────────────

async function searchDoctors(req: Request, res: Response) {
  const q = (req.query.q as string) || "";
  const deptId = req.query.departmentId as string | undefined;
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

  return res.json(doctorsWithSlots);
}

// ── documents ───────────────────────────────────────────────────────────────

async function listDocuments(req: Request, res: Response) {
  const userId = req.query.userId as string | undefined;
  if (!userId) return fail(res, 400, "userId required");

  const documents = await db.patientDocument.findMany({
    where: { userId },
    orderBy: { uploadedAt: "desc" },
  });
  return res.json(documents);
}

async function createDocument(req: Request, res: Response) {
  const body = (req.body || {}) as Record<string, unknown>;
  const { userId, name, type, size, fileData } = body;
  if (!userId || !name) return fail(res, 400, "userId and name required");

  const doc = await db.patientDocument.create({
    data: {
      userId: userId as string,
      name: name as string,
      type: (type as string) || "other",
      size: (size as string) || "0 KB",
      fileData: (fileData as string) || null,
    },
  });
  return res.status(201).json(doc);
}

async function deleteDocument(req: Request, res: Response) {
  const id = req.query.id as string | undefined;
  if (!id) return fail(res, 400, "id required");
  await db.patientDocument.delete({ where: { id } });
  return res.json({ ok: true });
}

// ── family ──────────────────────────────────────────────────────────────────

async function listFamily(_req: Request, res: Response) {
  const userId = getCurrentUserId();
  if (!userId) return fail(res, 400, "userId required");

  const user = await db.patientUser.findUnique({ where: { id: userId as string } });
  if (!user || !user.patientId) return fail(res, 404, "Patient not found");

  const patient = await db.patient.findUnique({ where: { id: user.patientId } });
  if (!patient) return fail(res, 404, "Patient not found");

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

  return res.json(familyMembers);
}

async function createFamilyMember(req: Request, res: Response) {
  const body = (req.body || {}) as Record<string, string | undefined>;
  const { userId, name, phone, gender, dob, bloodGroup, relationship } = body;
  if (!userId || !name) return fail(res, 400, "userId and name required");

  const patient = await createPatientWithSerialCode(db, {
    name,
    phone: phone || "",
    gender: gender || "male",
    dob: dob ? new Date(dob) : null,
    bloodGroup: bloodGroup || null,
    status: "active",
    emergencyName: relationship || null,
  });

  return res.status(201).json(patient);
}

// ── lab-reports ─────────────────────────────────────────────────────────────

async function listLabReports(req: Request, res: Response) {
  const userId = req.query.userId as string | undefined;
  if (!userId) return fail(res, 400, "userId required");

  const user = await db.patientUser.findUnique({ where: { id: userId } });
  if (!user || !user.patientId) return fail(res, 404, "Patient not found");

  const labOrders = await db.labOrder.findMany({
    where: { patientId: user.patientId },
    include: {
      items: { include: { test: true } },
      results: { include: { parameters: { include: { parameter: true } } } },
    },
    orderBy: { orderedAt: "desc" },
  });

  // Also get simple lab tests
  const labTests = await db.labTest.findMany({
    where: { patientId: user.patientId },
    orderBy: { orderedAt: "desc" },
  });

  return res.json({ orders: labOrders, tests: labTests });
}

// ── messages ────────────────────────────────────────────────────────────────

async function listMessages(req: Request, res: Response) {
  const userId = req.query.userId as string | undefined;
  if (!userId) return fail(res, 400, "userId required");

  const messages = await db.patientMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return res.json(messages);
}

async function createMessage(req: Request, res: Response) {
  const body = (req.body || {}) as Record<string, string | undefined>;
  const { userId, message, toName } = body;
  if (!userId || !message) return fail(res, 400, "userId and message required");

  const user = await db.patientUser.findUnique({ where: { id: userId } });
  const msg = await db.patientMessage.create({
    data: {
      userId,
      fromName: user?.name || "Patient",
      fromType: "patient",
      message,
      read: false,
    },
  });

  // Auto-reply from system
  await db.patientMessage.create({
    data: {
      userId,
      fromName: toName || "Carelim Health",
      fromType: "provider",
      message: "Thank you for your message. A healthcare provider will respond shortly.",
      read: false,
    },
  });

  return res.status(201).json(msg);
}

async function markMessagesRead(req: Request, res: Response) {
  const body = (req.body || {}) as Record<string, string | undefined>;
  const { userId } = body;
  if (!userId) return fail(res, 400, "userId required");
  await db.patientMessage.updateMany({ where: { userId, read: false }, data: { read: true } });
  return res.json({ ok: true });
}

// ── notifications ───────────────────────────────────────────────────────────

async function listNotifications(req: Request, res: Response) {
  const userId = req.query.userId as string | undefined;
  if (!userId) return fail(res, 400, "userId required");

  const notifications = await db.patientNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return res.json(notifications);
}

async function markNotificationsRead(req: Request, res: Response) {
  const body = (req.body || {}) as Record<string, string | undefined>;
  const { userId, notificationId } = body;
  if (!userId) return fail(res, 400, "userId required");

  if (notificationId) {
    await db.patientNotification.update({ where: { id: notificationId }, data: { read: true } });
  } else {
    await db.patientNotification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }
  return res.json({ ok: true });
}

async function createNotification(req: Request, res: Response) {
  const body = (req.body || {}) as Record<string, string | undefined>;
  const { userId, title, message, type } = body;
  if (!userId || !title || !message) return fail(res, 400, "userId, title and message required");

  const notification = await db.patientNotification.create({
    data: { userId, title, message, type: type || "info" },
  });
  return res.status(201).json(notification);
}

// ── payments ────────────────────────────────────────────────────────────────

async function listPayments(req: Request, res: Response) {
  const userId = req.query.userId as string | undefined;
  if (!userId) return fail(res, 400, "userId required");

  const user = await db.patientUser.findUnique({ where: { id: userId } });
  if (!user || !user.patientId) return fail(res, 404, "Patient not found");

  const patient = await db.patient.findUnique({ where: { id: user.patientId } });
  if (!patient) return fail(res, 404, "Patient not found");

  const payments = await db.patientPayment.findMany({
    where: { patientId: user.patientId },
    orderBy: { date: "desc" },
  });

  const invoices = await db.invoice.findMany({
    where: { patientId: user.patientId },
    orderBy: { date: "desc" },
  });

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalDue = invoices.reduce((sum, inv) => sum + inv.due, 0);

  return res.json({ payments, invoices, totalPaid, totalDue });
}

// ── prescriptions ───────────────────────────────────────────────────────────

async function listPrescriptions(req: Request, res: Response) {
  const userId = req.query.userId as string | undefined;
  if (!userId) return fail(res, 400, "userId required");

  const user = await db.patientUser.findUnique({ where: { id: userId } });
  if (!user || !user.patientId) return fail(res, 404, "Patient not found");

  const prescriptions = await db.prescription.findMany({
    where: { patientId: user.patientId },
    include: { doctor: { include: { department: true } }, items: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json(prescriptions);
}

// ── profile ─────────────────────────────────────────────────────────────────

async function getProfile(req: Request, res: Response) {
  const userId = req.query.userId as string | undefined;
  if (!userId) return fail(res, 400, "userId required");

  const user = await db.patientUser.findUnique({ where: { id: userId } });
  if (!user || !user.patientId) return fail(res, 404, "Patient not found");

  const patient = await db.patient.findUnique({
    where: { id: user.patientId },
    include: {
      appointments: { include: { doctor: true }, orderBy: { date: "desc" }, take: 50 },
      prescriptions: { include: { doctor: true, items: true }, orderBy: { createdAt: "desc" }, take: 20 },
      invoices: { orderBy: { date: "desc" }, take: 20 },
      labTests: { orderBy: { orderedAt: "desc" }, take: 20 },
      clinicalNotes: { orderBy: { createdAt: "desc" }, take: 20 },
      labOrders: {
        include: { items: { include: { test: true } }, results: true },
        orderBy: { orderedAt: "desc" },
        take: 20,
      },
      radiologyTests: { orderBy: { orderedAt: "desc" }, take: 20 },
    },
  });
  if (!patient) return fail(res, 404, "Patient not found");
  return res.json({
    ...patient,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    userPhone: user.phone,
  });
}

async function updateProfile(req: Request, res: Response) {
  const body = (req.body || {}) as Record<string, unknown>;
  const { userId, ...patientData } = body;
  if (!userId) return fail(res, 400, "userId required");

  const user = await db.patientUser.findUnique({ where: { id: userId as string } });
  if (!user || !user.patientId) return fail(res, 404, "Patient not found");

  const patient = await db.patient.update({
    where: { id: user.patientId },
    data: patientData as any,
  });
  return res.json(patient);
}

// ── reminders ───────────────────────────────────────────────────────────────

async function listReminders(req: Request, res: Response) {
  const userId = req.query.userId as string | undefined;
  if (!userId) return fail(res, 400, "userId required");

  const reminders = await db.patientReminder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return res.json(reminders);
}

async function createReminder(req: Request, res: Response) {
  const body = (req.body || {}) as Record<string, string | undefined>;
  const { userId, title, time, type } = body;
  if (!userId || !title || !time) return fail(res, 400, "userId, title and time required");

  const reminder = await db.patientReminder.create({
    data: { userId, title, time, type: type || "medication" },
  });
  return res.status(201).json(reminder);
}

async function toggleReminder(req: Request, res: Response) {
  const body = (req.body || {}) as Record<string, unknown>;
  const { id, active } = body;
  if (!id) return fail(res, 400, "id required");
  const reminder = await db.patientReminder.update({
    where: { id: id as string },
    data: { active: active as boolean },
  });
  return res.json(reminder);
}

async function deleteReminder(req: Request, res: Response) {
  const id = req.query.id as string | undefined;
  if (!id) return fail(res, 400, "id required");
  await db.patientReminder.delete({ where: { id } });
  return res.json({ ok: true });
}

export function patientPortalRouter(): Router {
  const r = Router();
  r.get("/appointments", wrap(listAppointments));
  r.post("/appointments", wrap(createAppointment));
  r.get("/doctors", wrap(searchDoctors));
  r.get("/documents", wrap(listDocuments));
  r.post("/documents", wrap(createDocument));
  r.delete("/documents", wrap(deleteDocument));
  r.get("/family", wrap(listFamily));
  r.post("/family", wrap(createFamilyMember));
  r.get("/lab-reports", wrap(listLabReports));
  r.get("/messages", wrap(listMessages));
  r.post("/messages", wrap(createMessage));
  r.put("/messages", wrap(markMessagesRead));
  r.get("/notifications", wrap(listNotifications));
  r.put("/notifications", wrap(markNotificationsRead));
  r.post("/notifications", wrap(createNotification));
  r.get("/payments", wrap(listPayments));
  r.get("/prescriptions", wrap(listPrescriptions));
  r.get("/profile", wrap(getProfile));
  r.put("/profile", wrap(updateProfile));
  r.get("/reminders", wrap(listReminders));
  r.post("/reminders", wrap(createReminder));
  r.put("/reminders", wrap(toggleReminder));
  r.delete("/reminders", wrap(deleteReminder));
  return r;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. onboarding (PUBLIC, rawDb — creates tenant/org/branch/admin/settings)
// ═══════════════════════════════════════════════════════════════════════════

async function onboardingPost(req: Request, res: Response) {
  try {
    const body = (req.body || {}) as any;
    const { basicInfo, selectedModules, selectedPlan, skipPackage } = body;

    // Validate required fields
    if (!basicInfo?.clinicName || !basicInfo?.clinicType) {
      return fail(res, 400, "Clinic name and type are required");
    }
    if (!basicInfo?.adminFullName || !basicInfo?.adminEmailAddress) {
      return fail(res, 400, "Administrator name and email are required");
    }
    if (!basicInfo?.adminMobileNumber) {
      return fail(res, 400, "Administrator mobile number is required");
    }
    if (!basicInfo?.adminPassword) {
      return fail(res, 400, "Password is required");
    }
    if (basicInfo.adminPassword.length < 8) {
      return fail(res, 400, "Password must be at least 8 characters");
    }

    // Check if email already exists (rawDb — no tenant context during onboarding)
    const existingUser = await rawDb.user.findUnique({
      where: { email: basicInfo.adminEmailAddress },
    });
    if (existingUser) {
      return fail(res, 409, "An account with this email already exists");
    }

    // ─── 1. Create Tenant ────────────────────────────────────────
    const existingTenant = await rawDb.tenant.findUnique({
      where: { ownerEmail: basicInfo.adminEmailAddress },
    });
    if (existingTenant) {
      return fail(res, 400, "An organization already exists for this email address.");
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const tenant = await rawDb.tenant.create({
      data: {
        name: basicInfo.clinicName,
        ownerName: basicInfo.adminFullName,
        ownerEmail: basicInfo.adminEmailAddress,
        ownerPhone: basicInfo.adminMobileNumber,
        logoUrl: basicInfo.clinicLogoPreview || null,
        status: "trial",
        trialEndsAt,
      },
    });

    // ─── 2. Create Organization (linked to tenant) ───────────────
    const clinicId = `CLINIC-${nanoId(8).toUpperCase()}`;
    const baseSubdomain = basicInfo.clinicName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    let subdomain = baseSubdomain || `clinic-${nanoId(4)}`;

    // Ensure subdomain is unique
    let subdomainExists = await rawDb.organization.findUnique({
      where: { subdomain },
    });
    let counter = 1;
    while (subdomainExists) {
      subdomain = `${baseSubdomain}-${counter}`;
      subdomainExists = await rawDb.organization.findUnique({
        where: { subdomain },
      });
      counter++;
    }

    const organization = await rawDb.organization.create({
      data: {
        name: basicInfo.clinicName,
        clinicType: basicInfo.clinicType,
        tenantId: tenant.id,
        registrationNo: basicInfo.registrationNumber || null,
        panVatNo: basicInfo.panVatNumber || null,
        country: basicInfo.country || null,
        stateProvince: basicInfo.stateProvince || null,
        city: basicInfo.city || null,
        fullAddress: basicInfo.fullAddress || null,
        googleMapUrl: basicInfo.googleMapLocation || null,
        logoUrl: basicInfo.clinicLogoPreview || null,
        clinicId,
        subdomain,
      },
    });

    // ─── 3. Create Default Branch (linked to tenant) ─────────────
    const branch = await rawDb.branch.create({
      data: {
        name: "Main Branch",
        code: `MAIN-${makeId(6).toUpperCase()}`,
        clinicType: basicInfo.clinicType,
        tenantId: tenant.id,
        phone: basicInfo.adminMobileNumber,
        email: basicInfo.adminEmailAddress,
        country: basicInfo.country || "Nepal",
      },
    });

    // ─── 4. Create Admin Role (if not exists) ────────────────────
    let superAdminRole = await rawDb.role.findUnique({
      where: { name: "Super Admin" },
    });
    if (!superAdminRole) {
      superAdminRole = await rawDb.role.create({
        data: {
          name: "Super Admin",
          description: "Full access to all modules and settings",
        },
      });
    }

    // ─── 5. Create Admin User (linked to branch) ─────────────────
    const hashedPassword = await hashPassword(basicInfo.adminPassword);
    const adminUser = await rawDb.user.create({
      data: {
        name: basicInfo.adminFullName,
        email: basicInfo.adminEmailAddress,
        password: hashedPassword,
        phone: basicInfo.adminMobileNumber,
        roleId: superAdminRole.id,
        branchId: branch.id,
        status: "active",
        lastLogin: new Date(),
      },
    });

    // ─── 6. Link Organization to Admin User ──────────────────────
    await rawDb.organization.update({
      where: { id: organization.id },
      data: { adminUserId: adminUser.id },
    });

    // ─── 7. Create Organization Modules ──────────────────────────
    if (selectedModules && selectedModules.length > 0) {
      await rawDb.organizationModule.createMany({
        data: selectedModules.map((modKey: string) => {
          const mod = MODULES.find((m) => m.key === modKey);
          return {
            organizationId: organization.id,
            moduleKey: modKey,
            moduleName: mod?.name || modKey,
            category: mod?.category || "core",
            enabled: true,
          };
        }),
      });
    }

    // ─── 8. Create Subscription ──────────────────────────────────
    let planName = "free_trial";
    let planLabel = "Free Trial";
    let price = 0;
    let billingCycle = "one-time";

    if (!skipPackage && selectedPlan) {
      planName = selectedPlan.id || "free_trial";
      planLabel = selectedPlan.label || "Free Trial";
      price = selectedPlan.price || 0;
      billingCycle = selectedPlan.billingCycle || "monthly";
    }

    const subscription = await rawDb.subscription.create({
      data: {
        organizationId: organization.id,
        planName,
        planLabel,
        price,
        currency: "NPR",
        billingCycle,
        trialEndsAt: skipPackage || planName === "free_trial" ? trialEndsAt : null,
        status: skipPackage || planName === "free_trial" ? "trial" : "active",
        couponCode: body.packageSelection?.couponCode || null,
        referralCode: body.packageSelection?.referralCode || null,
        paymentMethod: body.packageSelection?.paymentMethod || null,
        maxUsers: planName === "starter" ? 5 : planName === "professional" ? 9999 : null,
      },
    });

    // ─── 9. Create Default Organization Settings ─────────────────
    const defaultSettings = [
      { key: "timezone", value: "Asia/Kathmandu", category: "general" },
      { key: "currency", value: "NPR", category: "general" },
      { key: "date_format", value: "DD/MM/YYYY", category: "general" },
      { key: "language", value: "en", category: "general" },
      { key: "sms_enabled", value: "true", category: "notifications" },
      { key: "whatsapp_enabled", value: "true", category: "notifications" },
      { key: "email_notifications", value: "true", category: "notifications" },
    ];

    await rawDb.organizationSetting.createMany({
      data: defaultSettings.map((s) => ({
        organizationId: organization.id,
        ...s,
      })),
    });

    // ─── 10. Create Audit Log ────────────────────────────────────
    await rawDb.auditLog.create({
      data: {
        user: basicInfo.adminEmailAddress,
        action: "ONBOARDING_COMPLETE",
        module: "Organization",
        detail: `Created tenant: ${basicInfo.clinicName} (${tenant.id}) with ${selectedModules?.length || 0} modules and ${planLabel} plan`,
        ip: (req.headers["x-forwarded-for"] as string) || "127.0.0.1",
      },
    });

    // ─── Return success ──────────────────────────────────────────
    return res.status(201).json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        clinicId: organization.clinicId,
        subdomain: organization.subdomain,
        clinicUrl: `${organization.subdomain}.carelim.com`,
      },
      branch: {
        id: branch.id,
        name: branch.name,
        code: branch.code,
      },
      adminUser: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: superAdminRole.name,
      },
      subscription: {
        id: subscription.id,
        planName: subscription.planName,
        planLabel: subscription.planLabel,
        trialEndsAt: subscription.trialEndsAt,
        status: subscription.status,
      },
      selectedModules: selectedModules || [],
      moduleCount: selectedModules?.length || 0,
    });
  } catch (error: any) {
    console.error("Onboarding error:", error);
    if (error?.code === "P2002") {
      const target = error?.meta?.target?.join(", ") || "unique field";
      return fail(res, 409, `A record with the same ${target} already exists.`);
    }
    return fail(res, 500, "Failed to complete onboarding. Please try again.");
  }
}

// GET /api/onboarding — Get onboarding session data (for auto-save restore)
async function onboardingGet(req: Request, res: Response) {
  try {
    const sessionId = req.query.sessionId as string | undefined;

    if (!sessionId) {
      return fail(res, 400, "Session ID is required");
    }

    const session = await rawDb.onboardingSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      return fail(res, 404, "Session not found");
    }

    return res.json({
      sessionId: session.sessionId,
      organizationData: session.organizationData,
      selectedModules: session.selectedModules,
      selectedPlan: session.selectedPlan,
      currentStep: session.currentStep,
      completedSteps: session.completedSteps,
    });
  } catch (error) {
    console.error("Get onboarding session error:", error);
    return fail(res, 500, "Failed to retrieve session");
  }
}

// PUT /api/onboarding — Auto-save onboarding progress
async function onboardingPut(req: Request, res: Response) {
  try {
    const body = (req.body || {}) as any;
    const { sessionId, organizationData, selectedModules, selectedPlan, currentStep, completedSteps } = body;

    if (!sessionId) {
      return fail(res, 400, "Session ID is required");
    }

    const session = await rawDb.onboardingSession.upsert({
      where: { sessionId },
      update: {
        organizationData: organizationData || undefined,
        selectedModules: selectedModules || undefined,
        selectedPlan: selectedPlan || undefined,
        currentStep: currentStep || 1,
        completedSteps: completedSteps || undefined,
        updatedAt: new Date(),
      },
      create: {
        sessionId,
        organizationData: organizationData || undefined,
        selectedModules: selectedModules || undefined,
        selectedPlan: selectedPlan || undefined,
        currentStep: currentStep || 1,
        completedSteps: completedSteps || undefined,
      },
    });

    return res.json({
      success: true,
      sessionId: session.sessionId,
      updatedAt: session.updatedAt,
    });
  } catch (error) {
    console.error("Auto-save error:", error);
    return fail(res, 500, "Failed to save progress");
  }
}

export function onboardingHandler() {
  return wrap(onboardingPost);
}

// Wrapped handlers for GET/PUT (mount with app.get/app.put in server.ts)
export function onboardingGetHandler() {
  return wrap(onboardingGet);
}

export function onboardingPutHandler() {
  return wrap(onboardingPut);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. public/booking & public/patient-lookup (PUBLIC, rawDb)
// ═══════════════════════════════════════════════════════════════════════════

interface LinkContext {
  tenantId: string | null;
  branchId: string | null;
  doctorId: string | null;
}

/** Resolve tenant, branch, and doctor from a booking link slug */
async function resolveContext(slug: string | null): Promise<LinkContext> {
  const result: LinkContext = { tenantId: null, branchId: null, doctorId: null };
  if (!slug) return result;
  try {
    const link = await rawDb.bookingLink.findUnique({
      where: { slug },
      select: {
        tenantId: true,
        branchId: true,
        doctorId: true,
        config: { select: { tenantId: true } },
      },
    });
    if (link) {
      result.tenantId = link.tenantId || link.config?.tenantId || null;
      result.branchId = link.branchId || null;
      result.doctorId = link.doctorId || null;
    }
  } catch {
    // BookingLink table might not exist yet
  }
  return result;
}

async function publicBookingGet(req: Request, res: Response) {
  const action = (req.query.action as string) || "departments";
  const slug = (req.query.slug as string) || null;

  // Resolve context from slug, allow query param overrides
  const linkCtx = await resolveContext(slug);
  const branchId = (req.query.branch as string) || linkCtx.branchId;
  const preselectedDoctorId = (req.query.doctor as string) || linkCtx.doctorId;
  const tenantId = linkCtx.tenantId;

  try {
    if (action === "departments") {
      const where: any = { isActive: true };
      if (tenantId) where.tenantId = tenantId;
      if (branchId) where.branchId = branchId;

      const departments = await rawDb.department.findMany({
        where,
        orderBy: { name: "asc" },
        include: { _count: { select: { doctors: { where: { status: "active" } } } } },
      });
      return res.json(
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
      const departmentId = req.query.departmentId as string | undefined;
      const where: any = { status: "active" };
      if (tenantId) where.tenantId = tenantId;
      if (branchId) where.branchId = branchId;
      if (departmentId) where.departmentId = departmentId;

      const doctors = await rawDb.doctor.findMany({
        where,
        orderBy: { name: "asc" },
        include: { department: true },
      });
      return res.json(
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
      const doctorId = (req.query.doctorId as string) || preselectedDoctorId;
      const dateStr = req.query.date as string | undefined;
      if (!doctorId || !dateStr) {
        return fail(res, 400, "doctorId and date are required");
      }

      const date = new Date(dateStr);
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayName = dayNames[date.getDay()];

      const doctor = await rawDb.doctor.findUnique({ where: { id: doctorId } });
      if (!doctor) {
        return fail(res, 404, "Doctor not found");
      }

      // Check if doctor works on this day
      const workingDays = doctor.workingDays.split(",").map((d) => d.trim());
      if (!workingDays.includes(dayName)) {
        return res.json({ slots: [], message: "Doctor is not available on this day" });
      }

      // Get schedule slots for this day
      const scheduleSlots = await rawDb.doctorScheduleSlot.findMany({
        where: { doctorId, dayName, status: { not: "blocked" } },
      });

      // Count existing appointments for this date+doctor
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      const bookedAppointments = await rawDb.appointment.findMany({
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

      return res.json({ slots: slotsWithAvailability, dayName });
    }

    // Default: return context info for the booking page
    if (slug) {
      // Return link context so the booking page knows what to pre-select
      let preselectedDoctor = null;
      if (preselectedDoctorId) {
        try {
          preselectedDoctor = await rawDb.doctor.findUnique({
            where: { id: preselectedDoctorId },
            select: { id: true, name: true, specialization: true, consultationFee: true, departmentId: true },
          });
        } catch {
          // Doctor might not exist
        }
      }
      return res.json({
        tenantId,
        branchId,
        preselectedDoctor,
      });
    }

    return fail(res, 400, "Unknown action");
  } catch (error) {
    console.error("Public booking API error:", error);
    return fail(res, 500, "Internal server error");
  }
}

async function publicBookingPost(req: Request, res: Response) {
  try {
    const body = (req.body || {}) as any;
    const { doctorId, departmentId, date, time, patientName, patientPhone, patientEmail, patientAge, patientGender, reason, linkSlug } = body;

    if (!doctorId || !date || !time || !patientName || !patientPhone) {
      return fail(res, 400, "doctorId, date, time, patientName, and patientPhone are required");
    }

    // Resolve tenant/branch from link slug
    const linkCtx = await resolveContext(linkSlug || null);
    const tenantId = linkCtx.tenantId;

    // Find or create patient (scope by phone + tenant)
    const patientWhere: any = { phone: patientPhone };
    if (tenantId) patientWhere.tenantId = tenantId;

    let patient = await rawDb.patient.findFirst({ where: patientWhere }) as any;
    if (!patient) {
      const patientData: any = {
        name: patientName,
        phone: patientPhone,
        email: patientEmail || undefined,
        age: patientAge ? parseInt(patientAge) : 0,
        gender: patientGender || "male",
      };
      if (tenantId) patientData.tenantId = tenantId;

      patient = await createPatientWithSerialCode(rawDb, patientData);
    }

    // Count existing appointments for token number
    const appointmentDate = new Date(date);
    const dayStart = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
    const dayEnd = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate() + 1);
    const count = await rawDb.appointment.count({
      where: { date: { gte: dayStart, lt: dayEnd } },
    });

    // Get doctor fee and branchId
    const doctor = await rawDb.doctor.findUnique({ where: { id: doctorId } });

    const appointmentData: any = {
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
    };
    // Use link branch if available, otherwise doctor's branch
    if (linkCtx.branchId) {
      appointmentData.branchId = linkCtx.branchId;
    } else if (doctor?.branchId) {
      appointmentData.branchId = doctor.branchId;
    }

    const appointment = await rawDb.appointment.create({
      data: appointmentData,
      include: { patient: true, doctor: { include: { department: true } } },
    });

    // Create audit log
    try {
      await rawDb.auditLog.create({
        data: {
          user: "public@booking",
          action: "CREATE",
          module: "Appointment",
          detail: `Public booking by ${patientName} with Dr. ${doctor?.name || "Unknown"} at ${time}`,
        },
      });
    } catch {
      // AuditLog might fail; don't block the booking
    }

    return res.status(201).json({
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
    });
  } catch (error) {
    console.error("Public booking POST error:", error);
    return fail(res, 500, "Failed to book appointment");
  }
}

// Public endpoint: look up a patient by phone number for the booking flow.
async function patientLookup(req: Request, res: Response) {
  try {
    const phone = req.query.phone as string | undefined;
    const tenantId = req.query.tenant as string | undefined;
    if (!phone || phone.length < 5 || !tenantId) {
      return res.json({ found: false });
    }

    // Exact phone match, scoped to the tenant whose booking page is in use
    const patient = await rawDb.patient.findFirst({
      where: { phone, tenantId },
      select: { name: true, email: true, phone: true },
    });

    if (!patient) {
      return res.json({ found: false });
    }

    return res.json({ found: true, patient });
  } catch (error) {
    console.error("Patient lookup error:", error);
    return res.json({ found: false });
  }
}

export function publicBookingRouter(): Router {
  const r = Router();
  r.get("/booking", wrap(publicBookingGet));
  r.post("/booking", wrap(publicBookingPost));
  r.get("/patient-lookup", wrap(patientLookup));
  return r;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. public-booking (PUBLIC, rawDb — config + booking submissions)
// ═══════════════════════════════════════════════════════════════════════════

/** Resolve tenantId from a booking link slug */
async function resolveTenantFromSlug(slug: string | null): Promise<string | null> {
  if (!slug) return null;
  try {
    const link = await rawDb.bookingLink.findUnique({
      where: { slug },
      select: { tenantId: true, config: { select: { tenantId: true } } },
    });
    if (link?.tenantId) return link.tenantId;
    if (link?.config?.tenantId) return link.config.tenantId;
  } catch {
    // BookingLink table might not exist
  }
  return null;
}

async function publicBookingAltGet(req: Request, res: Response) {
  try {
    const tenantId = (req.query.tenantId as string) || getAuthTenantId(req);
    const slug = (req.query.slug as string) || null;

    // Try resolving tenant from slug if no tenantId provided
    const effectiveTenantId = tenantId || (await resolveTenantFromSlug(slug));

    let config = null;
    try {
      config = effectiveTenantId
        ? await rawDb.bookingConfig.findUnique({ where: { tenantId: effectiveTenantId } })
        : await rawDb.bookingConfig.findFirst({ where: { tenantId: null } });
    } catch {
      // Config lookup might fail if table has issues
    }

    const showDoctors = config ? config.showDoctors : true;
    const showDepartments = config ? config.showDepartments : true;

    // Build where clauses scoped to tenant
    const doctorWhere: any = { status: "active" };
    const departmentWhere: any = {};

    // If we have a tenant, scope queries
    if (effectiveTenantId) {
      doctorWhere.tenantId = effectiveTenantId;
      departmentWhere.tenantId = effectiveTenantId;
    }

    // Fetch doctors and departments for the booking form
    const [doctors, departments] = await Promise.all([
      showDoctors
        ? rawDb.doctor.findMany({
            where: doctorWhere,
            select: { id: true, name: true, specialization: true, consultationFee: true, workingDays: true, startTime: true, endTime: true },
            orderBy: { name: "asc" },
          })
        : [],
      showDepartments
        ? rawDb.department.findMany({
            where: departmentWhere,
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : [],
    ]);

    return res.json({
      id: config?.id || null,
      tenantId: config?.tenantId || effectiveTenantId || null,
      enabled: config?.enabled ?? true,
      requireLogin: config?.requireLogin ?? false,
      showDepartments,
      showDoctors,
      allowedTimeSlots: config?.allowedTimeSlots || "30",
      doctors,
      departments,
    });
  } catch (error) {
    console.error("Failed to fetch booking config:", error);
    return fail(res, 500, "Failed to fetch config");
  }
}

async function publicBookingAltPost(req: Request, res: Response) {
  try {
    const body = (req.body || {}) as any;

    // Booking submission (has patientName)
    if (body.patientName) {
      const tenantId = getAuthTenantId(req) || (await resolveTenantFromSlug(body.linkSlug || null));

      const doctor = body.doctorId
        ? await rawDb.doctor.findUnique({ where: { id: body.doctorId }, select: { name: true } })
        : null;
      const department = body.departmentId
        ? await rawDb.department.findUnique({ where: { id: body.departmentId }, select: { name: true } })
        : null;

      // Store the time as-is (keep original format from frontend)
      const timeStr = body.time || "";

      // Create PublicBooking - handle missing tenantId column on production
      const bookingData: any = {
        patientName: body.patientName,
        phone: body.patientPhone || "",
        email: body.patientEmail || null,
        doctorName: doctor?.name || body.doctorName || "Any",
        department: department?.name || body.department || null,
        date: body.date ? parseLocalDate(body.date) : new Date(),
        time: timeStr,
        status: "pending",
        notes: body.reason || null,
      };

      // Try setting tenantId; if column doesn't exist on production, skip it
      if (tenantId) {
        try {
          bookingData.tenantId = tenantId;
          const booking = await rawDb.publicBooking.create({ data: bookingData });
          return res.status(201).json(booking);
        } catch (createError: any) {
          if (createError?.message?.includes("tenantId")) {
            delete bookingData.tenantId;
            const booking = await rawDb.publicBooking.create({ data: bookingData });
            return res.status(201).json(booking);
          }
          throw createError;
        }
      } else {
        const booking = await rawDb.publicBooking.create({ data: bookingData });
        return res.status(201).json(booking);
      }
    }

    // Config save — requires authentication (booking submissions above are public)
    const configTenantId = getAuthTenantId(req);
    if (!configTenantId) {
      return fail(res, 401, "Authentication required");
    }

    let existing = null;
    try {
      existing = configTenantId
        ? await rawDb.bookingConfig.findUnique({ where: { tenantId: configTenantId } })
        : await rawDb.bookingConfig.findFirst({ where: { tenantId: null } });
    } catch {
      // Config lookup might fail
    }

    if (existing) {
      const updated = await rawDb.bookingConfig.update({
        where: { id: existing.id },
        data: {
          enabled: body.enabled ?? existing.enabled,
          requireLogin: body.requireLogin ?? existing.requireLogin,
          showDepartments: body.showDepartments ?? existing.showDepartments,
          showDoctors: body.showDoctors ?? existing.showDoctors,
          allowedTimeSlots: body.allowedTimeSlots ?? existing.allowedTimeSlots,
        },
      });
      return res.json(updated);
    }

    const config = await rawDb.bookingConfig.create({
      data: {
        tenantId: configTenantId,
        enabled: body.enabled ?? true,
        requireLogin: body.requireLogin ?? false,
        showDepartments: body.showDepartments ?? true,
        showDoctors: body.showDoctors ?? true,
        allowedTimeSlots: body.allowedTimeSlots ?? "30",
      },
    });
    return res.status(201).json(config);
  } catch (error) {
    console.error("Failed to process request:", error);
    return fail(res, 500, "Failed to process request");
  }
}

async function publicBookingAltPut(req: Request, res: Response) {
  try {
    const body = (req.body || {}) as any;
    const configTenantId = getAuthTenantId(req);
    if (!configTenantId) {
      return fail(res, 401, "Authentication required");
    }

    let existing = null;
    try {
      existing = configTenantId
        ? await rawDb.bookingConfig.findUnique({ where: { tenantId: configTenantId } })
        : await rawDb.bookingConfig.findFirst({ where: { tenantId: null } });
    } catch {
      // Config lookup might fail
    }

    const allowed = {
      enabled: body.enabled,
      requireLogin: body.requireLogin,
      showDepartments: body.showDepartments,
      showDoctors: body.showDoctors,
      allowedTimeSlots: body.allowedTimeSlots,
    };

    if (existing) {
      const updated = await rawDb.bookingConfig.update({
        where: { id: existing.id },
        data: {
          enabled: allowed.enabled ?? existing.enabled,
          requireLogin: allowed.requireLogin ?? existing.requireLogin,
          showDepartments: allowed.showDepartments ?? existing.showDepartments,
          showDoctors: allowed.showDoctors ?? existing.showDoctors,
          allowedTimeSlots: allowed.allowedTimeSlots ?? existing.allowedTimeSlots,
        },
      });
      return res.json(updated);
    }

    const config = await rawDb.bookingConfig.create({
      data: {
        tenantId: configTenantId,
        enabled: allowed.enabled ?? true,
        requireLogin: allowed.requireLogin ?? false,
        showDepartments: allowed.showDepartments ?? true,
        showDoctors: allowed.showDoctors ?? true,
        allowedTimeSlots: allowed.allowedTimeSlots ?? "30",
      },
    });
    return res.json(config);
  } catch (error) {
    console.error("Failed to update booking config:", error);
    return fail(res, 500, "Failed to update config");
  }
}

export function publicBookingAltRouter(): Router {
  const r = Router();
  r.get("/", wrap(publicBookingAltGet));
  r.post("/", wrap(publicBookingAltPost));
  r.put("/", wrap(publicBookingAltPut));
  return r;
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. public-bookings (+ /links, /links/:id) (PUBLIC, rawDb)
// ═══════════════════════════════════════════════════════════════════════════

async function listPublicBookings(req: Request, res: Response) {
  try {
    const tenantId = getAuthTenantId(req);

    // Try with tenantId filter first; fall back if column missing on production
    try {
      const where = tenantId ? { tenantId } : {};
      const bookings = await rawDb.publicBooking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return res.json(bookings);
    } catch (innerError: any) {
      // If tenantId column doesn't exist on production DB, query without it
      if (innerError?.message?.includes("tenantId")) {
        const bookings = await rawDb.publicBooking.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
        });
        return res.json(bookings);
      }
      throw innerError;
    }
  } catch (error) {
    console.error("Failed to fetch public bookings:", error);
    return fail(res, 500, "Failed to fetch bookings");
  }
}

interface LinkData {
  tenantId: string | null;
  branchId?: string | null;
  configId?: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  department?: string | null;
  label?: string | null;
  url: string;
  slug: string;
}

/** Try creating with all fields first; fall back if new columns are missing */
async function createBookingLink(data: LinkData) {
  try {
    return await rawDb.bookingLink.create({
      data: {
        tenantId: data.tenantId,
        branchId: data.branchId || null,
        configId: data.configId,
        doctorId: data.doctorId || null,
        doctorName: data.doctorName || null,
        department: data.department || null,
        label: data.label || null,
        url: data.url,
        slug: data.slug,
        active: true,
      },
    });
  } catch (fullErr: any) {
    // If it fails due to missing columns, try with only original fields
    if (fullErr?.message?.includes("branchId") || fullErr?.message?.includes("doctorId") || fullErr?.message?.includes("label")) {
      console.warn("Falling back to basic BookingLink fields:", fullErr.message);
      return await rawDb.bookingLink.create({
        data: {
          tenantId: data.tenantId,
          configId: data.configId,
          doctorName: data.doctorName || null,
          department: data.department || null,
          url: data.url,
          slug: data.slug,
          active: true,
        },
      });
    }
    throw fullErr;
  }
}

async function listBookingLinks(req: Request, res: Response) {
  try {
    const tenantId = getAuthTenantId(req);
    const where = tenantId ? { tenantId } : {};

    // Try with includes first; fall back if new columns missing on production
    try {
      const links = await rawDb.bookingLink.findMany({
        where,
        include: { branch: { select: { id: true, name: true } }, doctor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      });
      return res.json(links);
    } catch (includeErr) {
      console.warn("BookingLink include failed, falling back:", includeErr);
      const links = await rawDb.bookingLink.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      return res.json(links);
    }
  } catch (error) {
    console.error("Failed to fetch booking links:", error);
    return fail(res, 500, "Failed to fetch links");
  }
}

async function createBookingLinks(req: Request, res: Response) {
  try {
    const body = (req.body || {}) as any;
    const tenantId = getAuthTenantId(req);
    const origin = (req.headers["origin"] as string) || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Verify tenant exists if provided
    let validTenantId: string | null = null;
    if (tenantId) {
      try {
        const tenant = await rawDb.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
        if (tenant) validTenantId = tenant.id;
      } catch {
        // Tenant lookup might fail
      }
    }

    // If no tenantId from auth, try to get the first available tenant
    if (!validTenantId) {
      try {
        const anyTenant = await rawDb.tenant.findFirst({ select: { id: true } });
        if (anyTenant) validTenantId = anyTenant.id;
      } catch {
        // Continue without tenant
      }
    }

    // Get or create config (only if tenant exists) — wrapped in try/catch
    let configId: string | null = null;
    if (validTenantId) {
      try {
        let config = await rawDb.bookingConfig.findUnique({ where: { tenantId: validTenantId } });
        if (!config) {
          config = await rawDb.bookingConfig.create({ data: { tenantId: validTenantId } });
        }
        configId = config.id;
      } catch (configErr) {
        console.warn("BookingConfig lookup/create failed:", configErr);
        // Continue without configId — it's optional
      }
    }

    // Generate links for all branches
    if (body.generateAllBranches) {
      const where: any = {};
      if (validTenantId) where.tenantId = validTenantId;

      const branches = await rawDb.branch.findMany({ where, select: { id: true, name: true } });
      if (branches.length === 0) {
        return fail(res, 400, "No branches found");
      }

      // Get doctor info if doctorId provided
      let doctorInfo: { id: string; name: string; specialization: string } | null = null;
      if (body.doctorId) {
        try {
          doctorInfo = await rawDb.doctor.findUnique({
            where: { id: body.doctorId },
            select: { id: true, name: true, specialization: true },
          });
        } catch {
          // Doctor lookup might fail
        }
      }

      const createdLinks = [];
      const errors: string[] = [];

      for (const branch of branches) {
        const slug = generateSlug(branch.name, doctorInfo?.name, body.department);
        const url = `${origin}/book/${slug}?branch=${branch.id}${body.doctorId ? `&doctor=${body.doctorId}` : ""}`;

        try {
          const link = await createBookingLink({
            tenantId: validTenantId,
            branchId: branch.id,
            configId,
            doctorId: body.doctorId || null,
            doctorName: doctorInfo?.name || body.doctorName || null,
            department: body.department || doctorInfo?.specialization || null,
            label: body.label || `${branch.name}${doctorInfo ? ` - ${doctorInfo.name}` : ""}${body.department ? ` (${body.department})` : ""}`,
            url,
            slug,
          });
          createdLinks.push(link);
        } catch (err: any) {
          errors.push(`Failed for branch ${branch.name}: ${err.message}`);
        }
      }

      if (createdLinks.length === 0 && errors.length > 0) {
        return res.status(500).json({ error: "Failed to create links", details: errors });
      }

      return res.status(201).json(createdLinks);
    }

    // Single link creation
    const slug = generateSlug(body.doctorName, body.department, body.label);
    const branchParam = body.branchId ? `?branch=${body.branchId}` : "";
    const doctorParam = body.doctorId ? `${branchParam ? "&" : "?"}doctor=${body.doctorId}` : "";
    const url = `${origin}/book/${slug}${branchParam}${doctorParam}`;

    // Resolve doctor name if doctorId provided but no doctorName
    let doctorName = body.doctorName || null;
    let department = body.department || null;
    if (body.doctorId && !doctorName) {
      try {
        const doc = await rawDb.doctor.findUnique({
          where: { id: body.doctorId },
          select: { name: true, specialization: true },
        });
        doctorName = doc?.name || null;
        department = department || doc?.specialization || null;
      } catch {
        // Doctor lookup might fail
      }
    }

    try {
      const link = await createBookingLink({
        tenantId: validTenantId,
        branchId: body.branchId || null,
        configId,
        doctorId: body.doctorId || null,
        doctorName,
        department,
        label: body.label || null,
        url,
        slug,
      });
      return res.status(201).json(link);
    } catch (err: any) {
      console.error("Failed to create single booking link:", err);
      return fail(res, 500, `Failed to create link: ${err.message}`);
    }
  } catch (error) {
    console.error("Failed to create booking link:", error);
    return fail(res, 500, "Failed to create link");
  }
}

// PATCH /links/:id — toggle link active status
async function patchBookingLink(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const body = (req.body || {}) as any;
    const tenantId = getAuthTenantId(req);

    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const link = await rawDb.bookingLink.findFirst({ where });
    if (!link) {
      return fail(res, 404, "Link not found");
    }

    const updated = await rawDb.bookingLink.update({
      where: { id },
      data: { active: body.active ?? !link.active },
    });
    return res.json(updated);
  } catch (error) {
    console.error("Failed to update link:", error);
    return fail(res, 500, "Failed to update link");
  }
}

// DELETE /links/:id — delete a booking link
async function deleteBookingLink(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const tenantId = getAuthTenantId(req);

    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const link = await rawDb.bookingLink.findFirst({ where });
    if (!link) {
      return fail(res, 404, "Link not found");
    }

    await rawDb.bookingLink.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete link:", error);
    return fail(res, 500, "Failed to delete link");
  }
}

export function publicBookingsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listPublicBookings));
  r.get("/links", wrap(listBookingLinks));
  r.post("/links", wrap(createBookingLinks));
  r.patch("/links/:id", wrap(patchBookingLink));
  r.delete("/links/:id", wrap(deleteBookingLink));
  return r;
}