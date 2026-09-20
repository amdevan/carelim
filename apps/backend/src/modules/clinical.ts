/**
 * Clinical module — port of frontend /api/{patients, appointments, prescriptions,
 * prescription-print, clinical-notes, insurance-claims, doctor-commissions,
 * doctor-schedule} and /api/doctors/[id]/workspace.
 * Tenant isolation enforced by lib/prisma.ts (patient, doctor, appointment,
 * prescription, invoice, clinicalNote, insuranceClaim, doctorCommission are
 * all tenant/branch scoped there).
 */
import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { db } from "../lib/prisma";
import { fail, wrap } from "../lib/http";
import { requirePermission } from "../middleware/permissions";
import { getCurrentUserEmail } from "../lib/tenant-context";
import type {
  Prescription, Patient, Doctor, Department, PrescriptionItem, Invoice, InvoiceItem,
} from "@prisma/client";

// ─── Inlined frontend helpers ────────────────────────────────────

// nanoid replacement — same URL-safe alphabet, uniform random sampling
const NANO_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
function nanoId(len: number): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += NANO_ALPHABET[bytes[i] % 64];
  return out;
}

// Frontend getAuthEmail(req) equivalent (authed email or fixed fallback)
function authEmail(): string {
  return getCurrentUserEmail() || "system@carelim.health";
}

// ─── Patients ────────────────────────────────────────────────────

async function listPatients(req: Request, res: Response) {
  try {
    const q = (req.query.q as string) || "";
    const limit = Number((req.query.limit as string) || 0);
    const branchId = req.query.branchId as string | undefined;
    const where: Record<string, unknown> = {};
    if (branchId) where.branchId = branchId;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { patientCode: { contains: q } },
        { phone: { contains: q } },
      ];
    }
    const patients = await db.patient.findMany({
      where,
      orderBy: { registeredAt: "desc" },
      ...(limit ? { take: limit } : {}),
    });

    // Attach source info for each patient
    const patientIds = patients.map((p) => p.id);
    const sources = await db.patientSource.findMany({
      where: { patientId: { in: patientIds } },
      select: { patientId: true, sourceType: true, sourceName: true },
    });
    const sourceMap = new Map(sources.map((s) => [s.patientId, s]));
    const patientsWithSource = patients.map((p) => ({
      ...p,
      source: sourceMap.get(p.id) || null,
    }));

    res.json(patientsWithSource);
  } catch (error) {
    console.error("Error fetching patients:", error);
    fail(res, 500, "Failed to fetch patients");
  }
}

async function createPatient(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const count = await db.patient.count();
    // Only pick fields that exist on the Patient model
    const { name, email, phone, gender, dob, age, bloodGroup, address, photo,
      bloodPressure, temperature, pulse, weight, height, bmi, allergies,
      chronicConditions, emergencyContact, emergencyName, insuranceProvider,
      insuranceNumber, status, branchId } = body;
    const patient = await db.patient.create({
      data: {
        name, email: email || null, phone, gender: gender || "male",
        dob: dob ? new Date(dob) : null, age: age || 0, bloodGroup: bloodGroup || null,
        address: address || null, photo: photo || null,
        bloodPressure: bloodPressure || null, temperature: temperature || null,
        pulse: pulse || null, weight: weight || null, height: height || null,
        bmi: bmi || null, allergies: allergies || null,
        chronicConditions: chronicConditions || null,
        emergencyContact: emergencyContact || null, emergencyName: emergencyName || null,
        insuranceProvider: insuranceProvider || null, insuranceNumber: insuranceNumber || null,
        status: status || "active",
        branchId: branchId || null,
        // Use nanoId for globally unique patientCode (since @unique is global across tenants)
        patientCode: body.patientCode || `PT-${nanoId(8).toUpperCase()}`,
        registeredAt: new Date(),
      },
    });
    await db.auditLog.create({ data: { user: authEmail(), action: "CREATE", module: "Patient", detail: `Registered patient ${patient.name}` } });
    res.status(201).json(patient);
  } catch (error) {
    console.error("Error creating patient:", error);
    fail(res, 500, "Failed to create patient");
  }
}

async function getPatient(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const patient = await db.patient.findUnique({
      where: { id },
      include: {
        appointments: { include: { doctor: true }, orderBy: { date: "desc" }, take: 20 },
        prescriptions: { include: { doctor: true, items: true }, orderBy: { createdAt: "desc" }, take: 10 },
        invoices: { orderBy: { date: "desc" }, take: 10 },
        labTests: { orderBy: { orderedAt: "desc" }, take: 10 },
      },
    });
    if (!patient) return fail(res, 404, "Not found");
    res.json(patient);
  } catch (error) {
    console.error("Error fetching patient:", error);
    fail(res, 500, "Failed to fetch patient");
  }
}

