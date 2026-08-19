import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
async function main() {
  console.log("Seeding Carelim...");
  await db.lead.deleteMany(); await db.saaSAuditLog.deleteMany(); await db.adminUser.deleteMany();
  await db.supportTicket.deleteMany(); await db.usageTracking.deleteMany(); await db.addOn.deleteMany();
  await db.tenantModule.deleteMany(); await db.platformModule.deleteMany(); await db.saaSInvoice.deleteMany();
  await db.tenant.deleteMany(); await db.plan.deleteMany();
  const plans = [
    { name: "Starter", description: "For small clinics", priceMonthly: 2000, priceYearly: 20000, maxDoctors: 2, maxUsers: 5, maxStorage: 5, maxBranches: 1 },
    { name: "Professional", description: "For growing clinics", priceMonthly: 5000, priceYearly: 50000, maxDoctors: 10, maxUsers: 30, maxStorage: 50, maxBranches: 2, hasApi: true },
    { name: "Enterprise", description: "For hospitals", priceMonthly: 15000, priceYearly: 150000, maxDoctors: 999, maxUsers: 999, maxStorage: 500, maxBranches: 10, hasApi: true, hasWhiteLabel: true, hasTelemedicine: true, hasAI: true },
  ];
  const planRecs = []; for (const p of plans) planRecs.push(await db.plan.create({ data: p }));
  const modDefs = [{name:"Patient Management",category:"healthcare"},{name:"Appointment",category:"healthcare"},{name:"EMR",category:"healthcare"},{name:"Prescription",category:"healthcare"},{name:"Pharmacy",category:"healthcare"},{name:"Laboratory",category:"healthcare"},{name:"Radiology",category:"healthcare"},{name:"Inventory",category:"healthcare"},{name:"Accounting",category:"healthcare"},{name:"Telemedicine",category:"healthcare"},{name:"Website Builder",category:"business"},{name:"Marketing CRM",category:"business"},{name:"WhatsApp Integration",category:"business"},{name:"AI Assistant",category:"business"}];
  for (const m of modDefs) await db.platformModule.create({ data: m });
  const addOnDefs = [{name:"Extra Doctor",price:500},{name:"Extra Storage (10GB)",price:200},{name:"WhatsApp Integration",price:2000},{name:"AI Healthcare Assistant",price:5000},{name:"Custom Website",price:15000,billingCycle:"one-time"},{name:"SMS Gateway",price:1000}];
  for (const a of addOnDefs) await db.addOn.create({ data: a });
  const clinicNames = ["Medicare Hospital","City Clinic","Star Health Center","Himalayan Hospital","Kathmandu Medical","Patan Hospital","Bhaktapur Clinic","Biratnagar Health","Pokhara Medical","Chitwan Clinic","Everest Hospital","Annapurna Clinic","Ganga Medical","Sagarmatha Health","Dhaulagiri Clinic"];
  const cities = ["Kathmandu","Lalitpur","Bhaktapur","Pokhara","Chitwan","Biratnagar","Birgunj"];
  const statuses = ["active","active","active","active","trial","trial","suspended","cancelled"];
  const today = new Date();
  for (let i = 0; i < clinicNames.length; i++) {
    const plan = pick(planRecs); const status = pick(statuses);
    const createdAt = new Date(today); createdAt.setDate(createdAt.getDate() - rand(1, 365));
    const tenant = await db.tenant.create({ data: { name: clinicNames[i], domain: `${clinicNames[i].toLowerCase().replace(/\s+/g,"")}.carelim.com`, ownerName: `Dr. ${pick(["Sharma","Thapa","Gurung","Shrestha","Khadka"])}`, ownerEmail: `admin@${clinicNames[i].toLowerCase().replace(/\s+/g,"")}.com`, ownerPhone: `98${rand(10000000,99999999)}`, address: `${rand(1,100)} Main Street`, city: pick(cities), country: "Nepal", registrationNo: `REG-${rand(10000,99999)}`, planId: plan.id, status, trialEndsAt: status === "trial" ? new Date(today.getTime() + rand(1,14)*86400000) : null, createdAt, lastLoginAt: status === "active" ? new Date(today.getTime() - rand(0,7)*86400000) : null } });
    await db.saaSInvoice.create({ data: { invoiceNo: `CARELIM-${String(i+1).padStart(3,"0")}-01`, tenantId: tenant.id, amount: plan.priceMonthly, tax: Math.round(plan.priceMonthly*0.13), total: plan.priceMonthly + Math.round(plan.priceMonthly*0.13), status: pick(["paid","paid","paid","unpaid","failed"]), paymentMethod: pick(["Card","Bank Transfer","eSewa","Khalti"]), date: createdAt, paidAt: Math.random() > 0.2 ? createdAt : null, description: `${plan.name} Plan - Monthly Subscription` } });
    await db.usageTracking.create({ data: { tenantId: tenant.id, date: today, userCount: rand(3,plan.maxUsers), doctorCount: rand(1,Math.min(plan.maxDoctors,20)), patientCount: rand(50,2000), appointmentCount: rand(10,500), storageUsedMB: rand(100,plan.maxStorage*1024), apiCalls: plan.hasApi ? rand(100,10000) : 0 } });
  }
  await db.adminUser.create({ data: { name: "Super Admin", email: "admin@carelim.com", password: "carelim123", role: "super_admin" } });
  await db.adminUser.create({ data: { name: "Support Manager", email: "support@carelim.com", password: "carelim123", role: "support_manager" } });
  await db.adminUser.create({ data: { name: "Sales Manager", email: "sales@carelim.com", password: "carelim123", role: "sales_manager" } });
  await db.adminUser.create({ data: { name: "Finance Manager", email: "finance@carelim.com", password: "carelim123", role: "finance_manager" } });
  const ticketSubs = ["Printer not working","Cannot access patient records","Payment failed","Need additional doctor slot","Lab module not loading","WhatsApp integration issue"];
  for (let i = 0; i < 10; i++) { const ts = await db.tenant.findMany(); const t = pick(ts); await db.supportTicket.create({ data: { ticketNo: `TKT-${String(i+1).padStart(4,"0")}`, tenantId: t.id, subject: pick(ticketSubs), description: "Issue description", priority: pick(["low","medium","medium","high","urgent"]), status: pick(["open","open","assigned","resolved","closed"]), assignedTo: pick(["Support Team","Technical Team",""]), category: pick(["technical","billing","feature","general"]), createdAt: new Date(today.getTime() - rand(0,15)*86400000), resolvedAt: Math.random() > 0.5 ? new Date() : null } }); }
  for (let i = 0; i < 12; i++) { await db.lead.create({ data: { clinicName: `${pick(["Health","Care","Med","Life","Well"])} ${pick(["Center","Clinic","Hospital","Care","Plus"])}`, contactPerson: `Mr. ${pick(["Sharma","Thapa","Gurung"])}`, email: `lead${i+1}@clinic.com`, phone: `98${rand(10000000,99999999)}`, location: pick(cities), status: pick(["lead","lead","demo","trial","converted","lost"]), source: pick(["Website","Referral","Social Media","Cold Call","Event"]), assignedTo: "Sales Manager" } }); }
  for (let i = 0; i < 15; i++) { const ts = await db.tenant.findMany(); const t = pick(ts); await db.saaSAuditLog.create({ data: { adminEmail: "admin@carelim.com", tenantId: t.id, action: pick(["LOGIN","VIEW_TENANT","SUSPEND_TENANT","CHANGE_PLAN","ENABLE_MODULE","GENERATE_INVOICE"]), module: pick(["Auth","Tenant","Subscription","Billing","Modules"]), detail: pick(["Admin logged in","Viewed tenant profile","Suspended tenant","Changed plan","Enabled module","Generated invoice"]), ipAddress: `192.168.1.${rand(2,200)}`, createdAt: new Date(today.getTime() - rand(0,10)*86400000) } }); }
  console.log("Carelim seed complete");
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
