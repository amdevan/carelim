import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  console.log("Seeding Accounting data...");
  await db.bankTransaction.deleteMany();
  await db.cashTransaction.deleteMany();
  await db.insuranceClaim.deleteMany();
  await db.doctorCommission.deleteMany();
  await db.supplierPayment.deleteMany();
  await db.patientPayment.deleteMany();
  await db.journalItem.deleteMany();
  await db.journalEntry.deleteMany();
  await db.account.deleteMany();

  // Chart of Accounts
  const accountDefs = [
    { code: "1000", name: "Cash in Hand", type: "asset", group: "current_asset" },
    { code: "1010", name: "Bank Account — NIC Asia", type: "asset", group: "current_asset" },
    { code: "1020", name: "Bank Account — Nabil Bank", type: "asset", group: "current_asset" },
    { code: "1100", name: "Patient Receivable", type: "asset", group: "current_asset" },
    { code: "1200", name: "Inventory", type: "asset", group: "current_asset" },
    { code: "2000", name: "Supplier Payable", type: "liability", group: "current_liability" },
    { code: "2100", name: "Tax Payable", type: "liability", group: "current_liability" },
    { code: "3000", name: "Owner's Equity", type: "equity", group: "equity" },
    { code: "4000", name: "OPD Consultation Revenue", type: "income", group: "revenue" },
    { code: "4100", name: "Pharmacy Sales Revenue", type: "income", group: "revenue" },
    { code: "4200", name: "Laboratory Revenue", type: "income", group: "revenue" },
    { code: "4300", name: "Radiology Revenue", type: "income", group: "revenue" },
    { code: "4400", name: "Procedure Revenue", type: "income", group: "revenue" },
    { code: "4500", name: "Package Revenue", type: "income", group: "revenue" },
    { code: "4600", name: "Insurance Income", type: "income", group: "revenue" },
    { code: "5000", name: "Cost of Goods Sold", type: "expense", group: "cogs" },
    { code: "6000", name: "Salary Expense", type: "expense", group: "operating_expense" },
    { code: "6100", name: "Rent Expense", type: "expense", group: "operating_expense" },
    { code: "6200", name: "Utilities Expense", type: "expense", group: "operating_expense" },
    { code: "6300", name: "Marketing Expense", type: "expense", group: "operating_expense" },
    { code: "6400", name: "Maintenance Expense", type: "expense", group: "operating_expense" },
    { code: "6500", name: "Office Supplies", type: "expense", group: "operating_expense" },
    { code: "6600", name: "Doctor Commission", type: "expense", group: "operating_expense" },
  ];
  const accounts: Record<string, typeof accountDefs[0] & { id: string }> = {};
  for (const a of accountDefs) {
    const acc = await db.account.create({ data: { ...a, balance: rand(10000, 500000) } });
    accounts[a.code] = acc;
  }

  const today = new Date();
  const patients = await db.patient.findMany({ take: 20 });
  const doctors = await db.doctor.findMany();
  const suppliers = ["Nepal Pharma", "Cipla Nepal", "Sun Pharma", "Himalayan Drug"];

  // Patient Payments
  for (let i = 0; i < 30; i++) {
    const pat = pick(patients);
    const date = new Date(today);
    date.setDate(date.getDate() - rand(0, 14));
    await db.patientPayment.create({
      data: {
        receiptNo: `RCP-${String(i + 1).padStart(5, "0")}`,
        patientId: pat.id,
        patientName: pat.name,
        amount: pick([300, 500, 700, 1000, 1500, 2000, 3500, 5000]),
        paymentMethod: pick(["Cash", "Card", "eSewa", "Khalti", "FonePay", "Bank"]),
        paymentType: pick(["full", "full", "full", "partial", "advance"]),
        date,
        collectedBy: "Reception",
      },
    });
  }

  // Supplier Payments
  for (let i = 0; i < 10; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - rand(0, 20));
    await db.supplierPayment.create({
      data: {
        paymentNo: `SP-${String(i + 1).padStart(5, "0")}`,
        supplierName: pick(suppliers),
        amount: pick([5000, 15000, 25000, 50000, 100000]),
        paymentMethod: pick(["bank", "cheque", "cash"]),
        date,
        paidBy: "Accountant",
      },
    });
  }

  // Doctor Commissions
  const monthStr = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  for (const doc of doctors.slice(0, 10)) {
    const consultationAmt = doc.appointments?.length ? doc.appointments.length * doc.consultationFee : rand(5000, 50000);
    const procedureAmt = rand(0, 20000);
    const labAmt = rand(0, 10000);
    const radiologyAmt = rand(0, 8000);
    const totalRevenue = consultationAmt + procedureAmt + labAmt + radiologyAmt;
    await db.doctorCommission.create({
      data: {
        doctorId: doc.id,
        doctorName: doc.name,
        month: monthStr,
        consultationAmt,
        procedureAmt,
        labAmt,
        radiologyAmt,
        commissionPct: doc.commissionPct,
        totalCommission: Math.round(totalRevenue * doc.commissionPct / 100),
        status: Math.random() > 0.5 ? "settled" : "pending",
        settledAt: Math.random() > 0.5 ? new Date() : null,
      },
    });
  }

  // Insurance Claims
  const insuranceCompanies = ["Medicare", "Star Health", "Shikhar Insurance", "NIC Asia Insurance", "Sagarmatha Insurance"];
  for (let i = 0; i < 12; i++) {
    const status = pick(["pending", "submitted", "approved", "rejected", "paid", "paid"]);
    const claimAmount = pick([2000, 5000, 10000, 15000, 25000, 50000]);
    const date = new Date(today);
    date.setDate(date.getDate() - rand(0, 30));
    await db.insuranceClaim.create({
      data: {
        claimNo: `CLM-${String(i + 1).padStart(5, "0")}`,
        patientName: pick(patients).name,
        insuranceCompany: pick(insuranceCompanies),
        policyNumber: `POL-${rand(100000, 999999)}`,
        claimAmount,
        approvedAmount: status === "approved" || status === "paid" ? claimAmount : null,
        status,
        submittedAt: date,
        approvedAt: status === "approved" || status === "paid" ? new Date(date.getTime() + 3 * 86400000) : null,
        paidAt: status === "paid" ? new Date(date.getTime() + 7 * 86400000) : null,
      },
    });
  }

  // Journal Entries
  const journalModules = ["billing", "pharmacy", "lab", "radiology", "purchase", "payroll", "expense"];
  for (let i = 0; i < 40; i++) {
    const mod = pick(journalModules);
    const date = new Date(today);
    date.setDate(date.getDate() - rand(0, 20));
    const amount = pick([500, 1000, 2000, 3500, 5000, 8000, 12000, 25000]);

    let debitAccId: string, creditAccId: string;
    switch (mod) {
      case "billing":
        debitAccId = accounts["1100"].id; creditAccId = accounts["4000"].id; break;
      case "pharmacy":
        debitAccId = accounts["1000"].id; creditAccId = accounts["4100"].id; break;
      case "lab":
        debitAccId = accounts["1000"].id; creditAccId = accounts["4200"].id; break;
      case "radiology":
        debitAccId = accounts["1000"].id; creditAccId = accounts["4300"].id; break;
      case "purchase":
        debitAccId = accounts["1200"].id; creditAccId = accounts["2000"].id; break;
      case "payroll":
        debitAccId = accounts["6000"].id; creditAccId = accounts["1000"].id; break;
      case "expense":
        debitAccId = accounts["6100"].id; creditAccId = accounts["1000"].id; break;
      default:
        debitAccId = accounts["1000"].id; creditAccId = accounts["4000"].id;
    }

    const entry = await db.journalEntry.create({
      data: {
        entryNo: `JE-${String(i + 1).padStart(5, "0")}`,
        date,
        description: `${mod} transaction`,
        reference: `${mod.toUpperCase()}-${rand(1, 50)}`,
        module: mod,
        totalDebit: amount,
        totalCredit: amount,
        status: "posted",
        createdBy: "system",
        items: {
          create: [
            { accountId: debitAccId, debit: amount, credit: 0, description: `Debit ${mod}` },
            { accountId: creditAccId, debit: 0, credit: amount, description: `Credit ${mod}` },
          ],
        },
      },
    });
  }

  // Cash Transactions
  let cashBalance = 50000;
  for (let i = 0; i < 25; i++) {
    const type = pick(["receipt", "receipt", "payment", "deposit", "withdraw"]);
    const amount = pick([500, 1000, 2000, 3000, 5000, 10000]);
    if (type === "receipt" || type === "deposit") cashBalance += amount;
    else cashBalance -= amount;
    const date = new Date(today);
    date.setDate(date.getDate() - rand(0, 14));
    await db.cashTransaction.create({
      data: {
        type, amount,
        description: pick(["Patient payment", "Pharmacy sale", "Supplier payment", "Cash deposit", "Petty cash", "Salary advance"]),
        reference: `REF-${rand(100, 999)}`,
        balanceAfter: cashBalance,
        date,
        performedBy: "Cashier",
      },
    });
  }

  // Bank Transactions
  let bankBalance = 500000;
  for (let i = 0; i < 20; i++) {
    const type = pick(["receipt", "payment", "deposit", "withdraw", "transfer"]);
    const amount = pick([2000, 5000, 10000, 25000, 50000, 100000]);
    if (type === "receipt" || type === "deposit") bankBalance += amount;
    else bankBalance -= amount;
    const date = new Date(today);
    date.setDate(date.getDate() - rand(0, 20));
    await db.bankTransaction.create({
      data: {
        bankName: pick(["NIC Asia Bank", "Nabil Bank"]),
        accountNo: `ACC-${rand(10000000, 99999999)}`,
        type, amount,
        description: pick(["Insurance claim", "Supplier payment", "Patient refund", "Salary transfer", "Equipment purchase", "Online payment"]),
        reference: `BNK-${rand(1000, 9999)}`,
        balanceAfter: bankBalance,
        date,
        performedBy: "Accountant",
      },
    });
  }

  console.log("Accounting seed complete");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
