import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Lazy initialization — don't create PrismaClient at import time (avoids build-time errors)
let _db: PrismaClient | undefined

export function getDb(): PrismaClient {
  if (!_db) {
    _db = globalForPrisma.prisma ?? new PrismaClient()
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _db
  }
  return _db
}

// Keep `db` as a getter for backward compatibility
export const db = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getDb() as any)[prop]
  },
})