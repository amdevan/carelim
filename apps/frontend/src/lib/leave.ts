import { db } from "@/lib/db";

const LEAVE_TYPES = ["casual", "sick", "earned", "unpaid"];
const STATUSES = ["pending", "approved", "rejected"];

/** Build a whitelisted LeaveRequest create payload from client input.
 *  UI panels send extra keys (days, appliedAt, staffName, department) that
 *  don't exist on the model — passing them raw made Prisma fail with
 *  "Unknown argument" errors. */
export async function buildLeaveCreateData(body: Record<string, unknown>) {
  let staffId = typeof body.staffId === "string" ? body.staffId : "";
  if (!staffId && typeof body.staffName === "string" && body.staffName.trim()) {
    // SaaS HR panel submits by staff name — resolve to a staff record
    const staff = await db.staff.findFirst({ where: { name: body.staffName.trim() }, select: { id: true } });
    if (!staff) return { error: `No staff member named "${body.staffName}" found` } as const;
    staffId = staff.id;
  }
  if (!staffId) return { error: "staffId or staffName is required" } as const;
  if (!body.startDate || !body.endDate) return { error: "startDate and endDate are required" } as const;
  const start = new Date(String(body.startDate));
  const end = new Date(String(body.endDate));
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { error: "Invalid start/end date" } as const;
  return {
    data: {
      staffId,
      type: typeof body.type === "string" && LEAVE_TYPES.includes(body.type) ? body.type : "casual",
      startDate: start,
      endDate: end,
      reason: typeof body.reason === "string" ? body.reason : null,
      status: typeof body.status === "string" && STATUSES.includes(body.status) ? body.status : "pending",
    },
  } as const;
}
