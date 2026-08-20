import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  console.log("Seeding doctor schedule slots (day-based)...");
  await db.doctorScheduleSlot.deleteMany();

  const doctors = await db.doctor.findMany();
  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  let count = 0;
  for (const doc of doctors) {
    // Parse working days from the doctor's workingDays field
    const workingDays = doc.workingDays.split(",").map(d => d.trim());

    for (const day of workingDays) {
      const capacity = pick([15, 20, 25, 30]);
      const booked = pick([0, 2, 5, 8, 10, 12, 15, 18]);
      const isFull = booked >= capacity;
      const isToday = day === new Date().toLocaleDateString("en-US", { weekday: "short" });

      await db.doctorScheduleSlot.create({
        data: {
          doctorId: doc.id,
          dayName: day,
          startTime: doc.startTime,
          endTime: doc.endTime,
          slotDuration: pick([10, 15, 20, 30]),
          capacity,
          bookedCount: Math.min(booked, capacity),
          status: isFull ? "full" : isToday && Math.random() > 0.8 ? "blocked" : "available",
          notes: Math.random() > 0.7 ? "Emergency slots reserved" : null,
        },
      });
      count++;
    }
  }

  console.log(`Seeded ${count} schedule slots for ${doctors.length} doctors`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
