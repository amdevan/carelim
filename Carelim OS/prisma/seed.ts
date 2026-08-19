import { PrismaClient, Prisma } from "@prisma/client";

const db = new PrismaClient();

const firstNames = ["Aarav", "Sita", "Rohan", "Priya", "Bishal", "Anjali", "Kiran", "Maya", "Dipesh", "Rabina", "Suman", "Gita", "Niraj", "Pooja", "Manish", "Sneha", "Hari", "Ritu", "Amit", "Sara"];
const lastNames = ["Sharma", "Thapa", "Gurung", "Magar", "Shrestha", "Khadka", "Rana", "Bhandari", "Poudel", "Acharya", "Karki", "Maharjan", "Bastola", "Dahal"];
const depts = [
  { name: "General Medicine", code: "GEN", color: "#0d9488" },
  { name: "Cardiology", code: "CAR", color: "#dc2626" },
  { name: "Pediatrics", code: "PED", color: "#d97706" },
  { name: "Orthopedics", code: "ORT", color: "#7c3aed" },
  { name: "Dermatology", code: "DER", color: "#db2777" },
  { name: "Gynecology", code: "GYN", color: "#0891b2" },
  { name: "ENT", code: "ENT", color: "#16a34a" },
  { name: "Ophthalmology", code: "Oph", color: "#ca8a04" },
];
const medCats = ["Tablet", "Capsule", "Syrup", "Injection", "Ointment", "Drops", "Inhaler"];
const medNames = ["Paracetamol", "Amoxicillin", "Ibuprofen", "Cetirizine", "Omeprazole", "Azithromycin", "Metformin", "Amlodipine", "Ranitidine", "Ciprofloxacin", "Diclofenac", "Pantoprazole", "Levocetirizine", "Vitamin C", "Calcium", "Iron", "Cough Syrup", "ORS", "Insulin", "Salbutamol"];
const testNames = [
  { name: "Complete Blood Count", cat: "Hematology", fee: 450, range: "4.0-11.0", unit: "x10^9/L" },
  { name: "Blood Glucose (Fasting)", cat: "Biochemistry", fee: 200, range: "70-100", unit: "mg/dL" },
  { name: "Lipid Profile", cat: "Biochemistry", fee: 800, range: "<200", unit: "mg/dL" },
  { name: "Liver Function Test", cat: "Biochemistry", fee: 1200, range: "varies", unit: "U/L" },
  { name: "Kidney Function Test", cat: "Biochemistry", fee: 1000, range: "varies", unit: "mg/dL" },
  { name: "Thyroid Profile (T3,T4,TSH)", cat: "Biochemistry", fee: 900, range: "0.4-4.0", unit: "mIU/L" },
  { name: "Urine Routine", cat: "Pathology", fee: 150, range: "normal", unit: "-" },
  { name: "X-Ray Chest PA", cat: "Radiology", fee: 350, range: "-", unit: "-" },
  { name: "ECG", cat: "Cardiology", fee: 300, range: "normal", unit: "-" },
  { name: "Ultrasound Abdomen", cat: "Radiology", fee: 1200, range: "-", unit: "-" },
  { name: "HbA1c", cat: "Biochemistry", fee: 700, range: "<5.7", unit: "%" },
  { name: "Vitamin D", cat: "Biochemistry", fee: 1500, range: "30-100", unit: "ng/mL" },
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min: number, max: number) { return Math.round((Math.random() * (max - min) + min) * 100) / 100; }

