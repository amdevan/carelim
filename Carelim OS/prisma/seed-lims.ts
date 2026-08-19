import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 100) / 100;

async function main() {
  console.log("Seeding LIMS data...");

  // Clean LIMS tables
  await db.labResultParameter.deleteMany();
  await db.labResult.deleteMany();
  await db.labSampleTracking.deleteMany();
  await db.labSample.deleteMany();
  await db.labOrderItem.deleteMany();
  await db.labOrder.deleteMany();
  await db.labPackageTest.deleteMany();
  await db.labPackage.deleteMany();
  await db.labReferenceRange.deleteMany();
  await db.labTestParameter.deleteMany();
  await db.labTestMaster.deleteMany();
  await db.labQualityControl.deleteMany();
  await db.labEquipment.deleteMany();
  await db.labInventory.deleteMany();
  await db.labSupplier.deleteMany();
  await db.labDepartment.deleteMany();

  // Lab Departments
  const deptDefs = [
    { name: "Hematology", code: "HEM", color: "#0d9488", headTechnician: "Sita Sharma" },
    { name: "Biochemistry", code: "BIO", color: "#0891b2", headTechnician: "Rohan Thapa" },
    { name: "Microbiology", code: "MIC", color: "#16a34a", headTechnician: "Kiran Gurung" },
    { name: "Immunology", code: "IMM", color: "#d97706", headTechnician: "Anjali Shrestha" },
    { name: "Serology", code: "SER", color: "#db2777", headTechnician: "Dipesh Karki" },
    { name: "Histopathology", code: "HIS", color: "#7c3aed", headTechnician: "Maya Bhandari" },
    { name: "Cytology", code: "CYT", color: "#ca8a04", headTechnician: "Niraj Poudel" },
    { name: "Molecular Biology", code: "MOL", color: "#dc2626", headTechnician: "Suman Dahal" },
    { name: "Hormone Testing", code: "HOR", color: "#0d9488", headTechnician: "Pooja Magar" },
    { name: "Clinical Pathology", code: "CPT", color: "#0891b2", headTechnician: "Manish Acharya" },
  ];
  const departments = [];
  for (const d of deptDefs) {
    departments.push(await db.labDepartment.create({ data: { ...d, description: `${d.name} department`, isActive: true } }));
  }
  const deptByCode: Record<string, typeof departments[0]> = {};
  departments.forEach(d => { deptByCode[d.code] = d; });

  // Test Masters with parameters and reference ranges
  const testDefs: {
    name: string; code: string; category: string; deptCode: string; sampleType: string; container: string; volume: string; tat: string; price: number;
    parameters: { name: string; unit: string; type: string; ranges: { gender: string; low: string; high: string; critLow?: string; critHigh?: string }[] }[];
  }[] = [
    {
      name: "Complete Blood Count (CBC)", code: "CBC", category: "Hematology", deptCode: "HEM",
      sampleType: "Blood", container: "EDTA Tube", volume: "3 ml", tat: "2 hours", price: 450,
      parameters: [
        { name: "Hemoglobin", unit: "g/dL", type: "numeric", ranges: [{ gender: "male", low: "13", high: "17", critLow: "7", critHigh: "20" }, { gender: "female", low: "12", high: "15", critLow: "6", critHigh: "18" }] },
        { name: "RBC Count", unit: "x10^6/μL", type: "numeric", ranges: [{ gender: "male", low: "4.5", high: "5.9" }, { gender: "female", low: "4.0", high: "5.2" }] },
        { name: "WBC Count", unit: "x10^3/μL", type: "numeric", ranges: [{ gender: "all", low: "4.0", high: "11.0", critLow: "2.0", critHigh: "30.0" }] },
        { name: "Platelet Count", unit: "x10^3/μL", type: "numeric", ranges: [{ gender: "all", low: "150", high: "450", critLow: "50", critHigh: "800" }] },
        { name: "Hematocrit (PCV)", unit: "%", type: "numeric", ranges: [{ gender: "male", low: "40", high: "52" }, { gender: "female", low: "36", high: "48" }] },
        { name: "MCV", unit: "fL", type: "numeric", ranges: [{ gender: "all", low: "80", high: "100" }] },
        { name: "MCH", unit: "pg", type: "numeric", ranges: [{ gender: "all", low: "27", high: "33" }] },
        { name: "MCHC", unit: "g/dL", type: "numeric", ranges: [{ gender: "all", low: "32", high: "36" }] },
      ]
    },
    {
      name: "Blood Glucose (Fasting)", code: "FBS", category: "Biochemistry", deptCode: "BIO",
      sampleType: "Blood", container: "Fluoride Tube", volume: "2 ml", tat: "1 hour", price: 200,
      parameters: [
        { name: "Glucose (Fasting)", unit: "mg/dL", type: "numeric", ranges: [{ gender: "all", low: "70", high: "100", critLow: "40", critHigh: "400" }] },
      ]
    },
    {
      name: "Blood Glucose (Post Prandial)", code: "PPBS", category: "Biochemistry", deptCode: "BIO",
      sampleType: "Blood", container: "Fluoride Tube", volume: "2 ml", tat: "1 hour", price: 200,
      parameters: [{ name: "Glucose (PP)", unit: "mg/dL", type: "numeric", ranges: [{ gender: "all", low: "100", high: "140" }] }]
    },
    {
      name: "Lipid Profile", code: "LIP", category: "Biochemistry", deptCode: "BIO",
      sampleType: "Blood", container: "Plain Tube", volume: "3 ml", tat: "3 hours", price: 800,
      parameters: [
        { name: "Total Cholesterol", unit: "mg/dL", type: "numeric", ranges: [{ gender: "all", low: "<200", high: "240" }] },
        { name: "Triglycerides", unit: "mg/dL", type: "numeric", ranges: [{ gender: "all", low: "<150", high: "200" }] },
        { name: "HDL Cholesterol", unit: "mg/dL", type: "numeric", ranges: [{ gender: "male", low: "40", high: "60" }, { gender: "female", low: "50", high: "60" }] },
        { name: "LDL Cholesterol", unit: "mg/dL", type: "numeric", ranges: [{ gender: "all", low: "<100", high: "160" }] },
        { name: "VLDL Cholesterol", unit: "mg/dL", type: "numeric", ranges: [{ gender: "all", low: "<30", high: "40" }] },
      ]
    },
    {
      name: "Liver Function Test (LFT)", code: "LFT", category: "Biochemistry", deptCode: "BIO",
      sampleType: "Blood", container: "Plain Tube", volume: "3 ml", tat: "3 hours", price: 1200,
      parameters: [
        { name: "Total Bilirubin", unit: "mg/dL", type: "numeric", ranges: [{ gender: "all", low: "0.2", high: "1.2" }] },
        { name: "Direct Bilirubin", unit: "mg/dL", type: "numeric", ranges: [{ gender: "all", low: "0.0", high: "0.4" }] },
        { name: "SGPT (ALT)", unit: "U/L", type: "numeric", ranges: [{ gender: "all", low: "7", high: "56" }] },
        { name: "SGOT (AST)", unit: "U/L", type: "numeric", ranges: [{ gender: "all", low: "10", high: "40" }] },
        { name: "Alkaline Phosphatase", unit: "U/L", type: "numeric", ranges: [{ gender: "all", low: "44", high: "147" }] },
        { name: "Total Protein", unit: "g/dL", type: "numeric", ranges: [{ gender: "all", low: "6.0", high: "8.3" }] },
        { name: "Albumin", unit: "g/dL", type: "numeric", ranges: [{ gender: "all", low: "3.5", high: "5.0" }] },
      ]
    },
    {
      name: "Kidney Function Test (KFT)", code: "KFT", category: "Biochemistry", deptCode: "BIO",
      sampleType: "Blood", container: "Plain Tube", volume: "3 ml", tat: "3 hours", price: 1000,
      parameters: [
        { name: "Urea", unit: "mg/dL", type: "numeric", ranges: [{ gender: "all", low: "15", high: "40" }] },
        { name: "Creatinine", unit: "mg/dL", type: "numeric", ranges: [{ gender: "male", low: "0.7", high: "1.3" }, { gender: "female", low: "0.6", high: "1.1" }] },
        { name: "Uric Acid", unit: "mg/dL", type: "numeric", ranges: [{ gender: "male", low: "3.4", high: "7.0" }, { gender: "female", low: "2.4", high: "6.0" }] },
        { name: "Sodium", unit: "mmol/L", type: "numeric", ranges: [{ gender: "all", low: "135", high: "145", critLow: "120", critHigh: "160" }] },
        { name: "Potassium", unit: "mmol/L", type: "numeric", ranges: [{ gender: "all", low: "3.5", high: "5.1", critLow: "2.5", critHigh: "7.0" }] },
      ]
    },
    {
      name: "Thyroid Profile (T3, T4, TSH)", code: "TFT", category: "Hormone Testing", deptCode: "HOR",
      sampleType: "Blood", container: "Plain Tube", volume: "3 ml", tat: "4 hours", price: 900,
      parameters: [
        { name: "T3", unit: "ng/dL", type: "numeric", ranges: [{ gender: "all", low: "80", high: "200" }] },
        { name: "T4", unit: "μg/dL", type: "numeric", ranges: [{ gender: "all", low: "5.0", high: "12.0" }] },
        { name: "TSH", unit: "mIU/L", type: "numeric", ranges: [{ gender: "all", low: "0.4", high: "4.0", critLow: "0.1", critHigh: "20.0" }] },
      ]
    },
    {
      name: "HbA1c (Glycosylated Hemoglobin)", code: "HBA1C", category: "Biochemistry", deptCode: "BIO",
      sampleType: "Blood", container: "EDTA Tube", volume: "2 ml", tat: "2 hours", price: 700,
      parameters: [{ name: "HbA1c", unit: "%", type: "numeric", ranges: [{ gender: "all", low: "4.0", high: "5.6" }] }]
    },
    {
      name: "Urine Routine Examination", code: "URINE", category: "Clinical Pathology", deptCode: "CPT",
      sampleType: "Urine", container: "Container", volume: "20 ml", tat: "1 hour", price: 150,
      parameters: [
        { name: "Color", unit: "", type: "text", ranges: [{ gender: "all", low: "", high: "" }] },
        { name: "Appearance", unit: "", type: "text", ranges: [{ gender: "all", low: "", high: "" }] },
        { name: "pH", unit: "", type: "numeric", ranges: [{ gender: "all", low: "5.0", high: "8.0" }] },
        { name: "Specific Gravity", unit: "", type: "numeric", ranges: [{ gender: "all", low: "1.005", high: "1.030" }] },
        { name: "Protein", unit: "", type: "text", ranges: [{ gender: "all", low: "", high: "" }] },
        { name: "Glucose", unit: "", type: "text", ranges: [{ gender: "all", low: "", high: "" }] },
        { name: "Pus Cells", unit: "/hpf", type: "text", ranges: [{ gender: "all", low: "", high: "" }] },
        { name: "RBC", unit: "/hpf", type: "text", ranges: [{ gender: "all", low: "", high: "" }] },
      ]
    },
    {
      name: "ESR (Erythrocyte Sedimentation Rate)", code: "ESR", category: "Hematology", deptCode: "HEM",
      sampleType: "Blood", container: "Citrate Tube", volume: "2 ml", tat: "1 hour", price: 250,
      parameters: [{ name: "ESR (Westergren)", unit: "mm/hr", type: "numeric", ranges: [{ gender: "all", low: "0", high: "20" }] }]
    },
    {
      name: "Dengue NS1 Antigen", code: "DENGUE", category: "Serology", deptCode: "SER",
      sampleType: "Blood", container: "Plain Tube", volume: "2 ml", tat: "2 hours", price: 600,
      parameters: [{ name: "Dengue NS1 Antigen", unit: "", type: "positive-negative", ranges: [{ gender: "all", low: "", high: "" }] }]
    },
    {
      name: "Widal Test", code: "WIDAL", category: "Serology", deptCode: "SER",
      sampleType: "Blood", container: "Plain Tube", volume: "2 ml", tat: "2 hours", price: 400,
      parameters: [{ name: "Widal (S. typhi O)", unit: "titer", type: "text", ranges: [{ gender: "all", low: "", high: "" }] }]
    },
    {
      name: "Blood Group (ABO + Rh)", code: "BG", category: "Hematology", deptCode: "HEM",
      sampleType: "Blood", container: "EDTA Tube", volume: "1 ml", tat: "30 min", price: 200,
      parameters: [{ name: "Blood Group", unit: "", type: "dropdown", ranges: [{ gender: "all", low: "", high: "" }] }]
    },
    {
      name: "Vitamin D (25-OH)", code: "VITD", category: "Biochemistry", deptCode: "BIO",
      sampleType: "Blood", container: "Plain Tube", volume: "3 ml", tat: "6 hours", price: 1500,
      parameters: [{ name: "Vitamin D", unit: "ng/mL", type: "numeric", ranges: [{ gender: "all", low: "30", high: "100" }] }]
    },
    {
      name: "Vitamin B12", code: "VITB12", category: "Biochemistry", deptCode: "BIO",
      sampleType: "Blood", container: "Plain Tube", volume: "3 ml", tat: "6 hours", price: 1200,
      parameters: [{ name: "Vitamin B12", unit: "pg/mL", type: "numeric", ranges: [{ gender: "all", low: "200", high: "900" }] }]
    },
    {
      name: "Troponin I (Quantitative)", code: "TROP", category: "Biochemistry", deptCode: "BIO",
      sampleType: "Blood", container: "Heparin Tube", volume: "2 ml", tat: "1 hour", price: 1000,
      parameters: [{ name: "Troponin I", unit: "ng/mL", type: "numeric", ranges: [{ gender: "all", low: "0", high: "0.04", critLow: "", critHigh: "0.4" }] }]
    },
    {
      name: "PT (Prothrombin Time) / INR", code: "PT", category: "Hematology", deptCode: "HEM",
      sampleType: "Blood", container: "Citrate Tube", volume: "2 ml", tat: "1 hour", price: 350,
      parameters: [
        { name: "PT (Patient)", unit: "sec", type: "numeric", ranges: [{ gender: "all", low: "11", high: "14" }] },
        { name: "INR", unit: "", type: "numeric", ranges: [{ gender: "all", low: "0.8", high: "1.2" }] },
      ]
    },
    {
      name: "Stool Routine Examination", code: "STOOL", category: "Clinical Pathology", deptCode: "CPT",
      sampleType: "Stool", container: "Container", volume: "10 g", tat: "1 hour", price: 200,
      parameters: [{ name: "Stool Routine", unit: "", type: "text", ranges: [{ gender: "all", low: "", high: "" }] }]
    },
    {
      name: "CRP (C-Reactive Protein)", code: "CRP", category: "Immunology", deptCode: "IMM",
      sampleType: "Blood", container: "Plain Tube", volume: "2 ml", tat: "2 hours", price: 500,
      parameters: [{ name: "CRP (Quantitative)", unit: "mg/L", type: "numeric", ranges: [{ gender: "all", low: "0", high: "6" }] }]
    },
    {
      name: "Hepatitis B Surface Antigen (HBsAg)", code: "HBSAG", category: "Serology", deptCode: "SER",
      sampleType: "Blood", container: "Plain Tube", volume: "2 ml", tat: "2 hours", price: 500,
      parameters: [{ name: "HBsAg", unit: "", type: "reactive", ranges: [{ gender: "all", low: "", high: "" }] }]
    },
    {
      name: "HIV 1 & 2 (ELISA)", code: "HIV", category: "Serology", deptCode: "SER",
      sampleType: "Blood", container: "Plain Tube", volume: "3 ml", tat: "3 hours", price: 600,
      parameters: [{ name: "HIV 1 & 2", unit: "", type: "reactive", ranges: [{ gender: "all", low: "", high: "" }] }]
    },
  ];

  const testMasters = [];
  for (const td of testDefs) {
    const dept = deptByCode[td.deptCode];
    const test = await db.labTestMaster.create({
      data: {
        name: td.name,
        code: td.code,
        category: td.category,
        departmentId: dept?.id,
        sampleType: td.sampleType,
        containerType: td.container,
        volumeRequired: td.volume,
        turnaroundTime: td.tat,
        price: td.price,
        taxRate: 0,
        discountAllowed: true,
        status: "active",
        isPackage: false,
      },
    });
    for (let i = 0; i < td.parameters.length; i++) {
      const pd = td.parameters[i];
      const param = await db.labTestParameter.create({
        data: {
          testId: test.id,
          name: pd.name,
          unit: pd.unit,
          resultType: pd.type,
          displayOrder: i + 1,
          options: pd.type === "dropdown" ? "A+,A-,B+,B-,O+,O-,AB+,AB-" : null,
        },
      });
      for (const rg of pd.ranges) {
        await db.labReferenceRange.create({
          data: {
            parameterId: param.id,
            gender: rg.gender,
            ageMin: 0,
            ageMax: 120,
            lowNormal: rg.low || null,
            highNormal: rg.high || null,
            criticalLow: rg.critLow || null,
            criticalHigh: rg.critHigh || null,
            textNormal: pd.type === "positive-negative" ? "Negative" : pd.type === "reactive" ? "Non Reactive" : null,
          },
        });
      }
    }
    testMasters.push(test);
  }

  // Packages
  const pkgDefs = [
    { name: "Basic Health Checkup", code: "PKG-BASIC", price: 2500, discountPct: 10, tests: ["CBC", "FBS", "URINE", "BG"] },
    { name: "Diabetes Panel", code: "PKG-DIA", price: 1800, discountPct: 5, tests: ["FBS", "PPBS", "HBA1C", "URINE"] },
    { name: "Cardiac Risk Profile", code: "PKG-CARD", price: 3500, discountPct: 10, tests: ["LIP", "TROP", "CRP", "CBC"] },
    { name: "Liver Health Package", code: "PKG-LIV", price: 2200, discountPct: 5, tests: ["LFT", "CBC", "URINE"] },
    { name: "Kidney Health Package", code: "PKG-KID", price: 2000, discountPct: 5, tests: ["KFT", "CBC", "URINE"] },
    { name: "Thyroid Care Package", code: "PKG-THY", price: 1500, discountPct: 10, tests: ["TFT"] },
    { name: "Fever Profile", code: "PKG-FEV", price: 1800, discountPct: 5, tests: ["CBC", "DENGUE", "WIDAL", "URINE"] },
    { name: "Vitamin Profile", code: "PKG-VIT", price: 3000, discountPct: 10, tests: ["VITD", "VITB12", "CBC"] },
    { name: "Pre-Operative Profile", code: "PKG-PRE", price: 2200, discountPct: 5, tests: ["CBC", "BG", "PT", "URINE", "HBSAG", "HIV"] },
    { name: "Annual Master Health Checkup", code: "PKG-MASTER", price: 5500, discountPct: 15, tests: ["CBC", "FBS", "LIP", "LFT", "KFT", "TFT", "URINE", "VITD", "CRP"] },
  ];
  for (const pk of pkgDefs) {
    const pkg = await db.labPackage.create({ data: { name: pk.name, code: pk.code, description: pk.name, price: pk.price, discountPct: pk.discountPct, status: "active" } });
    for (const tc of pk.tests) {
      const t = testMasters.find(tm => tm.code === tc);
      if (t) await db.labPackageTest.create({ data: { packageId: pkg.id, testId: t.id } });
    }
  }

  // Suppliers
  const supplierDefs = [
    { name: "Sigma Aldrich Nepal", contact: "Ramesh", phone: "01-4XXXX11", email: "sales@sigma-np.com", address: "Kathmandu" },
    { name: "LabTech Supplies", contact: "Suresh", phone: "01-4XXXX22", email: "info@labtech.com", address: "Lalitpur" },
    { name: "MediReagents Pvt Ltd", contact: "Geeta", phone: "01-4XXXX33", email: "orders@medireagents.com", address: "Birgunj" },
    { name: "BioRad Distributors", contact: "Hari", phone: "01-4XXXX44", email: "np@biorad.com", address: "Kathmandu" },
  ];
  const suppliers = [];
  for (const s of supplierDefs) {
    suppliers.push(await db.labSupplier.create({ data: s }));
  }

  // Equipment
  const equipDefs = [
    { name: "Sysmex XN-1000 Hematology Analyzer", serial: "SYS-XN1000-001", type: "analyzer", manufacturer: "Sysmex", model: "XN-1000", deptCode: "HEM" },
    { name: "Beckman Coulter AU480", serial: "BC-AU480-002", type: "analyzer", manufacturer: "Beckman Coulter", model: "AU480", deptCode: "BIO" },
    { name: "Olympus CX23 Microscope", serial: "OLY-CX23-003", type: "microscope", manufacturer: "Olympus", model: "CX23", deptCode: "HIS" },
    { name: "Hettich EBA 200 Centrifuge", serial: "HET-EBA200-004", type: "centrifuge", manufacturer: "Hettich", model: "EBA 200", deptCode: "HEM" },
    { name: "Roche Cobas e411", serial: "ROC-E411-005", type: "analyzer", manufacturer: "Roche", model: "Cobas e411", deptCode: "HOR" },
    { name: "Mindray BC-30s", serial: "MDR-BC30S-006", type: "analyzer", manufacturer: "Mindray", model: "BC-30s", deptCode: "HEM" },
    { name: "Bio-Rad D-10", serial: "BRD-D10-007", type: "analyzer", manufacturer: "Bio-Rad", model: "D-10", deptCode: "BIO" },
    { name: "Nikon Eclipse Ni", serial: "NKN-ECLNI-008", type: "microscope", manufacturer: "Nikon", model: "Eclipse Ni", deptCode: "CYT" },
  ];
  for (const e of equipDefs) {
    const dept = deptByCode[e.deptCode];
    const purchaseDate = new Date(rand(2018, 2023), rand(0, 11), rand(1, 28));
    const lastCal = new Date();
    lastCal.setMonth(lastCal.getMonth() - rand(1, 6));
    const nextCal = new Date(lastCal);
    nextCal.setMonth(nextCal.getMonth() + 6);
    const warranty = new Date(purchaseDate);
    warranty.setFullYear(warranty.getFullYear() + 5);
    await db.labEquipment.create({
      data: {
        name: e.name,
        serialNumber: e.serial,
        type: e.type,
        manufacturer: e.manufacturer,
        model: e.model,
        departmentId: dept?.id,
        purchaseDate,
        warrantyExpiry: warranty,
        lastCalibration: lastCal,
        nextCalibration: nextCal,
        maintenanceSchedule: "Every 6 months",
        status: Math.random() > 0.85 ? pick(["maintenance", "breakdown"]) : "operational",
      }
    });
  }

  // Lab Inventory (reagents, kits, consumables)
  const invDefs = [
    { name: "CBC Diluent (Sysmex)", type: "reagent", category: "Hematology", batch: "RE-2024-001", stockQty: 45, reorderLevel: 10, unit: "bottle", unitPrice: 2500 },
    { name: "Lyse Reagent", type: "reagent", category: "Hematology", batch: "RE-2024-002", stockQty: 8, reorderLevel: 10, unit: "bottle", unitPrice: 1800 },
    { name: "Biochemistry Reagent Kit", type: "kit", category: "Biochemistry", batch: "KIT-2024-003", stockQty: 30, reorderLevel: 15, unit: "kit", unitPrice: 5000 },
    { name: "Glucose Reagent", type: "reagent", category: "Biochemistry", batch: "RE-2024-004", stockQty: 60, reorderLevel: 20, unit: "bottle", unitPrice: 1200 },
    { name: "EDTA Tubes", type: "tube", category: "Consumables", batch: "TUB-2024-005", stockQty: 500, reorderLevel: 100, unit: "pcs", unitPrice: 15 },
    { name: "Plain Vacutainer Tubes", type: "tube", category: "Consumables", batch: "TUB-2024-006", stockQty: 80, reorderLevel: 100, unit: "pcs", unitPrice: 12 },
    { name: "Fluoride Tubes", type: "tube", category: "Consumables", batch: "TUB-2024-007", stockQty: 200, reorderLevel: 50, unit: "pcs", unitPrice: 14 },
    { name: "Microscope Slides", type: "slide", category: "Consumables", batch: "SLD-2024-008", stockQty: 1000, reorderLevel: 200, unit: "box", unitPrice: 200 },
    { name: "Dengue NS1 Rapid Kit", type: "kit", category: "Serology", batch: "KIT-2024-009", stockQty: 25, reorderLevel: 10, unit: "kit", unitPrice: 800 },
    { name: "HbA1c Reagent", type: "reagent", category: "Biochemistry", batch: "RE-2024-010", stockQty: 5, reorderLevel: 8, unit: "bottle", unitPrice: 3000 },
    { name: "TSH ELISA Kit", type: "kit", category: "Hormone", batch: "KIT-2024-011", stockQty: 18, reorderLevel: 5, unit: "kit", unitPrice: 4500 },
    { name: "Centrifuge Tubes", type: "consumable", category: "Consumables", batch: "CON-2024-012", stockQty: 300, reorderLevel: 50, unit: "pcs", unitPrice: 8 },
    { name: "Pipette Tips", type: "consumable", category: "Consumables", batch: "CON-2024-013", stockQty: 2000, reorderLevel: 500, unit: "box", unitPrice: 150 },
    { name: "Alcohol Swabs", type: "consumable", category: "Consumables", batch: "CON-2024-014", stockQty: 1500, reorderLevel: 200, unit: "box", unitPrice: 50 },
  ];
  for (const inv of invDefs) {
    const expiry = new Date(rand(2025, 2026), rand(0, 11), rand(1, 28));
    const { batch, ...rest } = inv;
    await db.labInventory.create({
      data: {
        ...rest,
        batchNo: batch,
        expiryDate: expiry,
        supplierId: pick(suppliers).id,
        location: pick(["Store Room A", "Cold Storage 1", "Rack B-3", "Lab Counter"]),
        status: inv.stockQty <= inv.reorderLevel ? "low-stock" : "active",
      }
    });
  }

  // Lab Orders — create orders linked to existing patients
  const patients = await db.patient.findMany({ take: 40 });
  const doctors = await db.doctor.findMany();
  const today = new Date();

  const collectors = ["Sita Sharma", "Rohan Thapa", "Kiran Gurung", "Anjali Shrestha"];
  const technicians = ["Maya Bhandari", "Dipesh Karki", "Niraj Poudel", "Suman Dahal"];

  for (let i = 0; i < 35; i++) {
    const pat = pick(patients);
    const doc = pick(doctors);
    const priority = pick(["normal", "normal", "normal", "urgent", "emergency"]);
    // pick 1-3 random tests for this order
    const numTests = rand(1, 3);
    const chosenTests = [];
    const usedCodes = new Set<string>();
    for (let t = 0; t < numTests; t++) {
      const tm = pick(testMasters);
      if (!usedCodes.has(tm.code)) { chosenTests.push(tm); usedCodes.add(tm.code); }
    }
    const totalAmount = chosenTests.reduce((s, t) => s + t.price, 0);
    const tax = Math.round(totalAmount * 0.13);
    const discount = Math.random() > 0.7 ? Math.round(totalAmount * 0.1) : 0;
    const netAmount = totalAmount - discount + tax;
    const paidAmount = Math.random() > 0.3 ? netAmount : Math.random() > 0.5 ? Math.round(netAmount * 0.5) : 0;

    const orderedAt = new Date(today);
    orderedAt.setHours(orderedAt.getHours() - rand(1, 72));

    const order = await db.labOrder.create({
      data: {
        orderNo: `LAB-ORD-${String(i + 1).padStart(5, "0")}`,
        patientId: pat.id,
        doctorId: doc.id,
        priority,
        clinicalNotes: pick(["Routine checkup", "Fever since 3 days", "Follow-up diabetes", "Pre-operative", "Annual health check", "Abdominal pain", "Fatigue and weakness"]),
        status: "ordered",
        totalAmount,
        discount,
        tax,
        netAmount,
        paidAmount,
        paymentStatus: paidAmount >= netAmount ? "paid" : paidAmount > 0 ? "partial" : "unpaid",
        barcode: `LAB${String(i + 1).padStart(6, "0")}`,
        orderedAt,
        items: {
          create: chosenTests.map(t => ({
            testId: t.id,
            price: t.price,
            status: "ordered",
            resultStatus: "pending",
          })),
        },
      },
      include: { items: true },
    });

    // Progress some orders through the workflow
    const age = (today.getTime() - orderedAt.getTime()) / 3600000; // hours
    let orderStatus = "ordered";
    let collectedAt: Date | null = null;
    let completedAt: Date | null = null;

    if (age > 1) {
      // Sample collected
      collectedAt = new Date(orderedAt.getTime() + 3600000);
      orderStatus = "collected";
      const collector = pick(collectors);
      for (const item of order.items) {
        const tm = testMasters.find(t => t.id === item.testId);
        const sample = await db.labSample.create({
          data: {
            sampleCode: `S-${String(i + 1).padStart(4, "0")}-${order.items.indexOf(item) + 1}`,
            orderId: order.id,
            testId: item.testId,
            sampleType: tm?.sampleType || "Blood",
            containerType: tm?.containerType || "EDTA Tube",
            barcode: `SMP${String(i + 1).padStart(5, "0")}${order.items.indexOf(item) + 1}`,
            qrCode: `QR-${order.id}-${item.testId}`,
            collectorName: collector,
            collectionTime: collectedAt,
            collectedAt: collectedAt.toISOString(),
            receivedAt: new Date(collectedAt.getTime() + 900000),
            status: "collected",
            location: pick(["Hematology Lab", "Biochemistry Lab", "Sample Reception"]),
          },
        });
        // tracking entries
        await db.labSampleTracking.create({ data: { sampleId: sample.id, status: "collected", location: "Sample Reception", handler: collector, timestamp: collectedAt } });
        await db.labSampleTracking.create({ data: { sampleId: sample.id, status: "received", location: sample.location || "Lab", handler: pick(technicians), timestamp: new Date(collectedAt.getTime() + 900000) } });
      }
    }

    if (age > 4) {
      // Processing / results entered
      orderStatus = "processing";
      for (const item of order.items) {
        const tm = testMasters.find(t => t.id === item.testId);
        if (!tm) continue;
        const result = await db.labResult.create({
          data: {
            orderId: order.id,
            testId: item.testId,
            testItemId: item.id,
            status: "entered",
            technicianName: pick(technicians),
            enteredAt: new Date(orderedAt.getTime() + 7200000),
          },
        });
        // enter parameter results
        const params = await db.labTestParameter.findMany({ where: { testId: tm.id }, include: { referenceRanges: true } });
        for (const param of params) {
          let value = "";
          let flag = "normal";
          if (param.resultType === "numeric") {
            const range = param.referenceRanges[0];
            if (range && range.lowNormal && range.highNormal) {
              const low = parseFloat(range.lowNormal.replace(/[<>]/g, ""));
              const high = parseFloat(range.highNormal.replace(/[<>]/g, ""));
              if (!isNaN(low) && !isNaN(high)) {
                // 70% normal, 20% high, 10% low
                const r = Math.random();
                if (r < 0.7) value = String(randFloat(low, high));
                else if (r < 0.9) { value = String(randFloat(high, high * 1.3)); flag = "high"; }
                else { value = String(randFloat(low * 0.7, low)); flag = "low"; }
                // 5% critical
                if (Math.random() < 0.05 && range.criticalHigh) { value = String(parseFloat(range.criticalHigh) + rand(1, 10)); flag = "critical"; }
              }
            }
          } else if (param.resultType === "positive-negative") {
            value = pick(["Positive", "Negative"]);
            flag = value === "Positive" ? "abnormal" : "normal";
          } else if (param.resultType === "reactive") {
            value = pick(["Reactive", "Non Reactive"]);
            flag = value === "Reactive" ? "abnormal" : "normal";
          } else if (param.resultType === "dropdown") {
            value = pick(["A+", "B+", "O+", "AB+"]);
          } else {
            value = pick(["Normal", "Within limits", "No abnormality", "Yellow, clear"]);
          }
          await db.labResultParameter.create({
            data: { resultId: result.id, parameterId: param.id, value, flag },
          });
        }
        await db.labOrderItem.update({ where: { id: item.id }, data: { status: "processing", resultStatus: "entered" } });
      }
    }

    if (age > 8) {
      // Approved / completed
      orderStatus = pick(["completed", "completed", "partial"]);
      completedAt = new Date(orderedAt.getTime() + 28800000);
      for (const item of order.items) {
        const approved = Math.random() > 0.3;
        await db.labOrderItem.update({
          where: { id: item.id },
          data: { status: approved ? "approved" : "completed", resultStatus: approved ? "approved" : "verified" },
        });
        await db.labResult.updateMany({
          where: { orderId: order.id, testId: item.testId },
          data: {
            status: approved ? "approved" : "verified",
            verifiedBy: approved ? undefined : "Dr. Pathologist",
            approvedBy: approved ? "Dr. Pathologist" : undefined,
            verifiedAt: approved ? undefined : new Date(orderedAt.getTime() + 10800000),
            approvedAt: approved ? new Date(orderedAt.getTime() + 14400000) : undefined,
          },
        });
      }
      if (orderStatus === "completed") {
        await db.labSample.updateMany({ where: { orderId: order.id }, data: { status: "completed" } });
      }
    }

    await db.labOrder.update({
      where: { id: order.id },
      data: {
        status: orderStatus,
        collectedAt,
        completedAt,
      },
    });
  }

  // QC records
  const qcNames = ["Normal Control", "High Control", "Low Control"];
  for (let i = 0; i < 15; i++) {
    const tm = pick(testMasters);
    const date = new Date(today);
    date.setDate(date.getDate() - rand(0, 10));
    await db.labQualityControl.create({
      data: {
        code: `QC-${String(i + 1).padStart(5, "0")}`,
        testId: tm.id,
        controlName: pick(qcNames),
        controlLevel: pick(["normal", "high", "low"]),
        expectedValue: String(randFloat(10, 50)),
        observedValue: String(randFloat(10, 50)),
        deviation: `${randFloat(0, 5)}%`,
        status: Math.random() > 0.85 ? pick(["warning", "fail"]) : "pass",
        performedBy: pick(technicians),
        performedAt: date,
        comments: pick(["Within acceptable limits", "Calibration verified", "Slight deviation noted", "Re-run recommended"]),
      }
    });
  }

  console.log("LIMS seed complete:", { departments: departments.length, testMasters: testMasters.length, packages: pkgDefs.length });
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
