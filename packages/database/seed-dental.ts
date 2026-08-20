import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const TOOTH_CONDITIONS = ["sound", "missing", "decayed", "filled", "crown", "bridge", "implant", "root_canal", "extraction", "fracture", "mobility", "sealant", "impacted"] as const;
const TREATMENT_TYPES = ["scaling", "polishing", "composite_filling", "amalgam_filling", "rct", "extraction", "surgical_extraction", "crown", "bridge", "implant", "orthodontics", "dentures", "veneers", "whitening", "perio_surgery"] as const;

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min: number, max: number) { return Math.round((Math.random() * (max - min) + min) * 100) / 100; }

// All 32 permanent FDI teeth (upper/right → upper/left → lower/right → lower/left)
const PERMANENT_TEETH = [
  ...[18, 17, 16, 15, 14, 13, 12, 11], // upper right
  ...[21, 22, 23, 24, 25, 26, 27, 28], // upper left
  ...[48, 47, 46, 45, 44, 43, 42, 41], // lower right
  ...[31, 32, 33, 34, 35, 36, 37, 38], // lower left
];
// 20 primary teeth
const PRIMARY_TEETH = [
  ...[55, 54, 53, 52, 51],
  ...[61, 62, 63, 64, 65],
  ...[85, 84, 83, 82, 81],
  ...[71, 72, 73, 74, 75],
];

