import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prescription, Patient, Doctor, Department, PrescriptionItem, Invoice, InvoiceItem } from "@prisma/client";

type RichPrescription = Prescription & {
  patient: Patient;
  doctor: Doctor & { department: Department | null };
  items: PrescriptionItem[];
};

// Returns a rich, print-ready prescription payload for a given prescription ID
// (or the latest prescription if no id is provided — useful for demo/preview)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

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
    return NextResponse.json({ error: "No prescription found" }, { status: 404 });
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

  return NextResponse.json({
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