const ALLOWED_PATIENT_FIELDS = new Set([
  "name", "email", "phone", "gender", "dob", "age", "bloodGroup", "address", "photo",
  "bloodPressure", "temperature", "pulse", "weight", "height", "bmi",
  "allergies", "chronicConditions", "emergencyContact", "emergencyName",
  "insuranceProvider", "insuranceNumber", "status",
]);

async function updatePatient(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const body = req.body || {};
    const filteredData = Object.keys(body).reduce((acc, key) => {
      if (ALLOWED_PATIENT_FIELDS.has(key)) {
        (acc as Record<string, unknown>)[key] = body[key];
      }
      return acc;
    }, {} as Record<string, unknown>);
    const patient = await db.patient.update({ where: { id }, data: filteredData as never });
    await db.auditLog.create({ data: { user: authEmail(), action: "UPDATE", module: "Patient", detail: `Updated patient ${patient.name}` } });
    res.json(patient);
  } catch (error) {
    console.error("Error updating patient:", error);
    fail(res, 500, "Failed to update patient");
  }
}

async function deletePatient(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    await db.patient.delete({ where: { id } });
    await db.auditLog.create({ data: { user: authEmail(), action: "DELETE", module: "Patient", detail: "Deleted patient" } });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting patient:", error);
    fail(res, 500, "Failed to delete patient");
  }
}

// ─── Appointments ────────────────────────────────────────────────

async function listAppointments(req: Request, res: Response) {
  try {
    const date = req.query.date as string | undefined;
    const doctorId = req.query.doctorId as string | undefined;
    const status = req.query.status as string | undefined;
    const branchId = req.query.branchId as string | undefined;
    const where: Record<string, unknown> = {};
    if (date) {
      const d = new Date(date);
      const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      where.date = { gte: ds, lt: de };
    }
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;
    if (branchId) where.branchId = branchId;
    const appointments = await db.appointment.findMany({
      where,
      include: { patient: true, doctor: { include: { department: true } } },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });
    res.json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    fail(res, 500, "Failed to fetch appointments");
  }
}

async function createAppointment(req: Request, res: Response) {
  try {
    const body = req.body || {};

    // Compute initial token number
    const d = new Date(body.date);
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    let tokenNo = await db.appointment.count({
      where: { date: { gte: ds, lt: de }, doctorId: body.doctorId }
    }) + 1;

    // Use retry to handle race conditions on token number
    let appt;
    try {
      appt = await db.appointment.create({
        data: {
          branchId: body.branchId || null,
          patientId: body.patientId,
          doctorId: body.doctorId,
          departmentId: body.departmentId || undefined,
          date: new Date(body.date),
          time: body.time,
          type: body.type || "walk-in",
          reason: body.reason || undefined,
          referralName: body.referralName || undefined,
          priority: body.priority || undefined,
          fee: body.fee || 0,
          status: body.status || "scheduled",
          tokenNo,
        },
        include: { patient: true, doctor: true },
      });
    } catch (err: any) {
      if (err?.code === "P2002") {
        // Token number collision — retry with incremented value
        tokenNo = await db.appointment.count({
          where: { date: { gte: ds, lt: de }, doctorId: body.doctorId }
        }) + 1;
        appt = await db.appointment.create({
          data: {
            branchId: body.branchId || null,
            patientId: body.patientId,
            doctorId: body.doctorId,
            departmentId: body.departmentId || undefined,
            date: new Date(body.date),
            time: body.time,
            type: body.type || "walk-in",
            reason: body.reason || undefined,
            referralName: body.referralName || undefined,
            priority: body.priority || undefined,
            fee: body.fee || 0,
            status: body.status || "scheduled",
            tokenNo,
          },
          include: { patient: true, doctor: true },
        });
      } else {
        throw err;
      }
    }

    await db.auditLog.create({ data: { user: authEmail(), action: "CREATE", module: "Appointment", detail: `Booked appointment for ${appt.patient?.name}` } });
    res.status(201).json(appt);
  } catch (error) {
    console.error("Error creating appointment:", error);
    fail(res, 500, "Failed to create appointment");
  }
}

async function getAppointment(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const appt = await db.appointment.findUnique({ where: { id }, include: { patient: true, doctor: true } });
    if (!appt) return fail(res, 404, "Not found");
    res.json(appt);
  } catch (error) {
    console.error("Error fetching appointment:", error);
    fail(res, 500, "Failed to fetch appointment");
  }
}