async function main() {
  console.log("Seeding Dental Add-on module...");

  // 1. Register as a platform module + add-on (idempotent)
  const moduleRec = await db.platformModule.upsert({
    where: { name: "Dental" },
    update: {},
    create: {
      name: "Dental",
      description: "Odontogram, clinical exams, treatment plans, procedures, dental lab, orthodontics, implants & follow-ups",
      category: "healthcare",
      icon: "Smile",
      isActive: true,
    },
  });
  console.log("Dental platform module:", moduleRec.id);

  const addOn = await db.addOn.upsert({
    where: { name: "Dental Module" },
    update: {},
    create: {
      name: "Dental Module",
      description: "Complete dental clinic management with interactive odontogram, treatment planning, procedures, dental lab, orthodontics and implant tracking.",
      price: 8000,
      billingCycle: "monthly",
      isActive: true,
    },
  });
  console.log("Dental add-on:", addOn.id);

  // 2. Clean existing dental data
  await db.dentalFollowup.deleteMany();
  await db.implantCase.deleteMany();
  await db.orthodonticCase.deleteMany();
  await db.dentalLabOrder.deleteMany();
  await db.dentalImage.deleteMany();
  await db.dentalProcedure.deleteMany();
  await db.dentalTreatmentPlan.deleteMany();
  await db.tooth.deleteMany();
  await db.odontogram.deleteMany();
  await db.dentalExamination.deleteMany();

  // 3. Reuse existing patients & doctors (do not duplicate core records)
  const patients = await db.patient.findMany({ take: 60 });
  const doctors = await db.doctor.findMany();
  if (patients.length < 10 || doctors.length < 3) {
    console.warn("Not enough patients/doctors in DB; run core seed first.");
    return;
  }

  const today = new Date();
  const dentalPatients = patients.slice(0, 28);

  // 4. Examinations — create 1-3 per dental patient
  let examCounter = 0;
  for (const pat of dentalPatients) {
    const n = rand(1, 3);
    for (let i = 0; i < n; i++) {
      examCounter++;
      const doc = pick(doctors);
      const examDate = new Date(today);
      examDate.setDate(examDate.getDate() - rand(0, 90));
      await db.dentalExamination.create({
        data: {
          examNo: `DEX-${String(examCounter).padStart(5, "0")}`,
          patientId: pat.id,
          doctorId: doc.id,
          examDate,
          chiefComplaint: pick([
            "Pain in lower right back tooth for 1 week",
            "Bleeding gums while brushing",
            "Broken front tooth after trauma",
            "Sensitivity to cold and hot",
            "Swelling in lower jaw",
            "Loose tooth in lower front region",
            "Decay in multiple teeth",
            "Difficulty in chewing food",
            "Aesthetic concern — discolored upper front teeth",
            "Bad breath and gum bleeding",
          ]),
          medicalHistory: pick(["None", "Hypertension — on Amlodipine", "Diabetes Type 2 — controlled", "Asthma", "Cardiac — on Aspirin", "Pregnancy — 2nd trimester", "Bleeding disorder"]),
          dentalHistory: pick([
            "Multiple fillings in past 5 years",
            "History of extraction 2 years ago",
            "Orthodontic treatment in childhood",
            "Regular scaling every 6 months",
            "Root canal treatment 1 year ago",
            "First dental visit",
            "Wears partial denture",
          ]),
          extraOral: JSON.stringify({
            face: pick(["Symmetrical", "Mild swelling on right side", "No abnormalities"]),
            lymphNodes: pick(["Non-palpable", "Submandibular lymphadenopathy", "Tender on palpation"]),
            tmj: pick(["No tenderness, normal movement", "Clicking sound on opening", "Restricted mouth opening"]),
          }),
          intraOral: JSON.stringify({
            lips: pick(["Normal", "Dry and cracked", "Herpetic lesion on upper lip"]),
            cheeks: pick(["Normal", "White line on buccal mucosa (linea alba)", "Bite mark injury"]),
            tongue: pick(["Coated", "Normal", "Fissured"]),
            floor: pick(["Normal", "Submandibular duct orifice normal"]),
            palate: pick(["Normal", "Torus palatinus present"]),
            gingiva: pick(["Pink, firm, no bleeding", "Erythematous, bleeds on probing", "Recession in lower incisors"]),
          }),
          occlusion: pick(["Class I", "Class II Division 1", "Class II Division 2", "Class III", "Crossbite anterior", "Deep bite", "Open bite"]),
          tmjAssessment: pick(["Normal range of motion, no deviation", "Deviation to right on opening", "Crepitus on palpation", "Limited opening — 30mm"]),
          softTissueFindings: pick(["No pathology", "Apthous ulcer on buccal mucosa", "Leukoplakia on lateral border of tongue", "Mucocele on lower lip"]),
          hardTissueFindings: pick([
            "Multiple carious lesions — 16, 26, 36, 46",
            "Fracture — 11",
            "Attrition in anterior teeth",
            "Cervical abrasion — 14, 24",
            "Impacted — 18, 28, 38, 48",
            "Missing — 16, 36",
          ]),
          periodontalExam: JSON.stringify({
            probing: pick(["2-3mm generalized", "4-5mm in molars", "6mm pocket on mesial of 16", "Generalized 3-4mm"]),
            recession: pick(["None", "1-2mm in lower incisors", "3mm on buccal of 16"]),
            mobility: pick(["Grade 0", "Grade I — 31, 41", "Grade II — 36"]),
            furcation: pick(["None", "Grade I — 16, 46"]),
          }),
          diagnosis: pick([
            "Chronic generalized gingivitis with localized periodontitis",
            "Dental caries with pulpitis — 36",
            "Apical periodontitis — 11 (trauma)",
            "Pericoronitis — 38",
            "Chronic periodontitis with mobile teeth",
            "Multiple carious teeth",
            "Class II malocclusion with crowding",
            "Edentulous space — 16, 46",
          ]),
          clinicalNotes: pick([
            "Patient counseled regarding oral hygiene. Scaling scheduled. Carious teeth to be restored.",
            "Radiograph advised — IOPA 36. Root canal treatment planned.",
            "Extraction of 38 advised under antibiotic cover.",
            "Orthodontic consultation recommended.",
            "Implant placement planned for missing 16. CBCT advised.",
            "Full mouth scaling and root planing planned. Recall after 1 month.",
          ]),
        },
      });
    }
  }

  // 5. Odontograms — one per dental patient with randomized tooth conditions
  let odoCounter = 0;
  for (const pat of dentalPatients) {
    odoCounter++;
    const od = await db.odontogram.create({
      data: {
        patientId: pat.id,
        numberingSystem: "fdi",
        notes: pick(["Initial charting", "Updated after scaling", "Updated after extraction of 38", "Post-treatment review"]),
      },
    });
    // Permanent teeth — assign random conditions
    const numIssues = rand(4, 12);
    const problemTeeth = new Set<string>();
    while (problemTeeth.size < numIssues) problemTeeth.add(pick(PERMANENT_TEETH).toString());
    for (const tNum of PERMANENT_TEETH) {
      const status = problemTeeth.has(tNum.toString()) ? pick(TOOTH_CONDITIONS.filter(c => c !== "sound")) : "sound";
      const surfaces = status === "decayed" ? JSON.stringify({ occlusal: true, distal: Math.random() > 0.5 }) : null;
      const conditions = status !== "sound" ? JSON.stringify([{ type: status, date: new Date(today.getTime() - rand(1, 365) * 86400000).toISOString().slice(0, 10), note: pick(["Initial diagnosis", "Patient reported pain", "Routine examination finding", "Referred from OPD"]) }]) : null;
      await db.tooth.create({
        data: {
          odontogramId: od.id,
          toothNumber: tNum.toString(),
          isPrimary: false,
          status,
          surfaces,
          conditions,
          notes: status !== "sound" ? pick(["Monitor", "Treatment planned", " asymptomatic", ""]) : null,
        },
      });
    }
    // A few primary teeth for pediatric patients
    if (pat.age && pat.age < 15) {
      for (const tNum of PRIMARY_TEETH) {
        const isIssue = Math.random() > 0.75;
        await db.tooth.create({
          data: {
            odontogramId: od.id,
            toothNumber: tNum.toString(),
            isPrimary: true,
            status: isIssue ? pick(["decayed", "filled", "missing", "sealant"]) : "sound",
            notes: isIssue ? "Early childhood caries" : null,
          },
        });
      }
    }
  }

  // 6. Treatment Plans
  let planCounter = 0;
  const treatmentCosts: Record<string, number> = {
    scaling: 1500, polishing: 800, composite_filling: 2500, amalgam_filling: 1500,
    rct: 8000, extraction: 1000, surgical_extraction: 5000, crown: 12000,
    bridge: 35000, implant: 75000, orthodontics: 120000, dentures: 45000,
    veneers: 18000, whitening: 10000, perio_surgery: 25000,
  };
  for (const pat of dentalPatients) {
    const n = rand(1, 4);
    for (let i = 0; i < n; i++) {
      planCounter++;
      const tt = pick(TREATMENT_TYPES);
      const doc = pick(doctors);
      const planned = new Date(today);
      planned.setDate(planned.getDate() - rand(0, 60));
      const status = pick(["planned", "planned", "approved", "in_progress", "completed", "completed", "cancelled"]);
      const consentSigned = ["approved", "in_progress", "completed"].includes(status);
      await db.dentalTreatmentPlan.create({
        data: {
          planNo: `DTP-${String(planCounter).padStart(5, "0")}`,
          patientId: pat.id,
          doctorId: doc.id,
          toothNumbers: ["scaling", "polishing", "whitening", "perio_surgery"].includes(tt) ? null : pick(["11", "16,26", "36", "11,21", "46", "14,15,16", "38", "31,41"]),
          diagnosis: pick([
            "Caries involving dentin",
            "Pulpitis — irreversible",
            "Apical periodontitis",
            "Periodontal pocket >5mm",
            "Fractured tooth",
            "Edentulous space",
            "Malocclusion — crowding",
            "Aesthetic dissatisfaction",
          ]),
          treatmentType: tt,
          estimatedCost: treatmentCosts[tt] || 2000,
          status,
          consentSigned,
          consentDate: consentSigned ? new Date(planned.getTime() + 86400000) : null,
          notes: pick([
            "Patient agreed to treatment plan and cost estimate.",
            "Pre-op radiograph advised.",
            "Antibiotic coverage recommended.",
            "Two-visit procedure.",
            "Avoid hard food for 24 hours after procedure.",
          ]),
          createdAt: planned,
        },
      });
    }
  }

  // 7. Procedures — completed procedures auto-generate invoices
  let procCounter = 0;
  let invCounter = (await db.invoice.count()) + 1;
  const procedureCosts: Record<string, number> = treatmentCosts;
  for (const pat of dentalPatients) {
    const n = rand(0, 3);
    for (let i = 0; i < n; i++) {
      procCounter++;
      const tt = pick(TREATMENT_TYPES);
      const doc = pick(doctors);
      const procDate = new Date(today);
      procDate.setDate(procDate.getDate() - rand(0, 45));
      const cost = procedureCosts[tt] || 2000;
      const tax = Math.round(cost * 0.13);
      const total = cost + tax;
      // Auto-create invoice via Billing module
      const invoice = await db.invoice.create({
        data: {
          invoiceNo: `INV-${String(invCounter++).padStart(5, "0")}`,
          patientId: pat.id,
          type: "consultation",
          subtotal: cost,
          discount: 0,
          tax,
          total,
          paid: total,
          due: 0,
          status: "paid",
          paymentMethod: pick(["Cash", "Card", "eSewa", "Khalti", "FonePay"]),
          date: procDate,
          items: { create: [{ description: `Dental — ${tt.replace(/_/g, " ")} (${pick(["11", "16", "36", "46", "11,21", "38"])})`, qty: 1, rate: cost, amount: cost }] },
        },
      });
      await db.auditLog.create({ data: { user: doc.email || "system", action: "CREATE", module: "Billing", detail: `Auto-generated invoice ${invoice.invoiceNo} for dental procedure` } });
      await db.dentalProcedure.create({
        data: {
          procNo: `DPR-${String(procCounter).padStart(5, "0")}`,
          patientId: pat.id,
          doctorId: doc.id,
          assistantId: pick(["", "AST-01", "AST-02"]) || null,
          procedureDate: procDate,
          toothNumbers: ["scaling", "polishing", "whitening", "perio_surgery"].includes(tt) ? null : pick(["11", "16", "36", "46", "11,21", "38"]),
          procedureType: tt,
          materialsUsed: JSON.stringify(pick([
            [{ itemId: "inv-1", name: "Composite resin", qty: 1 }],
            [{ itemId: "inv-2", name: "Amalgam alloy", qty: 1 }],
            [{ itemId: "inv-3", name: "Gutta-percha points", qty: 2 }, { itemId: "inv-4", name: "Sealer", qty: 1 }],
            [{ itemId: "inv-5", name: "Local anesthetic (Lidocaine)", qty: 1 }],
            [],
          ])),
          medicineUsed: JSON.stringify(pick([
            [{ medicineId: "med-1", name: "Amoxicillin 500mg", qty: 21, instruction: "1-0-1 for 7 days" }],
            [{ medicineId: "med-2", name: "Ibuprofen 400mg", qty: 10, instruction: "1-0-1 after meal, SOS pain" }],
            [{ medicineId: "med-3", name: "Chlorhexidine mouthwash", qty: 1, instruction: "Rinse 10ml twice daily" }],
            [],
          ])),
          notes: pick([
            "Procedure completed uneventfully. Patient tolerated well.",
            "Rubber dam isolation used. Cavity prepared and restored with composite.",
            "Root canal obturated with gutta-percha. Crown preparation scheduled.",
            "Extraction completed. Socket curetted. Hemostasis achieved. Suture placed.",
            "Scaling and root planing performed in all quadrants.",
          ]),
          complications: pick(["None", "Mild bleeding — controlled with pressure", "Post-operative sensitivity", ""]),
          duration: pick([15, 20, 30, 45, 60, 90, 120]),
          invoiceId: invoice.id,
          status: "completed",
          createdAt: procDate,
        },
      });
    }
  }

  // 8. Dental Images — link to radiology-style records (imageType)
  let imgCounter = 0;
  for (const pat of dentalPatients.slice(0, 18)) {
    const n = rand(1, 3);
    for (let i = 0; i < n; i++) {
      imgCounter++;
      await db.dentalImage.create({
        data: {
          patientId: pat.id,
          imageType: pick(["iopa", "opg", "cbct", "ceph", "clinical_photo", "before_after"]),
          title: pick(["Pre-op radiograph", "Post-op radiograph", "OPG full mouth", "CBCT cross-section", "Clinical photo — front view", "Before treatment", "After treatment"]),
          imageUrl: null, // demo placeholder — would be uploaded file
          annotation: Math.random() > 0.7 ? JSON.stringify([{ type: "arrow", x: 120, y: 80, label: "lesion" }]) : null,
          takenAt: new Date(today.getTime() - rand(0, 60) * 86400000),
          notes: pick(["Radiolucent area noted at apex", "Impacted third molar", "Bone level within normal limits", "Crown margin well-adapted", ""]),
        },
      });
    }
  }

  // 9. Lab Orders
  let labCounter = 0;
  const labTypes = ["crown", "bridge", "denture", "aligner", "implant"];
  for (const pat of dentalPatients.slice(0, 15)) {
    const n = rand(1, 2);
    for (let i = 0; i < n; i++) {
      labCounter++;
      const lt = pick(labTypes);
      const sent = new Date(today);
      sent.setDate(sent.getDate() - rand(0, 25));
      const status = pick(["pending", "in_lab", "ready", "delivered", "delivered", "returned"]);
      const delivery = ["ready", "delivered"].includes(status) ? new Date(sent.getTime() + rand(5, 14) * 86400000) : null;
      const received = status === "delivered" ? delivery : null;
      await db.dentalLabOrder.create({
        data: {
          orderNo: `DLO-${String(labCounter).padStart(5, "0")}`,
          patientId: pat.id,
          doctorId: pick(doctors).id,
          labType: lt,
          toothNumbers: lt === "aligner" ? null : pick(["16", "11,21", "36,37", "14-17", "46"]),
          material: pick(["PFM (Porcelain Fused to Metal)", "Zirconia", "All-ceramic (E.max)", "Acrylic", "Cobalt-chromium", "Composite"]),
          shade: pick(["A1", "A2", "A3", "B1", "B2", "C2"]),
          technician: pick(["Ramesh Lab", "Smile Dental Lab", "Prostho Tech", "Everest Dental Lab"]),
          labName: pick(["Smile Dental Laboratory", "Everest Dental Lab", "Kathmandu Dental Lab", "ProsthoTech Lab"]),
          status,
          sentDate: sent,
          deliveryDate: delivery,
          receivedDate: received,
          cost: pick([3500, 5500, 8000, 12000, 25000, 45000]),
          notes: pick(["Try-in required before final cementation", "Shade match verified", "Patient-specific instructions followed", ""]),
        },
      });
    }
  }

  // 10. Orthodontic Cases
  let orthoCounter = 0;
  for (const pat of dentalPatients.slice(0, 8)) {
    orthoCounter++;
    const start = new Date(today);
    start.setDate(start.getDate() - rand(30, 540));
    const status = pick(["active", "active", "paused", "completed"]);
    const end = status === "completed" ? new Date(start.getTime() + rand(180, 540) * 86400000) : null;
    const wireSeq = [];
    let curDate = new Date(start);
    const wireCount = rand(2, 5);
    for (let w = 0; w < wireCount; w++) {
      wireSeq.push({ date: curDate.toISOString().slice(0, 10), wire: pick(["0.014 NiTi", "0.016 NiTi", "0.018 SS", "0.019x0.025 SS", "0.017x0.025 TMA"]), notes: pick(["Initial alignment", "Leveled", "Space closure", "Finishing"]) });
      curDate = new Date(curDate.getTime() + rand(20, 60) * 86400000);
    }
    await db.orthodonticCase.create({
      data: {
        caseNo: `ORT-${String(orthoCounter).padStart(5, "0")}`,
        patientId: pat.id,
        doctorId: pick(doctors).id,
        treatmentType: pick(["braces", "braces", "aligners", "functional"]),
        startDate: start,
        endDate: end,
        bracketType: pick(["metal", "ceramic", "self_ligating", "lingual"]),
        wireSequence: JSON.stringify(wireSeq),
        planNotes: pick([
          "Class II extraction treatment plan — extraction of 14, 24 and retraction of canines.",
          "Non-extraction treatment with expansion and alignment.",
          "Aligner therapy — 20 aligners, 2-week changes.",
          "Functional appliance therapy for growing patient — Class II Div 1.",
        ]),
        progressPhotos: null,
        status,
        totalCost: pick([80000, 120000, 180000, 250000]),
        paidAmount: pick([20000, 60000, 120000, 250000]),
      },
    });
  }

  // 11. Implant Cases
  let implCounter = 0;
  for (const pat of dentalPatients.slice(0, 10)) {
    implCounter++;
    const place = new Date(today);
    place.setDate(place.getDate() - rand(30, 365));
    const status = pick(["placed", "osseointegrating", "osseointegrating", "restored", "maintained", "failed"]);
    const abutment = ["restored", "maintained"].includes(status) ? new Date(place.getTime() + rand(90, 180) * 86400000) : null;
    const crown = status === "restored" || status === "maintained" ? new Date(place.getTime() + rand(150, 240) * 86400000) : null;
    await db.implantCase.create({
      data: {
        caseNo: `IMP-${String(implCounter).padStart(5, "0")}`,
        patientId: pat.id,
        doctorId: pick(doctors).id,
        toothNumber: pick(["16", "36", "46", "11", "26", "14"]),
        site: pick(["Upper posterior", "Lower posterior", "Upper anterior", "Lower anterior"]),
        implantBrand: pick(["Straumann", "Nobel Biocare", "Osstem", "Dentium", "BioHorizons", "MIS"]),
        implantSize: pick(["3.3 x 10mm", "3.5 x 11mm", "4.0 x 10mm", "4.3 x 12mm", "4.8 x 10mm"]),
        placementDate: place,
        boneGraft: Math.random() > 0.5,
        graftMaterial: Math.random() > 0.5 ? pick(["Bio-Oss", "Autogenous", "AlloDerm", "Synthetic HA"]) : null,
        sinusLift: Math.random() > 0.7,
        healingAbutment: Math.random() > 0.4,
        abutmentDate: abutment,
        finalCrownDate: crown,
        followUpNotes: pick([
          "Uneventful healing. Osseointegration progressing well.",
          "Stable implant. No signs of peri-implantitis.",
          "Crown cemented. Occlusion verified.",
          "Patient reports discomfort — review in 1 week.",
          "Mobile implant — failed. To be explanted.",
        ]),
        status,
        cost: pick([65000, 75000, 85000, 95000, 120000]),
      },
    });
  }

  // 12. Follow-ups
  let folCounter = 0;
  for (const pat of dentalPatients) {
    const n = rand(1, 3);
    for (let i = 0; i < n; i++) {
      folCounter++;
      const sched = new Date(today);
      sched.setDate(sched.getDate() + rand(-20, 45));
      const isPast = sched < today;
      const status = isPast ? pick(["completed", "completed", "no_show", "cancelled"]) : "scheduled";
      await db.dentalFollowup.create({
        data: {
          followupNo: `DFU-${String(folCounter).padStart(5, "0")}`,
          patientId: pat.id,
          doctorId: pick(doctors).id,
          type: pick(["recall", "procedure_review", "healing_assessment", "ortho_adjustment", "implant_check"]),
          scheduledDate: sched,
          completedDate: status === "completed" ? sched : null,
          notes: pick([
            "Routine recall for scaling",
            "Review healing after extraction",
            "Wire change — ortho adjustment",
            "Implant stability check",
            "Suture removal",
            "Crown cementation review",
          ]),
          status,
          reminderSent: !isPast && Math.random() > 0.5,
        },
      });
    }
  }

  // 13. Audit logs for dental module
  const dentalActions = [
    { action: "CREATE", detail: "New dental examination recorded" },
    { action: "CREATE", detail: "Odontogram updated for patient" },
    { action: "UPDATE", detail: "Treatment plan approved" },
    { action: "CREATE", detail: "Dental procedure completed — invoice generated" },
    { action: "CREATE", detail: "Dental lab order placed" },
    { action: "UPDATE", detail: "Orthodontic case progressed — wire changed" },
    { action: "CREATE", detail: "Implant case registered" },
    { action: "CREATE", detail: "Follow-up scheduled — reminder sent" },
  ];
  for (let i = 0; i < 25; i++) {
    const a = pick(dentalActions);
    const date = new Date(today);
    date.setHours(date.getHours() - rand(0, 168));
    await db.auditLog.create({
      data: {
        user: pick(doctors).email || "dental@carelim.health",
        action: a.action,
        module: "Dental",
        detail: a.detail,
        ip: `192.168.1.${rand(2, 200)}`,
        createdAt: date,
      },
    });
  }

  console.log("Dental module seed complete:", {
    examinations: examCounter,
    odontograms: odoCounter,
    treatmentPlans: planCounter,
    procedures: procCounter,
    images: imgCounter,
    labOrders: labCounter,
    orthoCases: orthoCounter,
    implantCases: implCounter,
    followups: folCounter,
  });
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
