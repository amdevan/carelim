import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 100) / 100;

async function main() {
  console.log("Seeding AIMS (Advanced Inventory Management) data...");

  // Clean AIMS tables
  await db.stockAuditItem.deleteMany();
  await db.stockAudit.deleteMany();
  await db.stockTransferItem.deleteMany();
  await db.stockTransfer.deleteMany();
  await db.inventoryMovement.deleteMany();
  await db.inventoryBatch.deleteMany();
  await db.inventoryStock.deleteMany();
  await db.inventoryItem.deleteMany();
  await db.inventoryLocation.deleteMany();

  // Locations (multi-warehouse)
  const locationDefs = [
    { name: "Main Pharmacy Store", code: "LOC-MP", type: "pharmacy", manager: "Ramesh Thapa", phone: "01-4XX11" },
    { name: "Pharmacy Counter", code: "LOC-PC", type: "pharmacy", manager: "Sita Sharma", phone: "01-4XX12" },
    { name: "ICU Store", code: "LOC-ICU", type: "icu", manager: "Dr. Kiran", phone: "01-4XX13" },
    { name: "OT Store", code: "LOC-OT", type: "ot", manager: "Nurse Maya", phone: "01-4XX14" },
    { name: "Emergency Store", code: "LOC-ER", type: "emergency", manager: "Dr. Hari", phone: "01-4XX15" },
    { name: "Lab Store", code: "LOC-LAB", type: "lab", manager: "Dipesh Karki", phone: "01-4XX16" },
    { name: "Central Warehouse", code: "LOC-WH", type: "warehouse", manager: "Suman Bhandari", phone: "01-4XX17" },
  ];
  const locations = [];
  for (const l of locationDefs) {
    locations.push(await db.inventoryLocation.create({ data: l }));
  }

  // Item definitions — Medicines, Medical Supplies, Equipment, Consumables
  const itemDefs = [
    // Medicines
    { name: "Paracetamol 500mg", generic: "Paracetamol", brand: "Crocin", category: "Medicine", sub: "Tablet", type: "medicine", dosage: "500mg", form: "tablet", unit: "strip", price: 5, sale: 8, mrp: 10, drugClass: "Analgesic", composition: "Paracetamol 500mg", route: "Oral", schedule: "OTC", controlled: false },
    { name: "Amoxicillin 500mg", generic: "Amoxicillin", brand: "Mox", category: "Medicine", sub: "Capsule", type: "medicine", dosage: "500mg", form: "capsule", unit: "strip", price: 35, sale: 50, mrp: 60, drugClass: "Antibiotic", composition: "Amoxicillin 500mg", route: "Oral", schedule: "Prescription Required", controlled: false },
    { name: "Metformin 500mg", generic: "Metformin", brand: "Glycomet", category: "Medicine", sub: "Tablet", type: "medicine", dosage: "500mg", form: "tablet", unit: "strip", price: 15, sale: 25, mrp: 30, drugClass: "Antidiabetic", composition: "Metformin 500mg", route: "Oral", schedule: "Prescription Required", controlled: false },
    { name: "Insulin Glargine 100IU", generic: "Insulin Glargine", brand: "Lantus", category: "Medicine", sub: "Injection", type: "medicine", dosage: "100IU/ml", form: "injection", unit: "vial", price: 350, sale: 520, mrp: 650, drugClass: "Insulin", composition: "Insulin Glargine 100IU/ml", route: "Subcutaneous", schedule: "Prescription Required", controlled: false, storage: "2-8°C Cold Chain" },
    { name: "Diazepam 5mg", generic: "Diazepam", brand: "Valium", category: "Medicine", sub: "Tablet", type: "medicine", dosage: "5mg", form: "tablet", unit: "strip", price: 8, sale: 12, mrp: 15, drugClass: "Anxiolytic", composition: "Diazepam 5mg", route: "Oral", schedule: "Prescription Required", controlled: true },
    // Medical Supplies
    { name: "Surgical Gloves (M)", category: "Medical Supplies", sub: "Gloves", type: "consumable", form: "pair", unit: "box", price: 200, sale: 350, mrp: 400 },
    { name: "Surgical Gloves (L)", category: "Medical Supplies", sub: "Gloves", type: "consumable", form: "pair", unit: "box", price: 200, sale: 350, mrp: 400 },
    { name: "Disposable Syringe 5ml", category: "Medical Supplies", sub: "Syringe", type: "consumable", form: "piece", unit: "box", price: 8, sale: 15, mrp: 20 },
    { name: "Disposable Syringe 10ml", category: "Medical Supplies", sub: "Syringe", type: "consumable", form: "piece", unit: "box", price: 12, sale: 20, mrp: 25 },
    { name: "IV Cannula 20G", category: "Medical Supplies", sub: "Cannula", type: "consumable", form: "piece", unit: "box", price: 25, sale: 40, mrp: 50 },
    { name: "N95 Mask", category: "Medical Supplies", sub: "Mask", type: "consumable", form: "piece", unit: "box", price: 15, sale: 30, mrp: 35 },
    { name: "Surgical Mask (3-ply)", category: "Medical Supplies", sub: "Mask", type: "consumable", form: "piece", unit: "box", price: 3, sale: 7, mrp: 10 },
    { name: "Sterile Gauze Roll", category: "Medical Supplies", sub: "Dressing", type: "consumable", form: "roll", unit: "piece", price: 15, sale: 25, mrp: 30 },
    { name: "Adhesive Bandage", category: "Medical Supplies", sub: "Dressing", type: "consumable", form: "piece", unit: "box", price: 50, sale: 90, mrp: 100 },
    { name: "Blood Collection Tube (EDTA)", category: "Medical Supplies", sub: "Lab Supply", type: "consumable", form: "piece", unit: "box", price: 8, sale: 15, mrp: 18 },
    // Equipment
    { name: "Digital Thermometer", category: "Equipment", sub: "Diagnostic", type: "equipment", form: "piece", unit: "piece", price: 150, sale: 300, mrp: 350 },
    { name: "BP Monitor (Digital)", category: "Equipment", sub: "Diagnostic", type: "equipment", form: "piece", unit: "piece", price: 2500, sale: 4000, mrp: 4500 },
    { name: "Pulse Oximeter", category: "Equipment", sub: "Diagnostic", type: "equipment", form: "piece", unit: "piece", price: 1200, sale: 2200, mrp: 2500 },
    { name: "Glucometer Kit", category: "Equipment", sub: "Diagnostic", type: "equipment", form: "kit", unit: "piece", price: 800, sale: 1500, mrp: 1800 },
    { name: "Nebulizer Machine", category: "Equipment", sub: "Respiratory", type: "equipment", form: "piece", unit: "piece", price: 2000, sale: 3500, mrp: 4000 },
    // Consumables
    { name: "Cotton Roll 500g", category: "Consumables", sub: "Cotton", type: "consumable", form: "roll", unit: "piece", price: 80, sale: 150, mrp: 180 },
    { name: "Surgical Spirit 500ml", category: "Consumables", sub: "Chemicals", type: "consumable", form: "bottle", unit: "bottle", price: 40, sale: 80, mrp: 95 },
    { name: "Dettol Antiseptic 500ml", category: "Consumables", sub: "Cleaning", type: "consumable", form: "bottle", unit: "bottle", price: 120, sale: 200, mrp: 230 },
    { name: "Hand Sanitizer 500ml", category: "Consumables", sub: "Cleaning", type: "consumable", form: "bottle", unit: "bottle", price: 100, sale: 180, mrp: 200 },
    { name: "IV Drip Set", category: "Medical Supplies", sub: "IV Supplies", type: "consumable", form: "piece", unit: "box", price: 20, sale: 40, mrp: 45 },
    { name: "Urinary Catheter (Foley 16Fr)", category: "Medical Supplies", sub: "Catheter", type: "consumable", form: "piece", unit: "box", price: 80, sale: 150, mrp: 170 },
    { name: "Suture (Chromic 2-0)", category: "Medical Supplies", sub: "Suture", type: "consumable", form: "piece", unit: "box", price: 30, sale: 60, mrp: 70 },
  ];

  const today = new Date();
  const items = [];
  for (let i = 0; i < itemDefs.length; i++) {
    const d = itemDefs[i];
    const stock = Math.random() > 0.15 ? rand(10, 500) : 0;
    const item = await db.inventoryItem.create({
      data: {
        name: d.name,
        genericName: d.generic || null,
        brandName: d.brand || null,
        category: d.category,
        subCategory: d.sub || null,
        type: d.type,
        dosage: d.dosage || null,
        form: d.form || null,
        unit: d.unit || "piece",
        barcode: `INV${rand(1000000, 9999999)}`,
        hsCode: `HSN-${4000 + i}`,
        drugClass: d.drugClass || null,
        composition: d.composition || null,
        route: d.route || null,
        schedule: d.schedule || null,
        controlledDrug: d.controlled || false,
        storageCondition: d.storage || null,
        purchasePrice: d.price,
        sellingPrice: d.sale,
        mrp: d.mrp,
        taxRate: 13,
        reorderLevel: 20,
        minStock: 10,
        maxStock: 500,
        rackNumber: `R${pick(["A", "B", "C", "D"])}`,
        shelfNumber: `S${rand(1, 20)}`,
        status: stock === 0 ? "out-of-stock" : "active",
      },
    });
    items.push(item);

    // Create batches for medicines and supplies with expiry
    const numBatches = rand(1, 3);
    for (let b = 0; b < numBatches; b++) {
      const expiry = new Date(today.getFullYear() + rand(-1, 2), rand(0, 11), rand(1, 28));
      await db.inventoryBatch.create({
        data: {
          itemId: item.id,
          batchNo: `BTH-${rand(10000, 99999)}-${b}`,
          manufactureDate: new Date(today.getFullYear() - rand(0, 1), rand(0, 11), rand(1, 28)),
          expiryDate: d.type === "medicine" || d.type === "consumable" ? expiry : null,
          quantity: rand(20, 200),
          purchasePrice: d.price,
          sellingPrice: d.sale,
          supplierName: pick(["Nepal Pharma", "Cipla Nepal", "Sun Pharma", "Himalayan Drug"]),
          status: expiry > today ? "active" : "expired",
        },
      });
    }

    // Distribute stock across 2-4 locations
    const numLocations = rand(2, 4);
    const usedLocs = new Set<string>();
    let remaining = stock;
    for (let l = 0; l < numLocations && remaining > 0; l++) {
      const loc = pick(locations);
      if (usedLocs.has(loc.id)) continue;
      usedLocs.add(loc.id);
      const locStock = l === numLocations - 1 ? remaining : rand(5, Math.min(remaining, Math.floor(stock / 2)));
      remaining -= locStock;
      await db.inventoryStock.create({
        data: {
          itemId: item.id,
          locationId: loc.id,
          quantity: locStock,
          reservedQty: Math.random() > 0.8 ? rand(1, 5) : 0,
          damagedQty: Math.random() > 0.9 ? rand(1, 3) : 0,
        },
      });
    }
  }

  // Stock Movements
  const movementTypes = [
    { type: "purchase", direction: "in" },
    { type: "sale", direction: "out" },
    { type: "issue", direction: "out" },
    { type: "adjustment", direction: "in" },
    { type: "damage", direction: "out" },
    { type: "consumption", direction: "out" },
    { type: "return", direction: "in" },
  ];
  for (let i = 0; i < 60; i++) {
    const item = pick(items);
    const m = pick(movementTypes);
    const qty = rand(1, 50);
    await db.inventoryMovement.create({
      data: {
        itemId: item.id,
        locationId: pick(locations).id,
        type: m.type,
        direction: m.direction,
        quantity: qty,
        balanceAfter: rand(0, 500),
        reference: m.type === "purchase" ? `PO-${rand(1, 20)}` : m.type === "sale" ? `INV-${rand(1, 40)}` : `REQ-${rand(1, 15)}`,
        reason: pick(["Routine", "Emergency", "Department request", "Stock check", "Damage report"]),
        department: pick(["ICU", "OT", "Emergency", "OPD", "Lab"]),
        performedBy: pick(["Store Manager", "Pharmacist", "Nurse", "Doctor"]),
      },
    });
  }

  // Stock Transfers
  const transferStatuses = ["pending", "approved", "in-transit", "received", "received", "received"];
  for (let i = 0; i < 12; i++) {
    const from = pick(locations);
    let to = pick(locations);
    while (to.id === from.id) to = pick(locations);
    const status = pick(transferStatuses);
    const numItems = rand(1, 4);
    const chosenItems: typeof items = [];
    const usedIds = new Set<string>();
    for (let j = 0; j < numItems; j++) {
      const it = pick(items);
      if (!usedIds.has(it.id)) { chosenItems.push(it); usedIds.add(it.id); }
    }
    const transferDate = new Date(today);
    transferDate.setDate(transferDate.getDate() - rand(0, 15));

    const transfer = await db.stockTransfer.create({
      data: {
        transferNo: `STR-${String(i + 1).padStart(5, "0")}`,
        fromLocationId: from.id,
        toLocationId: to.id,
        status,
        notes: pick(["Emergency restock", "Routine transfer", "Department request"]),
        requestedBy: "Store Manager",
        approvedBy: status !== "pending" ? "Admin" : null,
        receivedBy: status === "received" ? "Location Manager" : null,
        transferDate,
        approvedAt: status === "approved" || status === "received" ? new Date(transferDate.getTime() + 3600000) : null,
        receivedAt: status === "received" ? new Date(transferDate.getTime() + 7200000) : null,
        items: {
          create: chosenItems.map(it => ({
            itemId: it.id,
            quantity: rand(10, 100),
            receivedQty: status === "received" ? rand(10, 100) : 0,
          })),
        },
      },
    });
  }

  // Stock Audits
  for (let i = 0; i < 4; i++) {
    const loc = pick(locations);
    const numAuditItems = rand(5, 10);
    const chosenItems: typeof items = [];
    const usedIds = new Set<string>();
    for (let j = 0; j < numAuditItems; j++) {
      const it = pick(items);
      if (!usedIds.has(it.id)) { chosenItems.push(it); usedIds.add(it.id); }
    }
    const audit = await db.stockAudit.create({
      data: {
        auditNo: `AUD-${String(i + 1).padStart(5, "0")}`,
        locationId: loc.id,
        auditDate: new Date(today.getTime() - rand(0, 10) * 86400000),
        status: pick(["draft", "in-progress", "completed", "completed"]),
        performedBy: "Store Manager",
        notes: pick(["Routine audit", "Monthly check", "Spot check"]),
        items: {
          create: chosenItems.map(it => {
            const systemQty = rand(50, 300);
            const physicalQty = systemQty + rand(-10, 10);
            return {
              itemId: it.id,
              itemName: it.name,
              systemQty,
              physicalQty,
              variance: physicalQty - systemQty,
              reason: physicalQty !== systemQty ? pick(["Damage", "Theft", "Miscount", "Expired"]) : null,
            };
          }),
        },
      },
    });
  }

  console.log("AIMS seed complete:", { locations: locations.length, items: items.length });
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