const APPT_UPDATABLE = new Set([
  "status", "time", "type", "reason", "priority", "notes", "fee", "patientId", "doctorId",
]);

async function updateAppointment(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const body = req.body || {};
    const data: Record<string, unknown> = {};
    for (const key of APPT_UPDATABLE) {
      if (key in body) data[key] = body[key];
    }
    if (Object.keys(data).length === 0) {
      return fail(res, 400, "No valid fields to update");
    }
    const appt = await db.appointment.update({ where: { id }, data: data as never });
    await db.auditLog.create({ data: { user: authEmail(), action: "UPDATE", module: "Appointment", detail: `Updated appointment status to ${data.status || ""}` } });
    res.json(appt);
  } catch (error) {
    console.error("Error updating appointment:", error);
    fail(res, 500, "Failed to update appointment");
  }
}

async function deleteAppointment(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    await db.appointment.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    fail(res, 500, "Failed to delete appointment");
  }
}

// ─── Prescriptions ───────────────────────────────────────────────

async function listPrescriptions(req: Request, res: Response) {
  try {
    const patientId = req.query.patientId as string | undefined;
    const branchId = req.query.branchId as string | undefined;
    const where: Record<string, unknown> = {};
    if (patientId) where.patientId = patientId;
    if (branchId) where.branchId = branchId;
    const prescriptions = await db.prescription.findMany({
      where,
      include: { patient: true, doctor: { include: { department: true } }, items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(prescriptions);
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    fail(res, 500, "Failed to fetch prescriptions");
  }
}

async function createPrescription(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const {
      items, patientId, doctorId, diagnosis, symptoms, vitals, advice, followUp,
      clinicalData, branchId,
    } = body;
    const count = await db.prescription.count();
    const prescription = await db.prescription.create({
      data: {
        code: `RX-${nanoId(8).toUpperCase()}`,
        branchId: branchId || null,
        patientId,
        doctorId,
        diagnosis: diagnosis || null,
        symptoms: symptoms || null,
        vitals: vitals || null,
        advice: advice || null,
        followUp: followUp || null,
        status: "active",
        clinicalData: clinicalData ? (typeof clinicalData === "string" ? clinicalData : JSON.stringify(clinicalData)) : null,
        items: {
          create: (items || []).map((it: {
            medicineName: string; dosage: string; frequency: string;
            duration: string; quantity: number; instructions?: string;
            generic?: string; strength?: string; route?: string; timing?: string; remarks?: string;
          }) => ({
            medicineName: it.medicineName,
            dosage: it.dosage,
            frequency: it.frequency,
            duration: it.duration,
            quantity: it.quantity || 1,
            instructions: it.instructions || null,
          })),
        },
      },
      include: { items: true, patient: true, doctor: true },
    });
    await db.auditLog.create({ data: { user: authEmail(), action: "CREATE", module: "Prescription", detail: `Created prescription ${prescription.code}` } });
    res.status(201).json(prescription);
  } catch (error) {
    console.error("Error creating prescription:", error);
    fail(res, 500, "Failed to create prescription");
  }
}

async function getPrescription(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const p = await db.prescription.findUnique({
      where: { id },
      include: { patient: true, doctor: { include: { department: true } }, items: true },
    });
    if (!p) return fail(res, 404, "Not found");
    res.json(p);
  } catch (error) {
    console.error("Error fetching prescription:", error);
    fail(res, 500, "Failed to fetch prescription");
  }
}

async function deletePrescription(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    await db.prescription.delete({ where: { id } });
    await db.auditLog.create({ data: { user: authEmail(), action: "DELETE", module: "Prescription", detail: "Deleted prescription" } });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting prescription:", error);
    fail(res, 500, "Failed to delete prescription");
  }
}

// ─── Prescription print ──────────────────────────────────────────

type RichPrescription = Prescription & {
  patient: Patient;
  doctor: Doctor & { department: Department | null };
  items: PrescriptionItem[];
};

