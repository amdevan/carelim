/**
 * Serial patient file numbers: PT-00001, PT-00002, …
 *
 * patientCode is globally unique across tenants, so the serial allocator
 * scans ALL patients (rawDb) for the highest numeric "PT-<digits>" code.
 * The caller's client performs the actual create, so tenant tagging and
 * the write-payload sanitizer still apply.
 */
import { rawDb } from "./prisma";

const PT_RE = /^PT-(\d+)$/;

export async function nextPatientCode(): Promise<string> {
  const rows: { patientCode: string }[] = await rawDb.patient.findMany({
    where: { patientCode: { startsWith: "PT-" } },
    select: { patientCode: true },
  });
  let max = 0;
  for (const r of rows) {
    const m = PT_RE.exec(r.patientCode);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `PT-${String(max + 1).padStart(5, "0")}`;
}

function isPatientCodeCollision(e: any): boolean {
  if (e?.code !== "P2002") return false;
  const target = e?.meta?.target;
  const fields = Array.isArray(target) ? target : target ? [target] : [];
  return fields.some((f: any) => String(f).includes("patientCode"));
}

/**
 * Creates a Patient with the next serial code, retrying on code collisions.
 * Pass the client that should perform the create (`db` for tenant contexts,
 * `rawDb` for unauthenticated flows like public booking / patient register).
 */
export async function createPatientWithSerialCode(
  client: any,
  data: Record<string, unknown>,
): Promise<any> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const patientCode = await nextPatientCode();
    try {
      return await client.patient.create({ data: { ...data, patientCode } });
    } catch (e: any) {
      if (isPatientCodeCollision(e) && attempt < 5) continue;
      throw e;
    }
  }
  throw new Error("Unable to allocate a unique patient code");
}