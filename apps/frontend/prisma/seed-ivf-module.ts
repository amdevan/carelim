import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  console.log("Adding IVF module to platform...");
  const existing = await db.platformModule.findFirst({ where: { name: "IVF & Fertility" } });
  if (!existing) {
    await db.platformModule.create({ data: { name: "IVF & Fertility", description: "IVF cycles, follicular monitoring, embryology, cryobank, pregnancy tracking", category: "healthcare", icon: "Baby", isActive: true } });
    console.log("IVF module added to platform");
  } else {
    console.log("IVF module already exists");
  }
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