async function main() {
  console.log("Seeding MedCore...");
  // Clean
  await db.auditLog.deleteMany();
  await db.staffAttendance.deleteMany();
  await db.staff.deleteMany();
  await db.invoiceItem.deleteMany();
  await db.invoice.deleteMany();
  await db.labTest.deleteMany();
  await db.prescriptionItem.deleteMany();
  await db.prescription.deleteMany();
  await db.appointment.deleteMany();
  await db.medicine.deleteMany();
  await db.purchase.deleteMany();
  await db.supplier.deleteMany();
  await db.patient.deleteMany();
  await db.doctor.deleteMany();
  await db.department.deleteMany();
  await db.setting.deleteMany();
  await db.leaveRequest.deleteMany();
  await db.clinicalNote.deleteMany();
  await db.payroll.deleteMany();
  await db.expense.deleteMany();
  await db.radiologyTest.deleteMany();
  await db.user.deleteMany();
  await db.rolePermission.deleteMany();
  await db.role.deleteMany();
  await db.permission.deleteMany();
  await db.branch.deleteMany();

  // Departments
  const departments = await Promise.all(depts.map(d => db.department.create({ data: { ...d, description: `${d.name} department`, headDoctor: "TBD", isActive: true } })));

  // Doctors
  const docSpecs: Record<string, string[]> = {
    GEN: ["General Physician", "Internal Medicine"],
    CAR: ["Cardiologist", "Interventional Cardiologist"],
    PED: ["Pediatrician", "Neonatologist"],
    ORT: ["Orthopedic Surgeon", "Joint Replacement Specialist"],
    DER: ["Dermatologist", "Cosmetologist"],
    GYN: ["Gynecologist", "Obstetrician"],
    ENT: ["ENT Specialist", "Otolaryngologist"],
    Oph: ["Ophthalmologist", "Eye Surgeon"],
  };
  const doctors: Prisma.DoctorCreateInput[] = [];
  for (const dept of departments) {
    const n = rand(2, 3);
    for (let i = 0; i < n; i++) {
      const specs = docSpecs[dept.code] || ["Specialist"];
      doctors.push(await db.doctor.create({
        data: {
          name: `Dr. ${pick(firstNames)} ${pick(lastNames)}`,
          email: `doctor${doctors.length + 1}@medcore.health`,
          phone: `98${rand(10000000, 99999999)}`,
          gender: Math.random() > 0.5 ? "male" : "female",
          qualification: pick(["MBBS", "MBBS, MD", "MBBS, MS", "MBBS, MD, DM", "MBBS, FCPS"]),
          specialization: pick(specs),
          departmentId: dept.id,
          licenseNumber: `NMC-${rand(10000, 99999)}`,
          experience: rand(2, 25),
          consultationFee: pick([500, 700, 800, 1000, 1200, 1500, 2000]),
          commissionPct: pick([10, 15, 20, 25]),
          rating: randFloat(3.8, 5),
          workingDays: "Mon,Tue,Wed,Thu,Fri",
          startTime: "09:00",
          endTime: "17:00",
          status: Math.random() > 0.9 ? "on_leave" : "active",
        }
      }));
    }
  }

  // Patients
  const patients: Prisma.PatientCreateInput[] = [];
  const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
  for (let i = 0; i < 60; i++) {
    const dob = new Date(rand(1950, 2018), rand(0, 11), rand(1, 28));
    const age = new Date().getFullYear() - dob.getFullYear();
    const wt = rand(40, 95);
    const ht = rand(150, 185) / 100;
    patients.push(await db.patient.create({
      data: {
        patientCode: `PT-${String(i + 1).padStart(5, "0")}`,
        name: `${pick(firstNames)} ${pick(lastNames)}`,
        email: Math.random() > 0.5 ? `patient${i + 1}@mail.com` : null,
        phone: `98${rand(10000000, 99999999)}`,
        gender: Math.random() > 0.5 ? "male" : "female",
        dob,
        age,
        bloodGroup: pick(bloodGroups),
        address: pick(["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara", "Chitwan", "Biratnagar"]) + ", Nepal",
        bloodPressure: `${rand(100, 140)}/${rand(60, 90)}`,
        temperature: `${rand(97, 102)}.${rand(0, 9)}`,
        pulse: `${rand(60, 100)}`,
        weight: wt,
        height: Math.round(ht * 100),
        bmi: randFloat(18, 32),
        allergies: Math.random() > 0.7 ? pick(["Penicillin", "Sulfa drugs", "Peanuts", "Dust", "Pollen"]) : null,
        chronicConditions: Math.random() > 0.7 ? pick(["Hypertension", "Diabetes", "Asthma", "Thyroid", "None"]) : null,
        emergencyContact: `98${rand(10000000, 99999999)}`,
        emergencyName: `${pick(firstNames)} ${pick(lastNames)}`,
        insuranceProvider: Math.random() > 0.6 ? pick(["Medicare", "Star Health", "Shikhar Insurance", "NIC Asia"]) : null,
        insuranceNumber: Math.random() > 0.6 ? `INS-${rand(100000, 999999)}` : null,
        status: "active",
      }
    }));
  }

  // Appointments — today + history
  const today = new Date();
  const apptStatuses = ["scheduled", "checked-in", "in-consult", "completed", "cancelled", "no-show"];
  let tokenCounter = 1;
  for (let dayOffset = -14; dayOffset <= 2; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    const count = rand(4, 10);
    for (let j = 0; j < count; j++) {
      const doc = pick(doctors);
      const pat = pick(patients);
      const isPast = dayOffset < 0;
      const isToday = dayOffset === 0;
      let status = "scheduled";
      if (isPast) status = pick(["completed", "completed", "completed", "cancelled", "no-show"]);
      else if (isToday) status = pick(apptStatuses);
      const hr = rand(9, 16);
      await db.appointment.create({
        data: {
          tokenNo: tokenCounter++,
          patientId: pat.id,
          doctorId: doc.id,
          departmentId: doc.departmentId,
          date,
          time: `${String(hr).padStart(2, "0")}:${pick(["00", "15", "30", "45"])}`,
          type: pick(["walk-in", "online", "video", "follow-up"]),
          reason: pick(["Fever & cold", "Routine checkup", "Headache", "Stomach pain", "Follow-up", "Skin allergy", "Chest pain", "Joint pain", "Eye checkup"]),
          status,
          fee: doc.consultationFee,
          notes: "",
        }
      });
    }
  }

  // Suppliers
  const suppliers: Prisma.SupplierCreateInput[] = [];
  for (let i = 0; i < 6; i++) {
    suppliers.push(await db.supplier.create({
      data: {
        name: pick(["MediSupply Nepal", "Pharma Distributors", "HealthCare Imports", "Nepal Pharma Traders", "Everest Medicals", "Himalayan Pharma"]),
        contact: pick(firstNames) + " " + pick(lastNames),
        email: `supplier${i + 1}@pharma.com`,
        phone: `01-${rand(4000000, 5999999)}`,
        address: pick(["Kathmandu", "Lalitpur", "Birgunj"]) + ", Nepal",
      }
    }));
  }

  // Medicines
  for (let i = 0; i < medNames.length * 2; i++) {
    const name = medNames[i % medNames.length];
    const expiry = new Date(rand(2025, 2027), rand(0, 11), rand(1, 28));
    const stock = rand(0, 200);
    await db.medicine.create({
      data: {
        name: `${name} ${pick(["500mg", "250mg", "100mg", "5ml", "10ml", "1mg"])}`,
        genericName: name,
        category: pick(medCats),
        manufacturer: pick(["Nepal Pharma", "Cipla", "Sun Pharma", "Alkem", "Mankind", "Himalaya"]),
        batchNo: `B${rand(10000, 99999)}`,
        expiryDate: expiry,
        stockQty: stock,
        reorderLevel: 20,
        unitPrice: randFloat(5, 80),
        salePrice: randFloat(10, 120),
        barcode: `890${rand(1000000, 9999999)}`,
        location: `Rack-${pick(["A", "B", "C"])}-${rand(1, 20)}`,
        supplierId: pick(suppliers).id,
        status: stock > 0 ? "active" : "out-of-stock",
      }
    });
  }

  // Prescriptions
  for (let i = 0; i < 25; i++) {
    const doc = pick(doctors);
    const pat = pick(patients);
    const pres = await db.prescription.create({
      data: {
        code: `RX-${String(i + 1).padStart(5, "0")}`,
        patientId: pat.id,
        doctorId: doc.id,
        diagnosis: pick(["Acute upper respiratory infection", "Essential hypertension", "Type 2 Diabetes Mellitus", "Gastritis", "Migraine", "Viral fever", "Bronchitis", "UTI"]),
        symptoms: pick(["Fever, cough, body ache", "Headache, dizziness", "Abdominal pain, nausea", "Skin rash, itching", "Chest discomfort"]),
        vitals: `BP ${rand(110, 140)}/${rand(70, 90)} mmHg, Temp ${rand(98, 101)}°F, Pulse ${rand(70, 95)}/min`,
        advice: pick(["Take rest, drink plenty of water", "Avoid spicy food", "Continue medication as prescribed", "Follow-up after 7 days"]),
        followUp: pick(["7 days", "2 weeks", "1 month", "Not required"]),
        status: "active",
      }
    });
    const itemCount = rand(2, 5);
    for (let k = 0; k < itemCount; k++) {
      await db.prescriptionItem.create({
        data: {
          prescriptionId: pres.id,
          medicineName: pick(medNames) + " " + pick(["500mg", "250mg"]),
          dosage: pick(["1-0-1", "1-0-0", "0-0-1", "1-1-1", "2-0-2"]),
          frequency: pick(["After meal", "Before meal", "Empty stomach", "Bedtime"]),
          duration: pick(["3 days", "5 days", "7 days", "10 days", "2 weeks"]),
          quantity: rand(5, 30),
          instructions: pick(["Complete the course", "Take with water", "Do not skip"]),
        }
      });
    }
  }

  // Invoices
  const invTypes = ["consultation", "pharmacy", "lab", "package"];
  for (let i = 0; i < 40; i++) {
    const pat = pick(patients);
    const type = pick(invTypes);
    let items: { description: string; qty: number; rate: number }[] = [];
    if (type === "consultation") items = [{ description: "Doctor Consultation", qty: 1, rate: pick([500, 700, 1000, 1200]) }];
    else if (type === "pharmacy") {
      const n = rand(2, 4);
      for (let k = 0; k < n; k++) items.push({ description: pick(medNames) + " " + pick(["500mg", "250mg"]), qty: rand(1, 3), rate: randFloat(20, 150) });
    } else if (type === "lab") {
      const n = rand(1, 3);
      for (let k = 0; k < n; k++) { const t = pick(testNames); items.push({ description: t.name, qty: 1, rate: t.fee }); }
    } else {
      items = [{ description: "Health Checkup Package - Basic", qty: 1, rate: 3000 }];
    }
    const subtotal = items.reduce((s, it) => s + it.qty * it.rate, 0);
    const discount = Math.random() > 0.7 ? Math.round(subtotal * 0.1) : 0;
    const tax = Math.round((subtotal - discount) * 0.13);
    const total = subtotal - discount + tax;
    const paidRatio = Math.random();
    const paid = paidRatio > 0.7 ? total : paidRatio > 0.4 ? Math.round(total * 0.5) : 0;
    const due = total - paid;
    const date = new Date(today);
    date.setDate(date.getDate() - rand(0, 14));
    await db.invoice.create({
      data: {
        invoiceNo: `INV-${String(i + 1).padStart(5, "0")}`,
        patientId: pat.id,
        type,
        subtotal,
        discount,
        tax,
        total,
        paid,
        due,
        status: due === 0 ? "paid" : paid > 0 ? "partial" : "unpaid",
        paymentMethod: pick(["Cash", "Card", "eSewa", "Khalti", "Bank Transfer", "FonePay"]),
        date,
        items: { create: items.map(it => ({ description: it.description, qty: it.qty, rate: it.rate, amount: it.qty * it.rate })) },
      }
    });
  }

  // Lab tests
  for (let i = 0; i < 30; i++) {
    const t = pick(testNames);
    const pat = pick(patients);
    const date = new Date(today);
    date.setDate(date.getDate() - rand(0, 10));
    const statuses = ["pending", "collected", "processing", "completed", "approved"];
    const st = pick(statuses);
    await db.labTest.create({
      data: {
        testCode: `LAB-${String(i + 1).padStart(5, "0")}`,
        patientId: pat.id,
        testName: t.name,
        category: t.cat,
        doctorId: pick(doctors).id,
        status: st,
        result: st === "completed" || st === "approved" ? `${rand(4, 11)}.${rand(0, 9)}` : null,
        referenceRange: t.range,
        unit: t.unit,
        fee: t.fee,
        orderedAt: date,
        completedAt: st === "completed" || st === "approved" ? new Date() : null,
      }
    });
  }

  // Staff
  const staffRoles = ["Receptionist", "Pharmacist", "Lab Technician", "Nurse", "Accountant", "HR Manager", "IT Support"];
  const staffList: Prisma.StaffCreateInput[] = [];
  for (let i = 0; i < 12; i++) {
    staffList.push(await db.staff.create({
      data: {
        name: `${pick(firstNames)} ${pick(lastNames)}`,
        email: `staff${i + 1}@medcore.health`,
        phone: `98${rand(10000000, 99999999)}`,
        role: pick(staffRoles),
        department: pick(depts).name,
        designation: pick(["Junior", "Senior", "Lead", "Head"]),
        salary: pick([25000, 35000, 45000, 55000, 70000, 90000]),
        joinDate: new Date(rand(2018, 2024), rand(0, 11), rand(1, 28)),
        status: Math.random() > 0.9 ? "on_leave" : "active",
      }
    }));
  }
  // Attendance for last 7 days
  for (let d = 0; d < 7; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    for (const s of staffList) {
      await db.staffAttendance.create({
        data: {
          staffId: s.id,
          date,
          checkIn: `${pick(["09:0", "09:1", "09:2", "09:3", "10:0"])}${pick(["0", "5"])}`,
          checkOut: pick(["17:00", "17:30", "18:00", ""]),
          status: Math.random() > 0.85 ? pick(["absent", "late", "leave"]) : "present",
        }
      });
    }
  }

  // Audit logs
  const actions = [
    { action: "LOGIN", module: "Auth", detail: "User logged in" },
    { action: "CREATE", module: "Patient", detail: "Registered new patient" },
    { action: "UPDATE", module: "Appointment", detail: "Rescheduled appointment" },
    { action: "CREATE", module: "Invoice", detail: "Generated invoice" },
    { action: "CREATE", module: "Prescription", detail: "Created prescription" },
    { action: "DELETE", module: "Medicine", detail: "Removed expired medicine" },
    { action: "UPDATE", module: "Settings", detail: "Updated clinic settings" },
    { action: "CREATE", module: "LabTest", detail: "Ordered lab test" },
    { action: "APPROVE", module: "LabTest", detail: "Approved lab result" },
    { action: "PAYMENT", module: "Billing", detail: "Recorded payment" },
  ];
  for (let i = 0; i < 30; i++) {
    const a = pick(actions);
    const date = new Date(today);
    date.setHours(date.getHours() - rand(0, 72));
    await db.auditLog.create({
      data: {
        user: pick(["admin@medcore.health", "reception@medcore.health", "doctor1@medcore.health", "pharma@medcore.health"]),
        action: a.action,
        module: a.module,
        detail: a.detail,
        ip: `192.168.1.${rand(2, 200)}`,
        createdAt: date,
      }
    });
  }

  // Settings
  const settings = [
    { key: "clinic_name", value: "MedCore Health Center" },
    { key: "clinic_phone", value: "+977-1-4XXXXXX" },
    { key: "clinic_email", value: "info@medcore.health" },
    { key: "clinic_address", value: "Putalisadak, Kathmandu, Nepal" },
    { key: "currency", value: "NPR (Rs.)" },
    { key: "tax_rate", value: "13" },
    { key: "timezone", value: "Asia/Kathmandu" },
    { key: "language", value: "English" },
    { key: "theme", value: "light" },
  ];
  for (const s of settings) await db.setting.create({ data: s });

  // Branches
  const branchData = [
    { name: "Main Branch — Putalisadak", code: "BR-01", address: "Putalisadak, Kathmandu", phone: "01-4XXXXXX", email: "main@medcore.health", manager: "Dr. Sharma", status: "active" },
    { name: "Branch II — Patan", code: "BR-02", address: "Patan Dhoka, Lalitpur", phone: "01-5XXXXXX", email: "patan@medcore.health", manager: "Dr. Gurung", status: "active" },
    { name: "Diagnostic Center — Bhaktapur", code: "BR-03", address: "Suryabinayak, Bhaktapur", phone: "01-6XXXXXX", email: "diag@medcore.health", manager: "Dr. Shrestha", status: "active" },
  ];
  for (const b of branchData) await db.branch.create({ data: b });

  // Permissions
  const modules = ["Dashboard", "Patient", "Doctor", "Appointment", "Prescription", "EMR", "Pharmacy", "Laboratory", "Radiology", "Billing", "Inventory", "Reports", "HR", "Settings", "Audit"];
  const actions2 = ["view", "create", "edit", "delete", "print", "export", "approve", "reject"];
  const permMap: Record<string, string> = {};
  for (const m of modules) {
    for (const a of actions2) {
      const p = await db.permission.create({ data: { module: m, action: a } });
      permMap[`${m}.${a}`] = p.id;
    }
  }

  // Roles
  const adminRole = await db.role.create({ data: { name: "Super Admin", description: "Full system access", isSystem: true, permissions: { create: Object.values(permMap).map((id) => ({ permissionId: id })) } } });
  const doctorRole = await db.role.create({ data: { name: "Doctor", description: "Clinical access", isSystem: true, permissions: { create: ["Dashboard.view", "Patient.view", "Patient.create", "Patient.edit", "Appointment.view", "Appointment.edit", "Prescription.view", "Prescription.create", "EMR.view", "EMR.create", "EMR.edit", "Laboratory.view", "Laboratory.create", "Radiology.view", "Billing.view", "Patient.print", "Prescription.print"].map((k) => ({ permissionId: permMap[k] })) } } });
  const receptionRole = await db.role.create({ data: { name: "Receptionist", description: "Front desk operations", isSystem: true, permissions: { create: ["Dashboard.view", "Patient.view", "Patient.create", "Patient.edit", "Appointment.view", "Appointment.create", "Appointment.edit", "Billing.view", "Billing.create", "Patient.print", "Appointment.print"].map((k) => ({ permissionId: permMap[k] })) } } });
  await db.role.create({ data: { name: "Pharmacist", description: "Pharmacy operations", isSystem: true, permissions: { create: ["Dashboard.view", "Pharmacy.view", "Pharmacy.create", "Pharmacy.edit", "Inventory.view", "Billing.view", "Pharmacy.print", "Pharmacy.export"].map((k) => ({ permissionId: permMap[k] })) } } });
  await db.role.create({ data: { name: "Lab Technician", description: "Laboratory operations", isSystem: true, permissions: { create: ["Dashboard.view", "Laboratory.view", "Laboratory.create", "Laboratory.edit", "Radiology.view", "Laboratory.print"].map((k) => ({ permissionId: permMap[k] })) } } });
  await db.role.create({ data: { name: "Accountant", description: "Finance operations", isSystem: true, permissions: { create: ["Dashboard.view", "Billing.view", "Billing.create", "Billing.edit", "Reports.view", "Reports.export"].map((k) => ({ permissionId: permMap[k] })) } } });

  // Users
  await db.user.create({ data: { name: "System Admin", email: "admin@medcore.health", password: "medcore123", roleId: adminRole.id, status: "active" } });
  await db.user.create({ data: { name: "Dr. Aarav Sharma", email: "doctor@medcore.health", password: "medcore123", roleId: doctorRole.id, status: "active" } });
  await db.user.create({ data: { name: "Reception Desk", email: "reception@medcore.health", password: "medcore123", roleId: receptionRole.id, status: "active" } });

  // Radiology tests
  const radioModalities = ["X-Ray", "CT Scan", "MRI", "ECG", "Ultrasound"];
  const bodyParts = ["Chest PA", "Skull", "Spine Lumbar", "Knee Joint", "Abdomen", "Pelvis", "Hand", "Foot"];
  for (let i = 0; i < 18; i++) {
    const pat = pick(patients);
    const st = pick(["pending", "captured", "reported", "approved"]);
    const date = new Date(today);
    date.setDate(date.getDate() - rand(0, 8));
    await db.radiologyTest.create({
      data: {
        testCode: `RAD-${String(i + 1).padStart(5, "0")}`,
        patientId: pat.id,
        modality: pick(radioModalities),
        bodyPart: pick(bodyParts),
        findings: st === "reported" || st === "approved" ? pick(["No abnormality detected", "Mild osteoarthritis changes", "Small opacity noted", "Normal study", "Mild degenerative changes"]) : null,
        impression: st === "approved" ? pick(["Within normal limits", "Suggest clinical correlation", "Follow-up recommended", "No acute findings"]) : null,
        radiologist: st === "approved" ? `Dr. ${pick(firstNames)} ${pick(lastNames)}` : null,
        status: st,
        fee: pick([350, 800, 1200, 2000, 3500, 5000]),
        orderedAt: date,
        completedAt: st === "reported" || st === "approved" ? new Date() : null,
      }
    });
  }

  // Expenses
  const expCats = ["rent", "salary", "utilities", "supplies", "maintenance", "other"];
  for (let i = 0; i < 20; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - rand(0, 30));
    await db.expense.create({
      data: {
        code: `EXP-${String(i + 1).padStart(5, "0")}`,
        category: pick(expCats),
        description: pick(["Monthly office rent", "Electricity bill", "Water bill", "Internet service", "Cleaning supplies", "Office stationery", "Equipment maintenance", "Staff salary", "Medical supplies purchase", "Vehicle fuel"]),
        amount: pick([5000, 12000, 25000, 45000, 80000, 150000, 350000]),
        paymentMode: pick(["cash", "bank", "cheque"]),
        date,
        createdBy: "admin@medcore.health",
      }
    });
  }

  // Payroll for current month
  const monthStr = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  for (const s of staffList) {
    const allowance = pick([2000, 3000, 5000]);
    const deduction = pick([0, 500, 1000]);
    await db.payroll.create({
      data: {
        staffId: s.id,
        month: monthStr,
        basicSalary: s.salary,
        allowance,
        deduction,
        netPay: s.salary + allowance - deduction,
        status: Math.random() > 0.5 ? "paid" : "pending",
        paidAt: Math.random() > 0.5 ? new Date() : null,
      }
    });
  }

  // Clinical notes
  for (let i = 0; i < 20; i++) {
    await db.clinicalNote.create({
      data: {
        patientId: pick(patients).id,
        doctorId: pick(doctors).id,
        type: pick(["general", "soap", "followup", "nursing"]),
        content: pick([
          "Patient reports improvement in symptoms after 3 days of medication. Continue current treatment plan.",
          "Vitals stable. BP 120/80, no complaints. Advised dietary modifications.",
          "Follow-up visit. Condition resolving well. Discontinue antibiotics.",
          "Patient presented with mild fever. Prescribed rest and fluids. Recheck in 48h.",
          "Wound healing satisfactorily. Dressing changed. No signs of infection.",
        ]),
      }
    });
  }

  // Leave requests
  for (let i = 0; i < 8; i++) {
    const start = new Date(today);
    start.setDate(start.getDate() + rand(-5, 10));
    const end = new Date(start);
    end.setDate(end.getDate() + rand(1, 4));
    await db.leaveRequest.create({
      data: {
        staffId: pick(staffList).id,
        type: pick(["casual", "sick", "earned", "unpaid"]),
        startDate: start,
        endDate: end,
        reason: pick(["Family function", "Medical appointment", "Personal work", "Fever", "Religious holiday"]),
        status: pick(["pending", "approved", "rejected"]),
      }
    });
  }

  console.log("Seed complete:", { departments: departments.length, doctors: doctors.length, patients: patients.length });
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
