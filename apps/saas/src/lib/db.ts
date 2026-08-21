import { PrismaClient } from "@carelim/database";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let _db: PrismaClient | undefined;

export function getDb(): PrismaClient {
  if (!_db) {
    _db = globalForPrisma.prisma ?? new PrismaClient();
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = _db;
  }
  return _db;
}

export const db = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});
