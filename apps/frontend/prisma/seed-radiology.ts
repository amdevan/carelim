import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 100) / 100;

async function main() {
  console.log("Seeding Radiology (RIS+PACS) data...");
  await db.radiologySchedule.deleteMany();
  await db.radiologyAlert.deleteMany();
  await db.radiologyTemplate.deleteMany();
  await db.radiologyReport.deleteMany();
  await db.dicomImage.deleteMany();
  await db.radiologyStudy.deleteMany();
  await db.radiologyEquipment.deleteMany();
  await db.radiologyModality.deleteMany();
  await db.radiologyTest.deleteMany();

  const modalities = [
    { name: "X-Ray", code: "XR", baseFee: 350, contrastFee: 0, duration: 15 },
    { name: "CT Scan", code: "CT", baseFee: 3500, contrastFee: 800, duration: 30 },
    { name: "MRI", code: "MR", baseFee: 8000, contrastFee: 1500, duration: 45 },
    { name: "Ultrasound", code: "US", baseFee: 1200, contrastFee: 0, duration: 20 },
    { name: "ECG", code: "ECG", baseFee: 300, contrastFee: 0, duration: 10 },
    { name: "Echocardiography", code: "ECHO", baseFee: 2500, contrastFee: 0, duration: 30 },
    { name: "Mammography", code: "MG", baseFee: 2000, contrastFee: 0, duration: 20 },
    { name: "Doppler", code: "DPL", baseFee: 1800, contrastFee: 0, duration: 25 },
    { name: "DEXA (Bone Density)", code: "DEXA", baseFee: 2200, contrastFee: 0, duration: 15 },
    { name: "Fluoroscopy", code: "FL", baseFee: 1500, contrastFee: 500, duration: 30 },
  ];
  const modalityRecords = [];
  for (const m of modalities) {
    modalityRecords.push(await db.radiologyModality.create({ data: m }));
  }

  // Equipment
  const equipDefs = [
    { name: "Siemens X-Ray Multix", code: "XR-001", modIdx: 0, manufacturer: "Siemens", model: "Multix Fusion" },
    { name: "GE CT Revolution", code: "CT-001", modIdx: 1, manufacturer: "GE Healthcare", model: "Revolution ACT" },
    { name: "Philips MRI Ingenia", code: "MR-001", modIdx: 2, manufacturer: "Philips", model: "Ingenia 1.5T" },
    { name: "Mindray DP-50 Ultrasound", code: "US-001", modIdx: 3, manufacturer: "Mindray", model: "DP-50" },
    { name: "GE Vivid E95 ECHO", code: "ECHO-001", modIdx: 5, manufacturer: "GE Healthcare", model: "Vivid E95" },
    { name: "Hologic Selenia Mammography", code: "MG-001", modIdx: 6, manufacturer: "Hologic", model: "Selenia Dimensions" },
  ];
  for (const e of equipDefs) {
    const mod = modalityRecords[e.modIdx];
    await db.radiologyEquipment.create({
      data: {
        name: e.name, code: e.code, modalityId: mod.id,
        manufacturer: e.manufacturer, model: e.model,
        serialNumber: `SN-${rand(10000, 99999)}`,
        location: pick(["Radiology Dept 1st Floor", "Imaging Center", "Emergency Radiology"]),
        status: Math.random() > 0.85 ? pick(["maintenance", "breakdown"]) : "operational",
        utilizationPct: randFloat(45, 92),
        lastServiceDate: new Date(Date.now() - rand(10, 60) * 86400000),
        nextServiceDate: new Date(Date.now() + rand(10, 90) * 86400000),
      }
    });
  }

  // Templates
  const templateDefs = [
    { name: "Chest X-Ray Normal", modality: "X-Ray", bodyPart: "Chest PA", technique: "PA and lateral views acquired", defaultFindings: "Lungs are clear. Cardiac silhouette is normal. No pleural effusion or pneumothorax.", defaultImpression: "No acute cardiopulmonary abnormality." },
    { name: "CT Brain Normal", modality: "CT Scan", bodyPart: "Brain", technique: "Axial images acquired without contrast", defaultFindings: "No intracranial hemorrhage or mass effect. Ventricles and sulci are normal. Midline structures are centered.", defaultImpression: "No acute intracranial abnormality." },
    { name: "MRI Lumbar Spine", modality: "MRI", bodyPart: "Lumbar Spine", technique: "Sagittal T1, T2 and axial T2 images acquired", defaultFindings: "Normal signal intensity of vertebral bodies. No disc herniation or spinal canal stenosis.", defaultImpression: "Normal MRI lumbar spine." },
    { name: "Abdominal Ultrasound Normal", modality: "Ultrasound", bodyPart: "Abdomen", technique: "Grayscale sonography of the abdomen", defaultFindings: "Liver, gallbladder, pancreas, spleen and kidneys are normal. No free fluid.", defaultImpression: "Normal abdominal sonography." },
  ];
  for (const t of templateDefs) {
    await db.radiologyTemplate.create({ data: t });
  }

  // Studies + Reports
  const patients = await db.patient.findMany({ take: 30 });
  const doctors = await db.doctor.findMany();
  const today = new Date();
  const bodyParts = ["Chest PA", "Skull", "Brain", "Abdomen", "Pelvis", "Lumbar Spine", "Knee Joint", "Shoulder", "Thyroid", "Carotid", "Lower Limb"];
  const technicians = ["Rajesh Thapa", "Sita Gurung", "Hari Shrestha", "Maya Bhandari"];
  const radiologists = ["Dr. Anil Pathak", "Dr. Rekha Sharma", "Dr. Bikash Rai"];

  for (let i = 0; i < 30; i++) {
    const pat = pick(patients);
    const mod = pick(modalityRecords);
    const bodyPart = pick(bodyParts);
    const status = pick(["scheduled", "scheduled", "in-progress", "completed", "completed", "reported", "reported", "released", "released", "cancelled"]);
    const priority = pick(["normal", "normal", "normal", "urgent", "stat"]);
    const scheduledAt = new Date(today.getTime() + rand(-3, 5) * 86400000);
    const study = await db.radiologyStudy.create({
      data: {
        studyUid: `1.2.840.${rand(10000, 99999)}.${rand(10000, 99999)}`,
        patientId: pat.id,
        modalityId: mod.id,
        bodyPart,
        status,
        priority,
        scheduledAt,
        performedAt: ["completed", "reported", "released"].includes(status) ? new Date(scheduledAt.getTime() + 3600000) : null,
        reportedAt: ["reported", "released"].includes(status) ? new Date(scheduledAt.getTime() + 7200000) : null,
        releasedAt: status === "released" ? new Date(scheduledAt.getTime() + 10800000) : null,
        technicianName: ["completed", "reported", "released"].includes(status) ? pick(technicians) : null,
        radiologistName: ["reported", "released"].includes(status) ? pick(radiologists) : null,
        contrastUsed: (mod.code === "CT" || mod.code === "MR") && Math.random() > 0.5,
        clinicalHistory: pick(["Persistent cough and chest pain", "Headache and dizziness", "Abdominal pain", "Lower back pain", "Trauma — fall injury", "Routine checkup", "Follow-up"]),
        imageCount: ["completed", "reported", "released"].includes(status) ? rand(1, 12) : 0,
      }
    });

    // Add DICOM images for completed studies
    if (["completed", "reported", "released"].includes(status)) {
      const numImages = rand(1, 4);
      for (let j = 0; j < numImages; j++) {
        await db.dicomImage.create({
          data: {
            studyId: study.id,
            imageUrl: `https://medcore.health/dicom/${study.studyUid}/${j + 1}.dcm`,
            thumbnailUrl: `https://medcore.health/dicom/${study.studyUid}/${j + 1}_thumb.jpg`,
            instanceNumber: j + 1,
            description: `${mod.name} ${bodyPart} - Image ${j + 1}`,
            fileSize: randFloat(2, 15),
            uploadedBy: pick(technicians),
          }
        });
      }
    }

    // Add report for reported/released studies
    if (["reported", "released"].includes(status)) {
      const tmpl = pick(templateDefs);
      await db.radiologyReport.create({
        data: {
          studyId: study.id,
          examination: `${mod.name} ${bodyPart}`,
          clinicalHistory: study.clinicalHistory,
          technique: tmpl.technique,
          findings: tmpl.defaultFindings,
          impression: tmpl.defaultImpression,
          recommendations: Math.random() > 0.5 ? "Clinical correlation advised. Follow-up as needed." : null,
          status: status === "released" ? "released" : "verified",
          radiologistName: study.radiologistName,
          verifiedAt: study.reportedAt,
          releasedAt: study.releasedAt,
        }
      });
    }
  }

  // Critical alerts
  const alertDefs = [
    { finding: "Possible intracranial hemorrhage", modality: "CT Scan", bodyPart: "Brain", severity: "critical", confidence: 0.96 },
    { finding: "Large pulmonary nodule detected", modality: "X-Ray", bodyPart: "Chest PA", severity: "critical", confidence: 0.89 },
    { finding: "Acute fracture detected — distal radius", modality: "X-Ray", bodyPart: "Wrist", severity: "urgent", confidence: 0.92 },
    { finding: "Pleural effusion — moderate", modality: "Ultrasound", bodyPart: "Chest", severity: "urgent", confidence: 0.85 },
  ];
  for (let i = 0; i < alertDefs.length; i++) {
    const a = alertDefs[i];
    const pat = pick(patients);
    await db.radiologyAlert.create({
      data: {
        patientId: pat.id,
        patientName: pat.name,
        modality: a.modality,
        bodyPart: a.bodyPart,
        finding: a.finding,
        severity: a.severity,
        status: i < 2 ? "active" : "acknowledged",
        aiConfidence: a.confidence,
        doctorNotified: true,
        smsSent: i < 2,
        erAlerted: i === 0,
        acknowledgedBy: i >= 2 ? "Dr. Admin" : null,
        acknowledgedAt: i >= 2 ? new Date() : null,
      }
    });
  }

  // Schedules
  for (let i = 0; i < 10; i++) {
    const pat = pick(patients);
    const mod = pick(modalityRecords);
    const date = new Date(today);
    date.setDate(date.getDate() + rand(0, 5));
    await db.radiologySchedule.create({
      data: {
        patientId: pat.id,
        patientName: pat.name,
        modality: mod.name,
        bodyPart: pick(bodyParts),
        scheduledDate: date,
        timeSlot: `${String(rand(9, 16)).padStart(2, "0")}:${pick(["00", "15", "30", "45"])}`,
        status: pick(["booked", "booked", "confirmed", "completed"]),
        doctorName: pick(doctors).name,
        notes: pick(["NPO for 6 hours", "No contrast allergy", "Bring previous films", ""]),
      }
    });
  }

  console.log("Radiology seed complete");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
