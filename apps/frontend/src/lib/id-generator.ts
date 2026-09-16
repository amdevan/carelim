/**
 * Atomic ID/sequence generator that prevents race conditions.
 * Uses the unique constraint on code fields + retry on P2002 to guarantee no duplicates.
 */
import { nanoid } from "nanoid";

const MAX_RETRIES = 5;

/**
 * Generate the next sequential number for a prefix by reading the latest code.
 * Caller should wrap in a try/catch and retry on Prisma P2002 (unique constraint).
 */
export async function getNextSequenceNumber(
  prefix: string,
  latestQuery: () => Promise<{ code: string }[]>
): Promise<string> {
  const latest = await latestQuery();
  let nextNum = 1;
  if (latest.length > 0) {
    const match = latest[0].code.match(new RegExp(`${escapeRegex(prefix)}(\\d+)`));
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  return `${prefix}${String(nextNum).padStart(5, "0")}`;
}

/**
 * Create a record with unique code, retrying on P2002 (unique constraint violation).
 * This is the proper atomic approach — the DB enforces uniqueness, and we retry on conflict.
 */
export async function createWithRetry<T>(
  createFn: () => Promise<T>,
  regenerateFn: () => Promise<void>,
): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await createFn();
    } catch (error: any) {
      if (error?.code === "P2002") {
        // Unique constraint violation — regenerate the code and retry
        await regenerateFn();
        continue;
      }
      throw error; // Non-constraint errors propagate immediately
    }
  }
  throw new Error(`Failed to create record after ${MAX_RETRIES} attempts (unique constraint conflicts)`);
}

/**
 * Generate a unique nanoid-based code.
 */
export function generateNanoCode(prefix: string, length: number = 8): string {
  return `${prefix}${nanoid(length).toUpperCase()}`;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
