import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - rand(0, daysAgo));
  return d;
}

const CONTACT_TYPES = ["patient", "doctor", "clinic", "partner", "vendor", "corporate"];
const CONTACT_CATEGORIES = ["general", "vip", "corporate", "insurance"];
const CONTACT_SOURCES = ["website", "referral", "call_center", "facebook", "google", "whatsapp", "instagram", "walk_in", "manual"];
const DEAL_STAGES = ["qualification", "needs_analysis", "proposal", "negotiation", "closed_won", "closed_lost"];
const COMMUNICATION_TYPES = ["call", "email", "whatsapp", "sms", "meeting", "note"];
const TASK_TYPES = ["follow_up", "call", "meeting", "email", "sms", "whatsapp", "check_in", "reminder"];
const TASK_PRIORITIES = ["low", "medium", "high", "urgent"];
const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"];
const TEMPLATE_CATEGORIES = ["general", "follow_up", "appointment", "promotion", "welcome", "feedback"];

const NAMES = [
  "Aarav Sharma", "Anisha Thapa", "Bikash Rai", "Chhiring Lama", "Deepa Gurung",
  "Fiona Tamang", "Gaurav Adhikari", "Hari Prasad", "Isha Bhandari", "Jyoti Karki",
  "Kiran Magar", "Laxmi Shrestha", "Manisha KC", "Nabin Poudel", "Ojaswi Ranjit",
  "Prabin Neupane", "Rajiv Dhungana", "Sarita Bajracharya", "Tara Panta", "Usha Pandey",
  "Vikram Chhetri", "Wanda Sherpa", "Xavier Gurung", "Yamuna Adhikari", "Zara Tamang",
  "Rajan Bhattarai", "Sunita Magar", "Tenzin Dorje", "Umesh Kafle", "Vijay Thapa",
];

const COMPANIES = [
  "Nepal Medical Center", "Himalaya Hospital", "Kathmandu Dental Clinic", "Care Nepal Foundation",
  "HealthFirst Nepal", "Nepal Heart Foundation", "Bir Hospital", "Tribhuvan University Hospital",
  "Nepal Red Cross", "Care Health Insurance", "Nepal Life Insurance", "Lumbini Medical College",
  "Pokhara Health Center", "Chitwan Medical College", "Nepal Medical College", "Universal Hospital",
  "Nepal Cardiac Center", "Nepal Eye Hospital", "Nepal Children's Hospital", "Nepal Army Hospital",
];

const INTERESTS = ["IVF", "Dental", "Cardiology", "Orthopedics", "General Medicine", "Pediatrics", "Gynecology", "Dermatology"];

const STAGE_VALUES: Record<string, number> = {
  qualification: 50000,
  needs_analysis: 100000,
  proposal: 200000,
  negotiation: 350000,
  closed_won: 500000,
  closed_lost: 250000,
};

const OUTCOMES = ["reached", "voicemail", "no_answer", "callback_requested", "interested", "not_interested"];