// Returns a rich, print-ready prescription payload for a given prescription ID
// (or the latest prescription if no id is provided — useful for demo/preview)
async function printPrescription(req: Request, res: Response) {
  const id = req.query.id as string | undefined;

  let prescription: RichPrescription | null = null;
  if (id) {
    prescription = await db.prescription.findUnique({
      where: { id },
      include: { patient: true, doctor: { include: { department: true } }, items: true },
    }) as RichPrescription | null;
  }
  if (!prescription) {
    // fallback: latest prescription with full relations
    prescription = await db.prescription.findFirst({
      orderBy: { createdAt: "desc" },
      include: { patient: true, doctor: { include: { department: true } }, items: true },
    }) as RichPrescription | null;
  }

  if (!prescription) {
    return fail(res, 404, "No prescription found");
  }

  // Linked appointment (for visit details) — find most recent for this patient+doctor
  const appointment = await db.appointment.findFirst({
    where: { patientId: prescription.patientId, doctorId: prescription.doctorId },
    orderBy: { date: "desc" },
  });

  // Linked invoice for billing summary
  const invoice: (Invoice & { items: InvoiceItem[] }) | null = await db.invoice.findFirst({
    where: { patientId: prescription.patientId },
    orderBy: { date: "desc" },
    include: { items: true },
  });

  // Build the rich prescription payload
  const today = new Date();
  const tokens = ["Morning", "Afternoon", "Evening", "Night", "SOS", "HS", "STAT"];
  const timings = ["Before Meal", "After Meal", "Empty Stomach", "With Meal"];

  // Parse prescription items into the medication table format
  const medications = prescription.items.map((it, i) => {
    const parts = it.medicineName.split(/\s+/);
    const strengthMatch = it.medicineName.match(/(\d+\s?(?:mg|ml|mcg|g|IU|units?))/i);
    return {
      sn: i + 1,
      medicine: it.medicineName.replace(/\s*\d+\s?(?:mg|ml|mcg|g|IU|units?)\s*/i, " ").trim() || it.medicineName,
      generic: it.medicineName, // would link to Medicine.genericName in production
      strength: strengthMatch ? strengthMatch[1] : "—",
      dose: it.dosage || "1 Tablet",
      route: "Oral",
      frequency: it.frequency || "1-0-1",
      duration: it.duration || "5 days",
      timing: timings[i % timings.length],
      quantity: it.quantity || 1,
      remarks: it.instructions || "",
    };
  });

  // If no items, seed with a few demo medications for preview
  const demoMeds = medications.length > 0 ? medications : [
    { sn: 1, medicine: "Pantoprazole", generic: "Pantoprazole", strength: "40mg", dose: "1 Tablet", route: "Oral", frequency: "1-0-0", duration: "8 Weeks", timing: "Before Breakfast", quantity: 56, remarks: "Complete the course" },
    { sn: 2, medicine: "Amoxicillin", generic: "Amoxicillin", strength: "500mg", dose: "1 Capsule", route: "Oral", frequency: "1-0-1", duration: "7 Days", timing: "After Meal", quantity: 14, remarks: "" },
    { sn: 3, medicine: "Ibuprofen", generic: "Ibuprofen", strength: "400mg", dose: "1 Tablet", route: "Oral", frequency: "0-0-1", duration: "5 Days", timing: "After Meal", quantity: 5, remarks: "SOS pain" },
    { sn: 4, medicine: "ORS", generic: "Oral Rehydration Salts", strength: "5.5g", dose: "1 Sachet", route: "Oral", frequency: "SOS", duration: "3 Days", timing: "After Meal", quantity: 6, remarks: "Mix in 1L water" },
  ];

  // Parse rich clinicalData JSON (if saved by the enhanced prescription form)
  let cd: Record<string, unknown> = {};
  try {
    cd = prescription.clinicalData ? JSON.parse(prescription.clinicalData) : {};
  } catch { cd = {}; }

  // Fetch hospital info from settings
  const settingsKeys = [
    "clinic_name", "clinic_address", "clinic_phone", "clinic_email",
    "registration_number", "pan_number", "hospital_name", "hospital_address",
    "hospital_phone", "hospital_email", "hospital_registration", "hospital_pan",
  ];
  const settings = await db.setting.findMany({
    where: { key: { in: settingsKeys } },
  });
  const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

  const hospitalInfo = {
    name: settingsMap.hospital_name || settingsMap.clinic_name || "Carelim OS Health Center",
    tagline: "Multispecialty Hospital & Research Center",
    address: settingsMap.hospital_address || settingsMap.clinic_address || "Kathmandu, Nepal",
    phone: settingsMap.hospital_phone || settingsMap.clinic_phone || "",
    emergencyPhone: settingsMap.clinic_phone || "",
    email: settingsMap.hospital_email || settingsMap.clinic_email || "",
    website: "www.carelim.health",
    registrationNo: settingsMap.hospital_registration || settingsMap.registration_number || "",
    pan: settingsMap.hospital_pan || settingsMap.pan_number || "",
  };

  res.json({
    // Hospital / clinic info (from Settings)
    hospital: hospitalInfo,
    // Prescription metadata
    prescription: {
      id: prescription.id,
      no: prescription.code,
      visitId: appointment ? `VIS-${appointment.tokenNo?.toString().padStart(5, "0") || "00001"}` : `VIS-${Date.now().toString().slice(-5)}`,
      date: prescription.createdAt,
      tokenNo: appointment?.tokenNo || 1,
      queueNo: (appointment?.tokenNo || 1) + 100,
      appointmentSource: appointment?.type || "walk-in",
    },
    // Patient info
    patient: {
      id: prescription.patient.patientCode,
      uhid: `UHID-${prescription.patient.patientCode.replace(/\D/g, "").padStart(8, "0")}`,
      name: prescription.patient.name,
      age: prescription.patient.age,
      gender: prescription.patient.gender,
      dob: prescription.patient.dob,
      bloodGroup: prescription.patient.bloodGroup || "O+",
      phone: prescription.patient.phone,
      address: prescription.patient.address || "Kathmandu, Nepal",
      guardianName: prescription.patient.emergencyName || "—",
      nationality: "Nepali",
      occupation: "Service",
      insuranceProvider: prescription.patient.insuranceProvider || "—",
      insuranceNumber: prescription.patient.insuranceNumber || "—",
    },
    // Visit details
    visit: {
      date: appointment?.date || today,
      time: appointment?.time || "10:30",
      department: prescription.doctor.department?.name || "General Medicine",
      consultant: prescription.doctor.name,
      qualification: prescription.doctor.qualification,
      specialization: prescription.doctor.specialization,
      licenseNo: prescription.doctor.licenseNumber,
      followUp: prescription.followUp || "After 7 days",
      visitType: appointment?.type || "consultation",
    },
    // Vital signs
    vitals: {
      height: prescription.patient.height ? `${prescription.patient.height} cm` : "170 cm",
      weight: prescription.patient.weight ? `${prescription.patient.weight} kg` : "65 kg",
      bmi: prescription.patient.bmi ? prescription.patient.bmi.toFixed(1) : "22.5",
      temperature: prescription.patient.temperature ? `${prescription.patient.temperature} °F` : "98.6 °F",
      pulse: prescription.patient.pulse || "78 /min",
      respiration: "18 /min",
      bp: prescription.patient.bloodPressure || "120/80 mmHg",
      spo2: "98%",
      bloodSugar: "94 mg/dL",
      painScore: "2 / 10",
    },
    // Clinical sections — prefer clinicalData (from enhanced form), fall back to demo
    chiefComplaints: (cd.chiefComplaints as string[] | undefined) || (prescription.symptoms
      ? prescription.symptoms.split(/[,.]/).map(s => s.trim()).filter(Boolean).map(s => s.startsWith("•") ? s : `• ${s}`)
      : ["• Abdominal Pain", "• Vomiting", "• Fever (off and on, 3 days)", "• Constipation", "• Loss of Appetite"]),
    presentIllness: (cd.presentIllness as string | undefined) || "Patient complains of abdominal pain in the epigastric region for the past 3 days, associated with vomiting (3-4 episodes per day), low-grade fever, and constipation. Symptoms worsen after meals. No radiation of pain. No jaundice. No chest pain or shortness of breath.",
    historyDuration: (cd.historyDuration as string | undefined) || "3 days",
    severity: (cd.severity as string | undefined) || "Moderate",
    associatedSymptoms: (cd.associatedSymptoms as string | undefined) || "Nausea, loss of appetite, mild dehydration",
    // Past medical history (checkboxes)
    pastMedical: (cd.pastMedical as object | undefined) || {
      diabetes: false, hypertension: true, asthma: false, thyroid: false,
      tuberculosis: false, heartDisease: false, kidneyDisease: false, cancer: false,
      others: "GERD — 2 years ago",
    },
    surgicalHistory: (cd.surgicalHistory as string[] | undefined) || ["Appendectomy (2019)"],
    allergies: (cd.allergies as object | undefined) || {
      drug: "Penicillin (rash)",
      food: "None",
      latex: false,
      none: false,
    },
    personalHistory: (cd.personalHistory as object | undefined) || {
      smoking: "Non-smoker",
      alcohol: "Occasional",
      tobacco: "No",
      exercise: "Regular (3x/week)",
      diet: "Mixed",
      sleep: "7-8 hours",
    },
    obstetricHistory: (cd.obstetricHistory as object | undefined) || {
      lmp: "—",
      gravida: "—",
      para: "—",
      applicable: prescription.patient.gender === "female",
    },
    familyHistory: (cd.familyHistory as object | undefined) || {
      father: "Diabetes, Hypertension",
      mother: "Hypertension",
      geneticDisease: "None",
      cancerHistory: "No",
      diabetes: true,
      hypertension: true,
      heartDisease: false,
    },
    // Clinical examination
    generalAppearance: (cd.generalAppearance as object | undefined) || {
      pallor: "Mild", icterus: "Absent", cyanosis: "Absent",
      clubbing: "Absent", edema: "Absent", lymphNodes: "Not palpable",
    },
    systemicExamination: (cd.systemicExamination as object | undefined) || {
      cvs: "S1, S2 normal. No murmur.",
      rs: "Bilateral air entry equal. No added sounds.",
      cns: "Conscious, oriented. GCS 15/15.",
      abdomen: "Soft, mild tenderness in epigastrium. No organomegaly.",
      ent: "Within normal limits",
      eye: "Within normal limits",
      skin: "No rash, no icterus",
    },
    // Diagnosis
    diagnosis: (cd.diagnosis as object | undefined) || {
      primary: prescription.diagnosis || "Acute Gastritis",
      secondary: "Mild Dehydration",
      icd10: "K29.7",
      icd11: "DA42",
    },
    clinicalNotes: (cd.clinicalNotes as string | undefined) || prescription.advice || "Patient counseled about condition and treatment. Advised oral hydration and bland diet. Return if symptoms worsen.",
    // Investigations
    investigations: (cd.investigations as object[] | undefined) || [
      { name: "CBC", reason: "Rule out infection", priority: "Routine", status: "Ordered" },
      { name: "LFT", reason: "Assess liver function", priority: "Routine", status: "Ordered" },
      { name: "USG Abdomen", reason: "Visualize abdominal organs", priority: "Urgent", status: "Pending" },
      { name: "Urine R/M", reason: "Rule out UTI", priority: "Routine", status: "Ordered" },
    ],
    // Procedures
    procedures: (cd.procedures as object[] | undefined) || [
      { name: "IV Fluids (RL)", date: today, doctor: prescription.doctor.name, notes: "1 pint over 4 hours" },
    ],
    // Medications
    medications: demoMeds,
    // Advice
    advice: (cd.advice as object | undefined) || {
      diet: "Bland diet, small frequent meals. Avoid spicy/oily food.",
      lifestyle: "Adequate rest. Stress management.",
      exercise: "Light walking. Avoid strenuous activity for 3 days.",
      hydration: "Plenty of oral fluids (3L/day). ORS if dehydrated.",
      restrictions: "Avoid alcohol, smoking, NSAIDs on empty stomach.",
      travel: "No restrictions",
    },
    // Follow up — prefer clinicalData, fall back to prescription.followUp
    followUp: (cd.followUp as object | undefined) || {
      date: new Date(today.getTime() + 7 * 86400000),
      department: prescription.doctor.department?.name || "General Medicine",
      doctor: prescription.doctor.name,
      nextReason: prescription.followUp || "Review symptoms and lab reports",
    },
    // Referral
    referral: (cd.referral as object | undefined) || {
      referredTo: "—",
      hospital: "—",
      doctor: "—",
      reason: "—",
    },
    // Billing summary
    billing: invoice ? {
      consultation: invoice.items.find(i => i.description.toLowerCase().includes("consult"))?.amount || prescription.doctor.consultationFee,
      procedure: invoice.items.find(i => i.description.toLowerCase().includes("proced"))?.amount || 0,
      lab: invoice.items.find(i => i.description.toLowerCase().includes("lab") || /cbc|lft|kft|usg/i.test(i.description))?.amount || 0,
      medicine: invoice.items.find(i => i.description.toLowerCase().includes("med") || /tablet|capsule|syrup/i.test(i.description))?.amount || 0,
      discount: invoice.discount,
      total: invoice.total,
      paid: invoice.paid,
      due: invoice.due,
    } : {
      consultation: prescription.doctor.consultationFee,
      procedure: 0,
      lab: 1200,
      medicine: 850,
      discount: 0,
      total: prescription.doctor.consultationFee + 2050,
      paid: prescription.doctor.consultationFee + 2050,
      due: 0,
    },
    // Doctor info for signature
    doctor: {
      name: prescription.doctor.name,
      qualification: prescription.doctor.qualification,
      licenseNo: prescription.doctor.licenseNumber,
      department: prescription.doctor.department?.name || "General Medicine",
      specialization: prescription.doctor.specialization,
      signature: prescription.doctor.signature, // base64 or URL
    },
    // Meta
    generatedBy: "Carelim OS v2.0",
    printedAt: new Date().toISOString(),
  });
}

