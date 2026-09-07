import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

/**
 * POST /api/admin/move-to-general
 * Moves all data (patients, doctors, appointments, etc.) to the "General" branch.
 * Creates a General branch if it doesn't exist.
 */
export const POST = withTenant(async () => {
  // 1. Find or create the General branch
  let generalBranch = await db.branch.findFirst({
    where: { clinicType: "General" },
  });

  if (!generalBranch) {
    generalBranch = await db.branch.create({
      data: {
        name: "General",
        code: "GEN-001",
        clinicType: "General",
        status: "active",
        capacity: 100,
        operatingHours: "09:00-17:00",
      },
    });
  }

  const branchId = generalBranch.id;
  const results: Record<string, number> = {};

  // 2. Update all tables with branchId
  const tablesToUpdate = [
    "patient",
    "doctor",
    "staff",
    "appointment",
    "prescription",
    "medicine",
    "pharmacySale",
    "invoice",
    "labTest",
    "radiologyTest",
    "expense",
    "patientPayment",
    "clinicalNote",
    "department",
    "user",
  ];

  for (const table of tablesToUpdate) {
    try {
      // Update records where branchId is null or different from generalBranch
      const result = await (db as any)[table].updateMany({
        where: {
          OR: [
            { branchId: null },
            { branchId: { not: branchId } },
          ],
        },
        data: { branchId },
      });
      results[table] = result.count;
    } catch (error) {
      results[table] = -1; // Error
    }
  }

  // 3. Update CRM/MS tables that use clinicId instead of branchId
  const crmTables = [
    "patientSource",
    "referral",
    "mSLead",
    "cRMDeal",
    "commissionSettlement",
  ];

  for (const table of crmTables) {
    try {
      const result = await (db as any)[table].updateMany({
        where: {
          OR: [
            { clinicId: null },
            { clinicId: { not: branchId } },
          ],
        },
        data: { clinicId: branchId },
      });
      results[table] = result.count;
    } catch (error) {
      results[table] = -1; // Error
    }
  }

  return NextResponse.json({
    success: true,
    generalBranch: {
      id: generalBranch.id,
      name: generalBranch.name,
      code: generalBranch.code,
    },
    updated: results,
  });
});
