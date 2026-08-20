import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding patient portal demo user...");

  // Find or create a patient
  let patient = await prisma.patient.findFirst({ where: { email: "alex@carelim.health" } });
  if (!patient) {
    const count = await prisma.patient.count();
    patient = await prisma.patient.create({
      data: {
        patientCode: `PT-${String(count + 1).padStart(5, "0")}`,
        name: "Alex Wilson",
        email: "alex@carelim.health",
        phone: "+977-9841234567",
        gender: "male",
        dob: new Date("1990-03-15"),
        bloodGroup: "A+",
        address: "Baluwatar, Kathmandu, Nepal",
        weight: 75,
        height: 178,
        allergies: "Penicillin",
        chronicConditions: "Mild Hypertension",
        emergencyName: "Emma Wilson",
        emergencyContact: "+977-9841234568",
        insuranceProvider: "Nepal Insurance Corporation",
        insuranceNumber: "NIC-2024-88721",
        status: "active",
      },
    });
    console.log(`Created patient: ${patient.patientCode}`);
  }

  // Find or create PatientUser
  let user = await prisma.patientUser.findUnique({ where: { email: "alex@carelim.health" } });
  if (!user) {
    user = await prisma.patientUser.create({
      data: {
        patientId: patient.id,
        name: "Alex Wilson",
        email: "alex@carelim.health",
        password: "carelim123",
        phone: "+977-9841234567",
        status: "active",
      },
    });
    console.log(`Created patient user: ${user.email}`);
  } else {
    console.log(`Patient user already exists: ${user.email}`);
  }

  // Seed some messages
  const existingMessages = await prisma.patientMessage.count({ where: { userId: user.id } });
  if (existingMessages === 0) {
    await prisma.patientMessage.createMany({
      data: [
        { userId: user.id, fromName: "Dr. Sarah Mitchell", fromType: "provider", message: "Your latest blood pressure readings look good. Keep up the medication." },
        { userId: user.id, fromName: "Carelim Lab", fromType: "provider", message: "Your CBC report is ready for viewing." },
        { userId: user.id, fromName: "Dr. James Wilson", fromType: "provider", message: "See you at your next appointment. Bring your previous reports." },
      ],
    });
    console.log("Seeded messages");
  }

  // Seed reminders
  const existingReminders = await prisma.patientReminder.count({ where: { userId: user.id } });
  if (existingReminders === 0) {
    await prisma.patientReminder.createMany({
      data: [
        { userId: user.id, title: "Take Amlodipine 5mg", time: "Every day, 8:00 AM", type: "medication" },
        { userId: user.id, title: "Take Aspirin 75mg", time: "Every day, 8:00 AM", type: "medication" },
        { userId: user.id, title: "Blood pressure check", time: "Every Monday, 7:00 PM", type: "health" },
      ],
    });
    console.log("Seeded reminders");
  }

  // Seed notifications
  const existingNotifs = await prisma.patientNotification.count({ where: { userId: user.id } });
  if (existingNotifs === 0) {
    await prisma.patientNotification.createMany({
      data: [
        { userId: user.id, title: "Welcome to Carelim", message: "Your account has been created successfully. Complete your health profile to get started.", type: "info" },
        { userId: user.id, title: "Health Tip", message: "Stay hydrated! Aim for 8 glasses of water daily.", type: "tip" },
      ],
    });
    console.log("Seeded notifications");
  }

  console.log("\n--- Demo Credentials ---");
  console.log("Email: alex@carelim.health");
  console.log("Password: carelim123");
  console.log("------------------------\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
