/**
 * One-time script to hash all existing plaintext passwords in the database.
 * Run: npx tsx prisma/hash-existing-passwords.ts
 *
 * This script:
 * 1. Reads all Users, AdminUsers, and Doctors
 * 2. Checks if passwords are already hashed (bcrypt hashes start with $2a$, $2b$, or $2c$)
 * 3. Hashes any plaintext passwords
 * 4. Updates the database
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

function isAlreadyHashed(password: string): boolean {
  return /^\$2[abxy]\$/.test(password);
}

async function hashAllPasswords() {
  console.log("Starting password hashing migration...\n");

  // Hash User passwords
  const users = await db.user.findMany({ select: { id: true, email: true, password: true } });
  let hashedCount = 0;
  for (const user of users) {
    if (!isAlreadyHashed(user.password)) {
      const hashed = await bcrypt.hash(user.password, 12);
      await db.user.update({ where: { id: user.id }, data: { password: hashed } });
      console.log(`  Hashed password for User: ${user.email}`);
      hashedCount++;
    }
  }
  console.log(`Users: ${hashedCount} passwords hashed out of ${users.length} total\n`);

  // Hash AdminUser passwords
  const admins = await db.adminUser.findMany({ select: { id: true, email: true, password: true } });
  hashedCount = 0;
  for (const admin of admins) {
    if (!isAlreadyHashed(admin.password)) {
      const hashed = await bcrypt.hash(admin.password, 12);
      await db.adminUser.update({ where: { id: admin.id }, data: { password: hashed } });
      console.log(`  Hashed password for AdminUser: ${admin.email}`);
      hashedCount++;
    }
  }
  console.log(`AdminUsers: ${hashedCount} passwords hashed out of ${admins.length} total\n`);

  // Hash Doctor passwords
  const doctors = await db.doctor.findMany({ select: { id: true, email: true, password: true } });
  hashedCount = 0;
  for (const doctor of doctors) {
    if (!isAlreadyHashed(doctor.password)) {
      const hashed = await bcrypt.hash(doctor.password, 12);
      await db.doctor.update({ where: { id: doctor.id }, data: { password: hashed } });
      console.log(`  Hashed password for Doctor: ${doctor.email}`);
      hashedCount++;
    }
  }
  console.log(`Doctors: ${hashedCount} passwords hashed out of ${doctors.length} total\n`);

  console.log("Password hashing migration complete!");
  await db.$disconnect();
}

hashAllPasswords().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
