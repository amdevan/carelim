import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 100) / 100;

async function main() {
  console.log("Seeding PMS (Pharmacy Management System) data...");

  // Clean PMS tables
  await db.salesReturn.deleteMany();
  await db.purchaseReturn.deleteMany();
  await db.pharmacySaleItem.deleteMany();
  await db.pharmacySale.deleteMany();
  await db.stockMovement.deleteMany();
  await db.gRN.deleteMany();
  await db.purchaseOrderItem.deleteMany();
  await db.purchaseOrder.deleteMany();
  await db.medicineBatch.deleteMany();
  await db.medicine.deleteMany();
  await db.supplier.deleteMany();

  // Suppliers
  const supplierDefs = [
    { name: "Nepal Pharma Distributors", contact: "Ramesh Thapa", phone: "01-4XXXX11", email: "sales@nepalpharma.com", address: "Putalisadak, Kathmandu", gstin: "PAN-NP-12345", drugLicense: "DL-KTM-001", paymentTerms: "30 days" },
    { name: "Himalayan Drug Co.", contact: "Sita Gurung", phone: "01-4XXXX22", email: "orders@himaldrug.com", address: "Baneshwor, Kathmandu", gstin: "PAN-NP-12346", drugLicense: "DL-KTM-002", paymentTerms: "15 days" },
    { name: "Cipla Nepal Pvt Ltd", contact: "Hari Shrestha", phone: "01-4XXXX33", email: "np@cipla.com", address: "Lalitpur", gstin: "PAN-NP-12347", drugLicense: "DL-LPT-001", paymentTerms: "45 days" },
    { name: "Sun Pharma Distributors", contact: "Gita Maharjan", phone: "01-4XXXX44", email: "sun@pharma.com", address: "Bhaktapur", gstin: "PAN-NP-12348", drugLicense: "DL-BKT-001", paymentTerms: "30 days" },
    { name: "Mankind Nepal", contact: "Kiran Bhandari", phone: "01-4XXXX55", email: "mankind@np.com", address: "Birgunj", gstin: "PAN-NP-12349", drugLicense: "DL-BRN-001", paymentTerms: "60 days" },
  ];
  const suppliers = [];
  for (const s of supplierDefs) {
    suppliers.push(await db.supplier.create({ data: s }));
  }

  // Medicines — comprehensive with all enterprise fields
  const medDefs = [
    { name: "Paracetamol 500mg", generic: "Paracetamol", strength: "500mg", form: "tablet", category: "Analgesic", class: "Analgesic", manufacturer: "Nepal Pharma", suppIdx: 0, price: 5, mrp: 10, sale: 8, coldChain: false, rx: false },
    { name: "Amoxicillin 500mg", generic: "Amoxicillin", strength: "500mg", form: "capsule", category: "Antibiotic", class: "Antibiotic", manufacturer: "Cipla", suppIdx: 2, price: 35, mrp: 60, sale: 50, coldChain: false, rx: true },
    { name: "Ibuprofen 400mg", generic: "Ibuprofen", strength: "400mg", form: "tablet", category: "NSAID", class: "NSAID", manufacturer: "Sun Pharma", suppIdx: 3, price: 12, mrp: 25, sale: 20, coldChain: false, rx: false },
    { name: "Cetirizine 10mg", generic: "Cetirizine", strength: "10mg", form: "tablet", category: "Antihistamine", class: "Antihistamine", manufacturer: "Mankind", suppIdx: 4, price: 8, mrp: 18, sale: 14, coldChain: false, rx: false },
    { name: "Omeprazole 20mg", generic: "Omeprazole", strength: "20mg", form: "capsule", category: "PPI", class: "Antacid", manufacturer: "Cipla", suppIdx: 2, price: 25, mrp: 50, sale: 40, coldChain: false, rx: true },
    { name: "Azithromycin 500mg", generic: "Azithromycin", strength: "500mg", form: "tablet", category: "Antibiotic", class: "Antibiotic", manufacturer: "Himalayan Drug", suppIdx: 1, price: 45, mrp: 90, sale: 75, coldChain: false, rx: true },
    { name: "Metformin 500mg", generic: "Metformin", strength: "500mg", form: "tablet", category: "Antidiabetic", class: "Antidiabetic", manufacturer: "Sun Pharma", suppIdx: 3, price: 15, mrp: 30, sale: 25, coldChain: false, rx: true },
    { name: "Amlodipine 5mg", generic: "Amlodipine", strength: "5mg", form: "tablet", category: "Antihypertensive", class: "Calcium Channel Blocker", manufacturer: "Cipla", suppIdx: 2, price: 18, mrp: 35, sale: 28, coldChain: false, rx: true },
    { name: "Ranitidine 150mg", generic: "Ranitidine", strength: "150mg", form: "tablet", category: "Antacid", class: "H2 Blocker", manufacturer: "Nepal Pharma", suppIdx: 0, price: 10, mrp: 20, sale: 16, coldChain: false, rx: false },
    { name: "Ciprofloxacin 500mg", generic: "Ciprofloxacin", strength: "500mg", form: "tablet", category: "Antibiotic", class: "Fluoroquinolone", manufacturer: "Himalayan Drug", suppIdx: 1, price: 30, mrp: 55, sale: 45, coldChain: false, rx: true },
    { name: "Diclofenac 50mg", generic: "Diclofenac", strength: "50mg", form: "tablet", category: "NSAID", class: "NSAID", manufacturer: "Mankind", suppIdx: 4, price: 12, mrp: 22, sale: 18, coldChain: false, rx: true },
    { name: "Pantoprazole 40mg", generic: "Pantoprazole", strength: "40mg", form: "tablet", category: "PPI", class: "Antacid", manufacturer: "Cipla", suppIdx: 2, price: 28, mrp: 55, sale: 45, coldChain: false, rx: true },
    { name: "Levocetirizine 5mg", generic: "Levocetirizine", strength: "5mg", form: "tablet", category: "Antihistamine", class: "Antihistamine", manufacturer: "Sun Pharma", suppIdx: 3, price: 15, mrp: 30, sale: 24, coldChain: false, rx: false },
    { name: "Vitamin C 500mg", generic: "Ascorbic Acid", strength: "500mg", form: "tablet", category: "Vitamin", class: "Supplement", manufacturer: "Mankind", suppIdx: 4, price: 8, mrp: 15, sale: 12, coldChain: false, rx: false },
    { name: "Calcium 500mg", generic: "Calcium Carbonate", strength: "500mg", form: "tablet", category: "Supplement", class: "Mineral", manufacturer: "Nepal Pharma", suppIdx: 0, price: 20, mrp: 40, sale: 32, coldChain: false, rx: false },
    { name: "Iron + Folic Acid", generic: "Ferrous Sulphate", strength: "325mg", form: "tablet", category: "Supplement", class: "Hematinic", manufacturer: "Himalayan Drug", suppIdx: 1, price: 15, mrp: 30, sale: 24, coldChain: false, rx: false },
    { name: "Cough Syrup 100ml", generic: "Dextromethorphan", strength: "10mg/5ml", form: "syrup", category: "Cough & Cold", class: "Antitussive", manufacturer: "Nepal Pharma", suppIdx: 0, price: 45, mrp: 90, sale: 72, coldChain: false, rx: false },
    { name: "ORS Sachet", generic: "Oral Rehydration Salts", strength: "20.5g", form: "powder", category: "Electrolyte", class: "Rehydration", manufacturer: "Mankind", suppIdx: 4, price: 10, mrp: 20, sale: 16, coldChain: false, rx: false },
    { name: "Insulin Glargine 100IU", generic: "Insulin Glargine", strength: "100IU/ml", form: "injection", category: "Antidiabetic", class: "Insulin", manufacturer: "Cipla", suppIdx: 2, price: 350, mrp: 650, sale: 520, coldChain: true, rx: true },
    { name: "Salbutamol Inhaler", generic: "Salbutamol", strength: "100mcg", form: "inhaler", category: "Respiratory", class: "Bronchodilator", manufacturer: "Sun Pharma", suppIdx: 3, price: 180, mrp: 350, sale: 280, coldChain: false, rx: true },
    { name: "Atorvastatin 10mg", generic: "Atorvastatin", strength: "10mg", form: "tablet", category: "Lipid Lowering", class: "Statin", manufacturer: "Cipla", suppIdx: 2, price: 22, mrp: 45, sale: 36, coldChain: false, rx: true },
    { name: "Losartan 50mg", generic: "Losartan", strength: "50mg", form: "tablet", category: "Antihypertensive", class: "ARB", manufacturer: "Himalayan Drug", suppIdx: 1, price: 20, mrp: 40, sale: 32, coldChain: false, rx: true },
    { name: "Diazepam 5mg", generic: "Diazepam", strength: "5mg", form: "tablet", category: "Anxiolytic", class: "Benzodiazepine", manufacturer: "Nepal Pharma", suppIdx: 0, price: 8, mrp: 15, sale: 12, coldChain: false, rx: true, controlled: true, narcotic: true },
    { name: "Tramadol 50mg", generic: "Tramadol", strength: "50mg", form: "capsule", category: "Analgesic", class: "Opioid", manufacturer: "Sun Pharma", suppIdx: 3, price: 25, mrp: 50, sale: 40, coldChain: false, rx: true, controlled: true },
    { name: "Ranitidine Syrup 200ml", generic: "Ranitidine", strength: "75mg/5ml", form: "syrup", category: "Antacid", class: "H2 Blocker", manufacturer: "Nepal Pharma", suppIdx: 0, price: 40, mrp: 80, sale: 64, coldChain: false, rx: false },
    { name: "Metronidazole 400mg", generic: "Metronidazole", strength: "400mg", form: "tablet", category: "Antibiotic", class: "Antiprotozoal", manufacturer: "Himalayan Drug", suppIdx: 1, price: 18, mrp: 35, sale: 28, coldChain: false, rx: true },
    { name: "Cefixime 200mg", generic: "Cefixime", strength: "200mg", form: "tablet", category: "Antibiotic", class: "Cephalosporin", manufacturer: "Cipla", suppIdx: 2, price: 40, mrp: 80, sale: 64, coldChain: false, rx: true },
    { name: "Ondansetron 4mg", generic: "Ondansetron", strength: "4mg", form: "tablet", category: "Antiemetic", class: "Antiemetic", manufacturer: "Mankind", suppIdx: 4, price: 20, mrp: 40, sale: 32, coldChain: false, rx: true },
    { name: "Prednisolone 5mg", generic: "Prednisolone", strength: "5mg", form: "tablet", category: "Corticosteroid", class: "Steroid", manufacturer: "Sun Pharma", suppIdx: 3, price: 15, mrp: 30, sale: 24, coldChain: false, rx: true },
    { name: "Methotrexate 2.5mg", generic: "Methotrexate", strength: "2.5mg", form: "tablet", category: "Immunosuppressant", class: "Antimetabolite", manufacturer: "Cipla", suppIdx: 2, price: 50, mrp: 100, sale: 80, coldChain: false, rx: true, controlled: true },
  ];

  const today = new Date();
  const medicines = [];
  for (let i = 0; i < medDefs.length; i++) {
    const m = medDefs[i];
    const expiry = new Date(today.getFullYear() + (Math.random() > 0.2 ? rand(1, 2) : (Math.random() > 0.5 ? 0 : -1)), rand(0, 11), rand(1, 28));
    const stock = Math.random() > 0.15 ? rand(5, 300) : 0;
    const reorder = 20;
    const supplier = suppliers[m.suppIdx];
    const med = await db.medicine.create({
      data: {
        name: m.name,
        genericName: m.generic,
        strength: m.strength,
        dosageForm: m.form,
        category: m.category,
        therapeuticClass: m.class,
        manufacturer: m.manufacturer,
        supplierId: supplier.id,
        hsn: `HSN-${3000 + i}`,
        barcode: `890${rand(1000000, 9999999)}`,
        batchNo: `BTH-${rand(10000, 99999)}`,
        expiryDate: expiry,
        manufactureDate: new Date(today.getFullYear() - rand(0, 1), rand(0, 11), rand(1, 28)),
        storageCondition: m.coldChain ? "Cold Chain 2-8°C" : "Room Temperature",
        rackNumber: `R${pick(["A", "B", "C", "D"])}`,
        shelfNumber: `S${rand(1, 20)}`,
        location: `Rack ${pick(["A", "B", "C", "D"])}-Shelf ${rand(1, 20)}`,
        purchasePrice: m.price,
        unitPrice: m.price,
        mrp: m.mrp,
        salePrice: m.sale,
        wholesalePrice: Math.round(m.sale * 0.9 * 100) / 100,
        discountPct: Math.random() > 0.7 ? 5 : 0,
        taxRate: 13,
        stockQty: stock,
        reorderLevel: reorder,
        minStock: 10,
        maxStock: 500,
        reservedStock: Math.random() > 0.8 ? rand(1, 5) : 0,
        openingStock: stock + rand(10, 50),
        status: stock === 0 ? "out-of-stock" : stock <= reorder ? "active" : "active",
        prescriptionRequired: m.rx || false,
        controlledDrug: (m as { controlled?: boolean }).controlled || false,
        narcotic: (m as { narcotic?: boolean }).narcotic || false,
        coldChain: m.coldChain,
        imageUrl: null,
      },
    });
    medicines.push(med);

    // Create 1-3 batches per medicine
    const numBatches = rand(1, 3);
    for (let b = 0; b < numBatches; b++) {
      const batchExpiry = new Date(today.getFullYear() + rand(0, 2), rand(0, 11), rand(1, 28));
      await db.medicineBatch.create({
        data: {
          medicineId: med.id,
          batchNo: `BTH-${rand(10000, 99999)}-${b}`,
          expiryDate: batchExpiry,
          manufactureDate: new Date(today.getFullYear() - rand(0, 1), rand(0, 11), rand(1, 28)),
          quantity: rand(10, 100),
          purchasePrice: m.price,
          salePrice: m.sale,
          mrp: m.mrp,
          supplierId: supplier.id,
          status: batchExpiry > today ? "active" : "expired",
        },
      });
    }
  }

  // Purchase Orders
  const poStatuses = ["draft", "sent", "partial", "received", "received", "received", "cancelled"];
  for (let i = 0; i < 15; i++) {
    const supplier = pick(suppliers);
    const numItems = rand(2, 5);
    const chosenMeds: typeof medicines = [];
    const usedIds = new Set<string>();
    for (let j = 0; j < numItems; j++) {
      const m = pick(medicines);
      if (!usedIds.has(m.id)) { chosenMeds.push(m); usedIds.add(m.id); }
    }
    const subtotal = chosenMeds.reduce((s, m) => s + m.purchasePrice * rand(20, 100), 0);
    const taxAmount = Math.round(subtotal * 0.13);
    const totalAmount = subtotal + taxAmount;
    const status = pick(poStatuses);
    const orderDate = new Date(today);
    orderDate.setDate(orderDate.getDate() - rand(0, 30));

    const po = await db.purchaseOrder.create({
      data: {
        poNumber: `PO-${String(i + 1).padStart(5, "0")}`,
        supplierId: supplier.id,
        orderDate,
        expectedDate: new Date(orderDate.getTime() + 7 * 86400000),
        receivedDate: status === "received" ? new Date(orderDate.getTime() + 5 * 86400000) : null,
        status,
        subtotal,
        taxAmount,
        discountAmount: Math.random() > 0.7 ? Math.round(subtotal * 0.05) : 0,
        totalAmount,
        paidAmount: status === "received" ? totalAmount : Math.random() > 0.5 ? Math.round(totalAmount * 0.5) : 0,
        notes: pick(["Urgent restock", "Routine order", "Monthly supply", "Emergency stock"]),
        createdBy: "admin@medcore.health",
        items: {
          create: chosenMeds.map(m => ({
            medicineId: m.id,
            quantity: rand(20, 100),
            receivedQty: status === "received" ? rand(20, 100) : status === "partial" ? rand(10, 20) : 0,
            unitPrice: m.purchasePrice,
            taxPct: 13,
            discountPct: 0,
            total: m.purchasePrice * rand(20, 100),
          })),
        },
      },
    });

    // GRN for received orders
    if (status === "received") {
      await db.gRN.create({
        data: {
          grnNumber: `GRN-${String(i + 1).padStart(5, "0")}`,
          orderId: po.id,
          receivedDate: new Date(orderDate.getTime() + 5 * 86400000),
          totalAmount,
          receivedBy: "Store Manager",
        },
      });
    }
  }

  // Stock Movements
  const movementTypes = ["purchase", "sale", "adjustment", "damage", "expiry", "consumption"];
  for (let i = 0; i < 50; i++) {
    const med = pick(medicines);
    const type = pick(movementTypes);
    const qty = type === "sale" || type === "consumption" || type === "damage" || type === "expiry" ? -rand(1, 20) : rand(10, 50);
    await db.stockMovement.create({
      data: {
        medicineId: med.id,
        type,
        quantity: qty,
        balanceAfter: Math.max(0, med.stockQty + qty),
        reference: type === "purchase" ? `PO-${rand(1, 15)}` : type === "sale" ? `PHARM-${rand(1, 20)}` : `ADJ-${rand(1, 10)}`,
        notes: pick(["Routine", "Emergency", "Stock check", "Damage report", "Expired stock"]),
        performedBy: pick(["Pharmacist", "Store Manager", "Cashier"]),
      },
    });
  }

  // Pharmacy Sales
  const patientNames = ["Aarav Sharma", "Sita Thapa", "Rohan Gurung", "Priya Shrestha", "Bishal Magar", "Anjali Khadka", "Kiran Rana", "Maya Bhandari"];
  const doctorNames = ["Dr. Sharma", "Dr. Gurung", "Dr. Shrestha", "Dr. Khadka"];
  for (let i = 0; i < 40; i++) {
    const numItems = rand(1, 4);
    const chosenMeds: typeof medicines = [];
    const usedIds = new Set<string>();
    for (let j = 0; j < numItems; j++) {
      const m = pick(medicines);
      if (m.stockQty > 0 && !usedIds.has(m.id)) { chosenMeds.push(m); usedIds.add(m.id); }
    }
    if (chosenMeds.length === 0) continue;

    const subtotal = chosenMeds.reduce((s, m) => s + m.salePrice * rand(1, 10), 0);
    const tax = Math.round(subtotal * 0.13);
    const discount = Math.random() > 0.7 ? Math.round(subtotal * 0.05) : 0;
    const total = subtotal + tax - discount;
    const saleDate = new Date(today);
    saleDate.setDate(saleDate.getDate() - rand(0, 7));

    await db.pharmacySale.create({
      data: {
        invoiceNo: `PHARM-${String(i + 1).padStart(5, "0")}`,
        patientName: pick(patientNames),
        doctorName: Math.random() > 0.4 ? pick(doctorNames) : null,
        prescriptionRef: Math.random() > 0.5 ? `RX-${rand(1, 25)}` : null,
        subtotal,
        discount,
        tax,
        total,
        paidAmount: total,
        paymentMethod: pick(["Cash", "Card", "eSewa", "Khalti", "FonePay"]),
        paymentStatus: "paid",
        status: "completed",
        saleDate,
        items: {
          create: chosenMeds.map(m => ({
            medicineId: m.id,
            quantity: rand(1, 10),
            unitPrice: m.salePrice,
            discount: 0,
            total: m.salePrice * rand(1, 10),
          })),
        },
      },
    });
  }

  // Purchase Returns
  for (let i = 0; i < 5; i++) {
    const med = pick(medicines);
    await db.purchaseReturn.create({
      data: {
        returnNo: `PR-${String(i + 1).padStart(5, "0")}`,
        supplierId: med.supplierId,
        medicineId: med.id,
        quantity: rand(5, 20),
        unitPrice: med.purchasePrice,
        totalAmount: med.purchasePrice * rand(5, 20),
        reason: pick(["Expired stock", "Damaged goods", "Wrong delivery", "Quality issue"]),
        status: pick(["pending", "approved", "completed"]),
      },
    });
  }

  // Sales Returns
  for (let i = 0; i < 5; i++) {
    const med = pick(medicines);
    await db.salesReturn.create({
      data: {
        returnNo: `SR-${String(i + 1).padStart(5, "0")}`,
        medicineId: med.id,
        quantity: rand(1, 5),
        unitPrice: med.salePrice,
        totalAmount: med.salePrice * rand(1, 5),
        reason: pick(["Customer return", "Wrong medicine", "Expired", "Damaged"]),
        status: pick(["pending", "approved"]),
      },
    });
  }

  console.log("PMS seed complete:", { suppliers: suppliers.length, medicines: medicines.length });
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
