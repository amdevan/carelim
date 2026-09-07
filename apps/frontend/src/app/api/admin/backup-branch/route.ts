import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

/**
 * POST /api/admin/backup-branch
 * Copies all data from source branch to target branch.
 * Body: { sourceBranchId: string, targetBranchId: string }
 */
export const POST = withTenant(async (req: NextRequest) => {
  const { sourceBranchId, targetBranchId } = await req.json();

  if (!sourceBranchId || !targetBranchId) {
    return NextResponse.json({ error: "sourceBranchId and targetBranchId are required" }, { status: 400 });
  }

  if (sourceBranchId === targetBranchId) {
    return NextResponse.json({ error: "Source and target branches must be different" }, { status: 400 });
  }

  // Verify both branches exist
  const [sourceBranch, targetBranch] = await Promise.all([
    db.branch.findUnique({ where: { id: sourceBranchId } }),
    db.branch.findUnique({ where: { id: targetBranchId } }),
  ]);

  if (!sourceBranch || !targetBranch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const results: Record<string, number> = {};

  // Tables with branchId that can be backed up
  const tablesWithBranchId = [
    { model: "patient", fields: ["name", "patientCode", "phone", "email", "gender", "dob", "age", "bloodGroup", "address", "city", "status"] },
    { model: "doctor", fields: ["name", "specialization", "phone", "email", "qualification", "experience", "consultationFee", "status"] },
    { model: "staff", fields: ["name", "role", "department", "phone", "email", "salary", "status"] },
    { model: "department", fields: ["name", "code", "description", "status"] },
    { model: "medicine", fields: ["name", "genericName", "category", "strength", "form", "manufacturer", "buyPrice", "salePrice", "stock", "status"] },
  ];

  for (const table of tablesWithBranchId) {
    try {
      // Get all records from source branch
      const sourceRecords = await (db as any)[table.model].findMany({
        where: { branchId: sourceBranchId },
        select: { id: true, ...Object.fromEntries(table.fields.map(f => [f, true])) },
      });

      if (sourceRecords.length === 0) {
        results[table.model] = 0;
        continue;
      }

      // Create copies in target branch with new IDs
      let count = 0;
      for (const record of sourceRecords) {
        const { id: _oldId, ...data } = record;
        await (db as any)[table.model].create({
          data: {
            ...data,
            branchId: targetBranchId,
          },
        });
        count++;
      }
      results[table.model] = count;
    } catch (error) {
      results[table.model] = -1;
    }
  }

  return NextResponse.json({
    success: true,
    source: { id: sourceBranch.id, name: sourceBranch.name },
    target: { id: targetBranch.id, name: targetBranch.name },
    backedUp: results,
  });
});