// ─── Clinical notes ──────────────────────────────────────────────

async function listClinicalNotes(req: Request, res: Response) {
  const patientId = req.query.patientId as string | undefined;
  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  const notes = await db.clinicalNote.findMany({
    where,
    include: { patient: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(notes);
}

async function createClinicalNote(req: Request, res: Response) {
  const body = req.body;
  const note = await db.clinicalNote.create({ data: body });
  await db.auditLog.create({ data: { user: authEmail(), action: "CREATE", module: "EMR", detail: "Added clinical note" } });
  res.status(201).json(note);
}

async function deleteClinicalNote(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.clinicalNote.delete({ where: { id } });
  res.json({ ok: true });
}

// ─── Insurance claims ────────────────────────────────────────────

async function listInsuranceClaims(_req: Request, res: Response) {
  const claims = await db.insuranceClaim.findMany({ orderBy: { submittedAt: "desc" } });
  res.json(claims);
}

async function createInsuranceClaim(req: Request, res: Response) {
  const body = req.body || {};
  const count = await db.insuranceClaim.count();
  const claim = await db.insuranceClaim.create({
    data: { ...body, claimNo: `CLM-${nanoId(8).toUpperCase()}` },
  });
  res.status(201).json(claim);
}

async function updateInsuranceClaim(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.status === "approved") data.approvedAt = new Date();
  if (body.status === "paid") { data.paidAt = new Date(); data.approvedAt = data.approvedAt || new Date(); }
  const claim = await db.insuranceClaim.update({ where: { id }, data: data as never });
  res.json(claim);
}

// ─── Doctor commissions ──────────────────────────────────────────

async function listDoctorCommissions(_req: Request, res: Response) {
  const commissions = await db.doctorCommission.findMany({ orderBy: { month: "desc" } });
  res.json(commissions);
}

async function updateDoctorCommission(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.status === "settled") data.settledAt = new Date();
  const commission = await db.doctorCommission.update({ where: { id }, data: data as never });
  res.json(commission);
}

// ─── Doctor schedule ─────────────────────────────────────────────

async function listScheduleSlots(req: Request, res: Response) {
  const doctorId = req.query.doctorId as string | undefined;
  const where: Record<string, unknown> = {};
  if (doctorId) where.doctorId = doctorId;
  const slots = await db.doctorScheduleSlot.findMany({
    where,
    include: { doctor: { include: { department: true } } },
    orderBy: { createdAt: "asc" },
  });
  // Sort by day order Mon→Sun
  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  slots.sort((a, b) => dayOrder.indexOf(a.dayName) - dayOrder.indexOf(b.dayName));
  res.json(slots);
}

async function createScheduleSlot(req: Request, res: Response) {
  const body = req.body || {};
  const slot = await db.doctorScheduleSlot.create({
    data: {
      doctorId: body.doctorId,
      dayName: body.dayName,
      startTime: body.startTime || "09:00",
      endTime: body.endTime || "17:00",
      slotDuration: body.slotDuration || 15,
      capacity: body.capacity || 20,
      bookedCount: 0,
      status: body.status || "available",
      notes: body.notes || null,
    },
  });
  await db.auditLog.create({ data: { user: authEmail(), action: "CREATE", module: "Doctor", detail: `Added schedule for ${body.dayName}` } });
  res.status(201).json(slot);
}

async function updateScheduleSlot(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body;
  const slot = await db.doctorScheduleSlot.update({ where: { id }, data: body });
  res.json(slot);
}

async function deleteScheduleSlot(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.doctorScheduleSlot.delete({ where: { id } });
  res.json({ ok: true });
}

// ─── Doctor workspace ────────────────────────────────────────────

async function getDoctorWorkspace(req: Request, res: Response) {
  const id = req.params.id as string;
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const [doctor, todayAppts, todayInvoices, monthAppts, prescriptions, labOrders] = await Promise.all([
    db.doctor.findUnique({ where: { id }, include: { department: true } }),
    db.appointment.findMany({ where: { doctorId: id, date: { gte: startOfDay, lt: endOfDay } }, include: { patient: true }, orderBy: { time: "asc" } }),
    db.invoice.findMany({ where: { date: { gte: startOfDay, lt: endOfDay } }, include: { patient: true } }),
    db.appointment.count({ where: { doctorId: id, date: { gte: startOfDay, lt: endOfDay } } }),
    db.prescription.findMany({ where: { doctorId: id }, include: { patient: true, items: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.labTest.findMany({ where: { doctorId: id }, include: { patient: true }, orderBy: { orderedAt: "desc" }, take: 5 }),
  ]);

  if (!doctor) return fail(res, 404, "Not found");

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthCompleted = await db.appointment.count({ where: { doctorId: id, date: { gte: startOfMonth }, status: "completed" } });
  const monthRevenue = monthCompleted * doctor.consultationFee;

  const currentPatient = todayAppts.find(a => a.status === "in-consult");
  const waitingCount = todayAppts.filter(a => a.status === "scheduled" || a.status === "checked-in").length;
  const completedCount = todayAppts.filter(a => a.status === "completed").length;
  const todayRevenue = todayAppts.filter(a => a.status === "completed").reduce((s, a) => s + a.fee, 0);

  // Timeline (recent activities)
  const timeline: { time: string; action: string; detail: string; type: string }[] = [];
  todayAppts.slice(0, 5).forEach(a => {
    timeline.push({
      time: a.time,
      action: a.status === "completed" ? "Consultation completed" : a.status === "in-consult" ? "In consultation" : a.status === "checked-in" ? "Patient checked in" : "Appointment scheduled",
      detail: a.patient.name,
      type: a.status,
    });
  });
  prescriptions.slice(0, 3).forEach(p => {
    timeline.push({
      time: new Date(p.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      action: "Prescription written",
      detail: `${p.code} · ${p.patient.name}`,
      type: "prescription",
    });
  });
  labOrders.slice(0, 3).forEach(l => {
    timeline.push({
      time: new Date(l.orderedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      action: "Lab ordered",
      detail: `${l.testName} · ${l.patient.name}`,
      type: "lab",
    });
  });
  timeline.sort((a, b) => a.time.localeCompare(b.time));

  res.json({
    doctor,
    currentPatient: currentPatient ? { name: currentPatient.patient.name, token: currentPatient.tokenNo, patientCode: currentPatient.patient.patientCode } : null,
    waitingCount,
    completedCount,
    todayRevenue,
    monthAppts,
    monthCompleted,
    monthRevenue,
    pendingLabs: labOrders.filter(l => l.status === "pending" || l.status === "completed").length,
    todayAppointments: todayAppts.map(a => ({ id: a.id, time: a.time, patient: a.patient.name, patientCode: a.patient.patientCode, status: a.status, token: a.tokenNo })),
    timeline: timeline.slice(0, 8),
  });
}

// ─── Routers ─────────────────────────────────────────────────────

export function patientsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listPatients));
  r.post("/", requirePermission("Patient", "create"), wrap(createPatient));
  r.get("/:id", wrap(getPatient));
  r.put("/:id", wrap(updatePatient));
  r.delete("/:id", wrap(deletePatient));
  return r;
}

export function appointmentsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listAppointments));
  r.post("/", requirePermission("Appointment", "create"), wrap(createAppointment));
  r.get("/:id", wrap(getAppointment));
  r.patch("/:id", wrap(updateAppointment));
  r.delete("/:id", wrap(deleteAppointment));
  return r;
}

