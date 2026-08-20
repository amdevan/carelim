import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
async function main() {
  console.log("Seeding IVF data...");
  await db.pregnancyFollowup.deleteMany(); await db.embryoTransfer.deleteMany();
  await db.embryo.deleteMany(); await db.eggRetrieval.deleteMany();
  await db.semenProcessing.deleteMany(); await db.follicularMonitoring.deleteMany();
  await db.iVFCycle.deleteMany(); await db.fertilityAssessment.deleteMany();
  await db.treatmentProtocol.deleteMany(); await db.donorProfile.deleteMany();
  await db.iVFConsent.deleteMany(); await db.iVFPackage.deleteMany(); await db.cryobankStorage.deleteMany();

  const protocols = [
    { name: "Antagonist Protocol", code: "ANT", type: "antagonist", duration: 12, description: "Standard antagonist protocol with GnRH antagonist" },
    { name: "Long Agonist Protocol", code: "AGN", type: "agonist", duration: 21, description: "Long down-regulation with GnRH agonist" },
    { name: "Natural Cycle", code: "NAT", type: "natural", duration: 14, description: "Minimal stimulation natural cycle" },
    { name: "Mild Stimulation", code: "MLD", type: "mild", duration: 10, description: "Reduced dose mild stimulation" },
  ];
  for (const p of protocols) await db.treatmentProtocol.create({ data: p });

  const packages = [
    { name: "IVF Basic Package", code: "IVF-BASIC", description: "1 IVF cycle + monitoring + transfer", totalCost: 250000 },
    { name: "IVF + ICSI Package", code: "IVF-ICSI", description: "1 IVF cycle with ICSI", totalCost: 300000 },
    { name: "IVF + Frozen Transfer", code: "IVF-FZT", description: "1 fresh + 1 frozen embryo transfer", totalCost: 350000 },
    { name: "Donor IVF Package", code: "IVF-DON", description: "IVF with donor eggs/sperm", totalCost: 400000 },
  ];
  for (const p of packages) await db.iVFPackage.create({ data: p });

  const patients = await db.patient.findMany({ take: 15 });
  const doctors = await db.doctor.findMany();
  const today = new Date();
  const statuses = ["planned", "stimulation", "monitoring", "opu", "transfer", "wait", "pregnant", "failed", "cancelled"];

  for (let i = 0; i < 20; i++) {
    const pat = pick(patients);
    const doc = pick(doctors);
    const status = pick(statuses);
    const startDate = new Date(today); startDate.setDate(startDate.getDate() - rand(10, 120));
    const cycle = await db.iVFCycle.create({
      data: {
        cycleNo: `IVF-${String(i + 1).padStart(5, "0")}`,
        patientId: pat.id, doctorId: doc.id, cycleNumber: rand(1, 3), status,
        startDate, protocolId: pick(protocols).id ? undefined : undefined,
        stimulationStart: ["stimulation","monitoring","opu","transfer","wait","pregnant","failed"].includes(status) ? new Date(startDate.getTime() + 3 * 86400000) : null,
        stimulationEnd: ["monitoring","opu","transfer","wait","pregnant","failed"].includes(status) ? new Date(startDate.getTime() + 12 * 86400000) : null,
        opuDate: ["opu","transfer","wait","pregnant","failed"].includes(status) ? new Date(startDate.getTime() + 14 * 86400000) : null,
        transferDate: ["transfer","wait","pregnant","failed"].includes(status) ? new Date(startDate.getTime() + 19 * 86400000) : null,
        pregnancyTestDate: ["wait","pregnant","failed"].includes(status) ? new Date(startDate.getTime() + 33 * 86400000) : null,
        pregnancyResult: status === "pregnant" ? "positive" : status === "failed" ? "negative" : null,
        totalCost: pick([250000, 300000, 350000, 400000]),
        paidAmount: pick([250000, 300000, 350000, 400000]) * (Math.random() > 0.3 ? 1 : 0.5),
        notes: pick(["Primary infertility", "Secondary infertility", "Male factor", "Tubal factor", "PCOS", "Unexplained"]),
      }
    });

    if (["monitoring","opu","transfer","wait","pregnant","failed"].includes(status)) {
      for (let d = 1; d <= rand(3, 8); d++) {
        await db.follicularMonitoring.create({
          data: {
            cycleId: cycle.id, day: d,
            monitoringDate: new Date(startDate.getTime() + (d + 2) * 86400000),
            endometrium: randFloat(6, 12), e2: rand(200, 3000), lh: rand(2, 20), p4: randFloat(0.5, 3),
            notes: `Day ${d} monitoring`, doctorId: doc.id,
          }
        });
      }
    }
    if (["opu","transfer","wait","pregnant","failed"].includes(status)) {
      const oocytes = rand(5, 20);
      await db.eggRetrieval.create({ data: { cycleId: cycle.id, opuDate: cycle.opuDate || new Date(), folliclesPunctured: rand(5, 20), oocytesRetrieved: oocytes, matureOocytes: Math.round(oocytes * 0.7), immatureOocytes: Math.round(oocytes * 0.2), atreticOocytes: Math.round(oocytes * 0.1), embryologist: pick(["Dr. Maya", "Dr. Sita"]), doctorId: doc.id } });
      for (let e = 1; e <= rand(2, 8); e++) {
        await db.embryo.create({ data: { cycleId: cycle.id, embryoNo: e, day: pick([3, 5]), cellCount: pick([6, 8, 10]), grade: pick(["1AA", "2AB", "3BB", "1BA", "2AA"]), quality: pick(["excellent", "good", "fair"]), status: e === 1 && ["transfer","wait","pregnant","failed"].includes(status) ? "transferred" : pick(["frozen", "cultured", "discarded"]) } });
      }
    }
    if (["transfer","wait","pregnant","failed"].includes(status)) {
      await db.embryoTransfer.create({ data: { cycleId: cycle.id, transferDate: cycle.transferDate || new Date(), transferType: pick(["fresh", "frozen"]), embryosTransferred: rand(1, 2), doctorId: doc.id, difficulty: pick(["easy", "moderate"]) } });
    }
    if (["wait","pregnant","failed"].includes(status)) {
      await db.pregnancyFollowup.create({ data: { cycleId: cycle.id, testDate: cycle.pregnancyTestDate || new Date(), betaHcg: status === "pregnant" ? rand(100, 5000) : rand(0, 5), result: status === "pregnant" ? "positive" : "negative", sacVisible: status === "pregnant", heartbeat: status === "pregnant" && Math.random() > 0.3, fetalCount: status === "pregnant" ? rand(1, 2) : 0, gestationalAge: status === "pregnant" ? rand(4, 12) : 0, status: status === "pregnant" ? "ongoing" : "miscarried" } });
    }
  }

  for (let i = 0; i < 6; i++) {
    await db.donorProfile.create({ data: { donorCode: `DON-${String(i + 1).padStart(3, "0")}`, type: pick(["egg", "sperm"]), anonymous: Math.random() > 0.3, age: rand(22, 35), bloodGroup: pick(["A+", "B+", "O+", "AB+"]), height: randFloat(150, 175), weight: randFloat(45, 70), education: pick(["Bachelor's", "Master's", "PhD"]), screeningStatus: pick(["cleared", "cleared", "pending"]), status: "active" } });
  }
  for (let i = 0; i < 8; i++) {
    await db.iVFConsent.create({ data: { consentNo: `CON-${String(i + 1).padStart(5, "0")}`, patientId: pick(patients).id, type: pick(["ivf_treatment", "icsi", "embryo_freezing", "donor"]), title: pick(["IVF Treatment Consent", "ICSI Consent", "Embryo Freezing Consent", "Donor Consent"]), status: pick(["signed", "pending", "signed"]), signedDate: Math.random() > 0.5 ? new Date() : null, signedBy: "Patient" } });
  }
  for (let i = 0; i < 10; i++) {
    await db.cryobankStorage.create({ data: { barcode: `CRYO-${String(i + 1).padStart(5, "0")}`, type: pick(["embryo", "oocyte", "sperm"]), tankNumber: `Tank-${pick(["A", "B", "C"])}`, canisterPosition: String(rand(1, 6)), canePosition: String(rand(1, 4)), freezeDate: new Date(today.getTime() - rand(0, 200) * 86400000), status: pick(["stored", "stored", "thawed"]), quantity: rand(1, 5) } });
  }
  for (let i = 0; i < 10; i++) {
    await db.fertilityAssessment.create({ data: { patientId: pick(patients).id, amh: randFloat(0.5, 5), fsh: randFloat(3, 15), lh: randFloat(2, 10), e2: randFloat(20, 80), afc: rand(3, 15), bmi: randFloat(18, 32), prognosis: pick(["good", "fair", "poor"]), doctorId: pick(doctors).id, diagnosis: pick(["PCOS", "Male factor", "Tubal factor", "Unexplained", "Endometriosis"]) } });
  }
  function randFloat(min: number, max: number) { return Math.round((Math.random() * (max - min) + min) * 100) / 100; }
  console.log("IVF seed complete");
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