async function main() {
  console.log("Seeding CRM module...");

  // Clean existing data
  await db.cRMActivity.deleteMany();
  await db.cRMCommunication.deleteMany();
  await db.cRMTask.deleteMany();
  await db.cRMDeal.deleteMany();
  await db.cRMContact.deleteMany();
  await db.emailTemplate.deleteMany();

  // Create 30 contacts
  const contacts = [];
  for (let i = 0; i < 30; i++) {
    const type = pick(CONTACT_TYPES);
    const c = await db.cRMContact.create({
      data: {
        contactNo: `CON-${String(i + 1).padStart(5, "0")}`,
        name: NAMES[i % NAMES.length],
        email: `${NAMES[i % NAMES.length].toLowerCase().replace(" ", ".")}@example.com`,
        phone: `+977-98${String(rand(10000000, 99999999))}`,
        company: pick(COMPANIES),
        type,
        category: pick(CONTACT_CATEGORIES),
        source: pick(CONTACT_SOURCES),
        assignedTo: pick(["Sita Sharma", "Ramesh Thapa", "Anjali Gurung", "Dipesh Magar", "Pooja Shrestha"]),
        tags: pick(["lead", "vip", "follow-up", "hot-lead", "cold-lead", "new", "active", ""]),
        address: `Kathmandu-${rand(1, 32)}`,
        city: pick(["Kathmandu", "Pokhara", "Chitwan", "Bhaktapur", "Lalitpur", "Biratnagar"]),
        notes: `Contact from ${pick(CONTACT_SOURCES)} source`,
        score: rand(0, 100),
        status: pick(["active", "active", "active", "inactive"]),
        lastContactAt: randomDate(90),
      },
    });
    contacts.push(c);
  }
  console.log(`  Created ${contacts.length} contacts`);

  // Create 20 deals
  const deals = [];
  for (let i = 0; i < 20; i++) {
    const stage = pick(DEAL_STAGES);
    const deal = await db.cRMDeal.create({
      data: {
        dealNo: `DEAL-${String(i + 1).padStart(5, "0")}`,
        title: `${pick(INTERESTS)} - ${pick(["Package", "Consultation", "Treatment", "Follow-up", "Checkup"])}`,
        contactId: pick(contacts).id,
        stage,
        value: STAGE_VALUES[stage] + rand(-20000, 50000),
        currency: "NPR",
        probability: stage === "closed_won" ? 100 : stage === "closed_lost" ? 0 : rand(10, 90),
        source: pick(CONTACT_SOURCES),
        interest: pick(INTERESTS),
        assignedTo: pick(["Sita Sharma", "Ramesh Thapa", "Anjali Gurung"]),
        priority: pick(["low", "medium", "high"]),
        expectedClose: randomDate(60),
        closedAt: stage.startsWith("closed") ? randomDate(30) : null,
        lostReason: stage === "closed_lost" ? pick(["price", "timing", "competition", "no response", "changed mind"]) : null,
        notes: `Deal for ${pick(INTERESTS)} service`,
        createdAt: randomDate(120),
      },
    });
    deals.push(deal);
  }
  console.log(`  Created ${deals.length} deals`);

  // Create 40 communications
  const comms = [];
  for (let i = 0; i < 40; i++) {
    const comm = await db.cRMCommunication.create({
      data: {
        contactId: pick(contacts).id,
        type: pick(COMMUNICATION_TYPES),
        direction: pick(["inbound", "outbound", "outbound"]),
        subject: pick(["Follow-up", "Appointment", "Welcome", "Feedback", "Check-in", "Promotion", ""]),
        body: `Message content for communication ${i + 1}`,
        outcome: pick(OUTCOMES),
        duration: pick([5, 10, 15, 20, 30, 45, 60]),
        scheduledAt: randomDate(30),
        completedAt: randomDate(30),
        assignedTo: pick(["Sita Sharma", "Ramesh Thapa", "Anjali Gurung"]),
        createdAt: randomDate(90),
      },
    });
    comms.push(comm);
  }
  console.log(`  Created ${comms.length} communications`);

  // Create 25 tasks
  for (let i = 0; i < 25; i++) {
    await db.cRMTask.create({
      data: {
        contactId: pick(contacts).id,
        dealId: pick(deals).id,
        title: `${pick(TASK_TYPES).replace("_", " ")} - ${pick(INTERESTS)}`,
        description: `Task description for ${pick(INTERESTS)}`,
        type: pick(TASK_TYPES),
        priority: pick(TASK_PRIORITIES),
        status: pick(TASK_STATUSES),
        dueDate: randomDate(30),
        completedAt: pick(TASK_STATUSES) === "completed" ? randomDate(10) : null,
        assignedTo: pick(["Sita Sharma", "Ramesh Thapa", "Anjali Gurung", "Dipesh Magar"]),
        createdAt: randomDate(60),
      },
    });
  }
  console.log("  Created 25 tasks");

  // Create activities for deals
  for (const deal of deals) {
    const numActivities = rand(1, 4);
    for (let i = 0; i < numActivities; i++) {
      const type = pick(["stage_change", "note", "call", "email", "meeting", "task_completed"]);
      const fromIdx = rand(0, DEAL_STAGES.length - 2);
      await db.cRMActivity.create({
        data: {
          dealId: deal.id,
          type,
          fromStage: type === "stage_change" ? DEAL_STAGES[fromIdx] : null,
          toStage: type === "stage_change" ? DEAL_STAGES[fromIdx + 1] : null,
          description: `Activity: ${type}`,
          performedBy: pick(["Sita Sharma", "Ramesh Thapa", "Anjali Gurung"]),
          createdAt: randomDate(90),
        },
      });
    }
  }
  console.log("  Created deal activities");

  // Create email templates
  const templateDefs = [
    { name: "Welcome Email", category: "welcome", subject: "Welcome to {{clinic_name}}", body: "<h1>Welcome!</h1><p>Dear {{patient_name}},</p><p>Thank you for joining us.</p>", variables: "patient_name,clinic_name" },
    { name: "Follow-up Email", category: "follow_up", subject: "Follow-up: {{appointment_type}}", body: "<p>Dear {{patient_name}},</p><p>Just checking in on your recent {{appointment_type}}.</p>", variables: "patient_name,appointment_type" },
    { name: "Appointment Reminder", category: "appointment", subject: "Appointment Reminder - {{date}}", body: "<p>Dear {{patient_name}},</p><p>This is a reminder for your appointment on {{date}} at {{time}}.</p>", variables: "patient_name,date,time" },
    { name: "Promotion Email", category: "promotion", subject: "Special Offer: {{offer_name}}", body: "<p>Dear {{patient_name}},</p><p>We have a special offer for you: {{offer_name}}.</p>", variables: "patient_name,offer_name" },
    { name: "Feedback Request", category: "feedback", subject: "How was your experience?", body: "<p>Dear {{patient_name}},</p><p>We'd love your feedback on your recent visit.</p>", variables: "patient_name" },
    { name: "Payment Reminder", category: "general", subject: "Payment Reminder - {{amount}}", body: "<p>Dear {{patient_name}},</p><p>This is a reminder for your pending payment of {{amount}}.</p>", variables: "patient_name,amount" },
    { name: "Referral Thank You", category: "general", subject: "Thank you for referring {{referee_name}}", body: "<p>Dear {{patient_name}},</p><p>Thank you for referring {{referee_name}}.</p>", variables: "patient_name,referee_name" },
    { name: "Campaign Email", category: "promotion", subject: "Health Campaign: {{campaign_name}}", body: "<p>Dear {{patient_name}},</p><p>Join our health campaign: {{campaign_name}}.</p>", variables: "patient_name,campaign_name" },
  ];
  for (const t of templateDefs) {
    await db.emailTemplate.create({ data: { ...t, isActive: true } });
  }
  console.log(`  Created ${templateDefs.length} email templates`);

  console.log("CRM seeding complete!");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());