export function prescriptionsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listPrescriptions));
  r.post("/", requirePermission("EMR", "create"), wrap(createPrescription));
  r.get("/:id", wrap(getPrescription));
  r.delete("/:id", wrap(deletePrescription));
  return r;
}

export function prescriptionPrintRouter(): Router {
  const r = Router();
  r.get("/", wrap(printPrescription));
  return r;
}

export function clinicalNotesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listClinicalNotes));
  r.post("/", wrap(createClinicalNote));
  r.delete("/:id", wrap(deleteClinicalNote));
  return r;
}

export function insuranceClaimsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listInsuranceClaims));
  r.post("/", wrap(createInsuranceClaim));
  r.patch("/:id", wrap(updateInsuranceClaim));
  return r;
}

export function doctorCommissionsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listDoctorCommissions));
  r.patch("/:id", wrap(updateDoctorCommission));
  return r;
}

export function doctorScheduleRouter(): Router {
  const r = Router();
  r.get("/", wrap(listScheduleSlots));
  r.post("/", wrap(createScheduleSlot));
  r.put("/:id", wrap(updateScheduleSlot));
  r.delete("/:id", wrap(deleteScheduleSlot));
  return r;
}

export function doctorWorkspaceRouter(): Router {
  const r = Router();
  r.get("/:id/workspace", wrap(getDoctorWorkspace));
  return r;
}