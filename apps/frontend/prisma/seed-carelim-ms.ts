import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const CARELIM_SOURCES = ["website", "mobile_app", "call_center", "whatsapp", "facebook", "google", "landing_page", "partner"];
const CLINIC_SOURCES = ["walk_in", "reception", "phone", "hospital_website", "existing"];
const LEAD_SOURCES = ["facebook", "google", "whatsapp", "website", "instagram", "call_center", "referral"];
const INTERESTS = ["IVF & Fertility", "Dental", "Cardiology", "Orthopedics", "General Medicine", "Pediatrics", "Gynecology", "Dermatology"];
const COORDINATORS = ["Sita Sharma", "Ramesh Thapa", "Anjali Gurung", "Dipesh Magar", "Pooja Shrestha"];

async function main() {
  console.log("Seeding Carelim MS module...");

  // Register as platform module + add-on (idempotent)
  await db.platformModule.upsert({
    where: { name: "Carelim MS" },
    update: {},
    create: { name: "Carelim MS", description: "Patient source tracking, referral, commission & care coordination", category: "business", icon: "Network", isActive: true },
  });
  await db.addOn.upsert({
    where: { name: "Carelim MS Module" },
    update: {},
    create: { name: "Carelim MS Module", description: "Distinguish Carelim vs Clinic patients, track referrals, commissions, leads & care coordination.", price: 6000, billingCycle: "monthly", isActive: true },
  });

  // Clean
  await db.commissionSettlement.deleteMany();
  await db.referral.deleteMany();
  await db.patientActivityLog.deleteMany();
  await db.careCoordinator.deleteMany();
  await db.mSLead.deleteMany();
  await db.appointmentExtension.deleteMany();
  await db.patientSource.deleteMany();
  await db.campaign.deleteMany();

  // Campaigns
  const campaignDefs = [
    { name: "Summer Health Checkup 2025", platform: "facebook", budget: 50000, spent: 32000 },
    { name: "IVF Awareness Campaign", platform: "google", budget: 80000, spent: 55000 },
    { name: "Dental Smile Offer", platform: "instagram", budget: 30000, spent: 18000 },
    { name: "Monsoon Care WhatsApp Blast", platform: "whatsapp", budget: 15000, spent: 12000 },
    { name: "Website SEO Organic", platform: "website", budget: 10000, spent: 8000 },
    { name: "Call Center Outbound Q3", platform: "call_center", budget: 25000, spent: 20000 },
  ];
  const campaigns = [];
  for (const c of campaignDefs) {
    campaigns.push(await db.campaign.create({
      data: { ...c, leads: rand(20, 80), conversions: rand(5, 25), startDate: new Date(Date.now() - rand(10, 60) * 86400000), status: pick(["active", "active", "paused", "completed"]) },
    }));
  }

  // Reuse existing patients, doctors, branches, appointments, invoices
  const patients = await db.patient.findMany({ take: 60 });
  const doctors = await db.doctor.findMany();
  const branches = await db.branch.findMany();
  const appointments = await db.appointment.findMany({ take: 40 });
  const invoices = await db.invoice.findMany({ take: 30 });

  if (patients.length < 10 || doctors.length < 3 || branches.length < 1) {
    console.warn("Not enough core data; run main seed first.");
    return;
  }

  const today = new Date();
  let trackingCounter = 1;
  let referralCounter = 1;
  let leadCounter = 1;

  // Patient Sources — assign each patient as Carelim or Clinic
  for (const p of patients) {
    const isCarelim = Math.random() > 0.45; // ~55% Carelim
    const sourceName = isCarelim ? pick(CARELIM_SOURCES) : pick(CLINIC_SOURCES);
    const campaign = isCarelim && Math.random() > 0.4 ? pick(campaigns) : null;
    const clinic = pick(branches);
    const trackingId = `CMS-${String(trackingCounter++).padStart(5, "0")}`;
    await db.patientSource.create({
      data: {
        patientId: p.id,
        sourceType: isCarelim ? "carelim" : "clinic",
        sourceName,
        campaignId: campaign?.id || null,
        clinicId: clinic.id,
        trackingId,
        createdBy: pick(["carelim@carelim.health", "reception@clinic.health", "callcenter@carelim.health"]),
        createdAt: new Date(today.getTime() - rand(1, 90) * 86400000),
      },
    });

    // Activity logs — patient journey
    const acts = ["appointment_booked", "appointment_confirmed", "checked_in", "consultation", "billing_completed"];
    if (Math.random() > 0.5) acts.push("prescription_created");
    if (Math.random() > 0.6) acts.push("lab_ordered");
    if (Math.random() > 0.7) acts.push("followup_scheduled");
    if (isCarelim && Math.random() > 0.5) acts.push("commission_generated");
    if (Math.random() > 0.4) acts.push("sms_sent");
    if (Math.random() > 0.5) acts.push("whatsapp_sent");

    let actDate = new Date(today.getTime() - rand(1, 30) * 86400000);
    for (const a of acts) {
      await db.patientActivityLog.create({
        data: {
          patientId: p.id,
          activity: a,
          description: {
            appointment_booked: "Appointment booked via " + sourceName,
            appointment_confirmed: "Appointment confirmed by clinic",
            checked_in: "Patient checked in at reception",
            consultation: "Doctor consultation completed",
            prescription_created: "Prescription generated",
            lab_ordered: "Lab test ordered",
            billing_completed: "Billing completed",
            commission_generated: "Commission generated for Carelim referral",
            followup_scheduled: "Follow-up scheduled",
            sms_sent: "SMS reminder sent to patient",
            whatsapp_sent: "WhatsApp reminder sent to patient",
          }[a] || a,
          performedBy: pick(["system", "reception", pick(doctors).name, pick(COORDINATORS)]),
          createdAt: actDate,
        },
      });
      actDate = new Date(actDate.getTime() + rand(1, 48) * 3600000);
    }

    // Care coordinator (for ~40% of Carelim patients)
    if (isCarelim && Math.random() > 0.6) {
      await db.careCoordinator.create({
        data: {
          patientId: p.id,
          coordinatorName: pick(COORDINATORS),
          status: pick(["active", "active", "paused"]),
          nextFollowup: new Date(today.getTime() + rand(-5, 30) * 86400000),
          remarks: pick(["Patient responding well to treatment", "Due for review", "Needs callback", "Treatment in progress", ""]),
        },
      });
    }

    // Referral + commission (only for Carelim patients with completed billing)
    if (isCarelim && Math.random() > 0.5) {
      const inv = pick(invoices);
      const doc = pick(doctors);
      const rate = pick([5, 8, 10, 12, 15]);
      const commission = Math.round(inv.total * rate / 100);
      const ref = await db.referral.create({
        data: {
          referralNo: `REF-${String(referralCounter++).padStart(5, "0")}`,
          patientId: p.id,
          clinicId: clinic.id,
          doctorId: doc.id,
          referralSource: sourceName,
          campaignId: campaign?.id || null,
          commissionRate: rate,
          commissionAmount: commission,
          billAmount: inv.total,
          status: pick(["pending", "earned", "settled", "pending", "earned"]),
          settledAt: Math.random() > 0.6 ? new Date(today.getTime() - rand(1, 20) * 86400000) : null,
          createdAt: new Date(today.getTime() - rand(1, 60) * 86400000),
        },
      });

      // Commission settlement if earned/settled
      if (ref.status === "earned" || ref.status === "settled") {
        await db.commissionSettlement.create({
          data: {
            settlementNo: `STL-${String(referralCounter).padStart(5, "0")}`,
            referralId: ref.id,
            clinicId: clinic.id,
            doctorId: doc.id,
            amount: commission,
            status: ref.status === "settled" ? "paid" : "pending",
            paidAt: ref.status === "settled" ? ref.settledAt : null,
            month: today.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          },
        });
      }
    }
  }

  // Appointment Extensions — for existing appointments
  for (const appt of appointments.slice(0, 30)) {
    const ps = await db.patientSource.findFirst({ where: { patientId: appt.patientId } });
    const isCarelim = ps?.sourceType === "carelim";
    await db.appointmentExtension.create({
      data: {
        appointmentId: appt.id,
        bookingSource: isCarelim ? "CARELIM" : "CLINIC",
        bookingChannel: ps?.sourceName || pick(["walk_in", "reception", "phone"]),
        carelimPatient: isCarelim,
        commissionEligible: isCarelim,
        trackingId: ps?.trackingId || null,
        status: pick(["pending", "confirmed", "checked_in", "consultation", "billing", "completed", "completed", "cancelled", "no_show"]),
      },
    });
  }

  // Leads — 25 marketing leads
  const firstNames = ["Aarav", "Sita", "Rohan", "Priya", "Bishal", "Anjali", "Kiran", "Maya", "Suman", "Gita", "Niraj", "Pooja"];
  const lastNames = ["Sharma", "Thapa", "Gurung", "Magar", "Shrestha", "Khadka", "Rana", "Bhandari"];
  for (let i = 0; i < 25; i++) {
    const status = pick(["new", "contacted", "interested", "appointment_booked", "treatment_started", "completed", "lost", "new", "contacted", "interested"]);
    const convertedPatientId = status === "completed" || status === "treatment_started" ? pick(patients).id : null;
    await db.mSLead.create({
      data: {
        leadNo: `LEAD-${String(leadCounter++).padStart(5, "0")}`,
        patientName: `${pick(firstNames)} ${pick(lastNames)}`,
        phone: `98${rand(10000000, 99999999)}`,
        email: Math.random() > 0.5 ? `lead${i + 1}@mail.com` : null,
        source: pick(LEAD_SOURCES),
        campaignId: Math.random() > 0.5 ? pick(campaigns).id : null,
        clinicId: pick(branches).id,
        doctorId: pick(doctors).id,
        interest: pick(INTERESTS),
        status,
        convertedPatientId,
        convertedAt: convertedPatientId ? new Date(today.getTime() - rand(1, 30) * 86400000) : null,
        notes: pick(["Looking for affordable treatment", "Wants second opinion", "Insurance query", "Package pricing requested", "Follow-up call scheduled", ""]),
        assignedTo: pick(COORDINATORS),
        createdAt: new Date(today.getTime() - rand(1, 45) * 86400000),
      },
    });
  }

  // Audit logs
  for (let i = 0; i < 20; i++) {
    const date = new Date(today);
    date.setHours(date.getHours() - rand(0, 168));
    await db.auditLog.create({
      data: {
        user: pick(["carelim-admin@carelim.health", ...COORDINATORS.map(c => c.toLowerCase().replace(" ", ".") + "@carelim.health")]),
        action: pick(["CREATE", "UPDATE", "ASSIGN", "CONVERT"]),
        module: "Carelim MS",
        detail: pick([
          "New Carelim patient registered via website",
          "Lead converted to patient",
          "Commission settled for referral",
          "Follow-up scheduled by coordinator",
          "Appointment confirmed for Carelim patient",
          "Campaign performance updated",
        ]),
        ip: `192.168.1.${rand(2, 200)}`,
        createdAt: date,
      },
    });
  }

  console.log("Carelim MS seed complete:", {
    patientSources: trackingCounter - 1,
    referrals: referralCounter - 1,
    leads: leadCounter - 1,
    campaigns: campaigns.length,
  });
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
