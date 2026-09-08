import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
async function main() {
  // Create role
  const role = await db.role.upsert({
    where: { id: "admin-role" },
    update: {},
    create: { id: "admin-role", name: "Administrator" },
  });
  // Create admin user
  const hash = await bcrypt.hash("carelim123", 12);
  const user = await db.user.upsert({
    where: { email: "admin@carelim.health" },
    update: { password: hash, status: "active" },
    create: {
      id: "user-admin-1",
      name: "Admin",
      email: "admin@carelim.health",
      password: hash,
      roleId: role.id,
      status: "active",
    },
  });
  console.log("Admin user created:", user.email, user.id);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
