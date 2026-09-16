import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

/**
 * POST /api/admin/import-csv
 * Import data from CSV content.
 * Body: { type: "patients"|"doctors"|"staff"|"medicines", branchId: string, csvData: string }
 */
export const POST = withTenant(async (req: NextRequest) => {
  const { type, branchId, csvData } = await req.json();

  if (!type || !branchId || !csvData) {
    return NextResponse.json({ error: "type, branchId, and csvData are required" }, { status: 400 });
  }

  // Verify branch exists
  const branch = await db.branch.findUnique({ where: { id: branchId } });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  // Parse CSV
  const lines = csvData.trim().split("\n");
  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV must have headers and at least one data row" }, { status: 400 });
  }

  const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase().replace(/\s+/g, ""));
  const rows = lines.slice(1).map((line: string) => {
    const values = line.split(",").map((v: string) => v.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h: string, i: number) => { obj[h] = values[i] || ""; });
    return obj;
  });

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  // For doctor imports, ensure a default department exists
  let defaultDepartmentId: string | null = null;
  if (type === "doctors") {
    const dept = await db.department.findFirst({ where: { branchId } });
    if (dept) {
      defaultDepartmentId = dept.id;
    } else {
      const created = await db.department.create({
        data: { name: "General", code: "GEN", branchId },
      });
      defaultDepartmentId = created.id;
    }
  }

  for (const row of rows) {
    try {
      switch (type) {
        case "patients": {
          const name = row.name || row.patientname || row.patient_name || "";
          const phone = row.phone || row.mobile || row.contact || "";
          const email = row.email || "";
          const gender = row.gender || row.sex || "";
          const bloodGroup = row.bloodgroup || row.blood_group || row.blood || "";
          const address = row.address || row.location || "";

          if (!name) { skipped++; continue; }

          await db.patient.create({
            data: {
              name,
              patientCode: `PAT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
              phone,
              email: email || null,
              gender: gender || null,
              bloodGroup: bloodGroup || null,
              address: address || null,
              branchId,
              status: "active",
            },
          });
          imported++;
          break;
        }
        case "doctors": {
          const name = row.name || row.doctorname || row.doctor_name || "";
          const specialization = row.specialization || row.specialty || row.department || "";
          const phone = row.phone || row.mobile || row.contact || "";
          const email = row.email || "";
          const qualification = row.qualification || row.degree || row.education || "";

          if (!name) { skipped++; continue; }

          await db.doctor.create({
            data: {
              name,
              email: email || `import-${Date.now()}@placeholder.local`,
              password: "changeme",
              phone: phone || "0000000000",
              specialization: specialization || "General",
              qualification: qualification || "MBBS",
              departmentId: defaultDepartmentId!,
              licenseNumber: `IMPORT-${Date.now()}`,
              branchId,
              status: "active",
            },
          });
          imported++;
          break;
        }
        case "staff": {
          const name = row.name || row.staffname || row.staff_name || "";
          const role = row.role || row.position || row.designation || "";
          const department = row.department || row.dept || "";
          const phone = row.phone || row.mobile || row.contact || "";
          const email = row.email || "";

          if (!name) { skipped++; continue; }

          await db.staff.create({
            data: {
              name,
              role: role || "receptionist",
              department: department || null,
              phone: phone || "0000000000",
              email: email || `import-staff-${Date.now()}@placeholder.local`,
              password: "changeme",
              branchId,
              status: "active",
            },
          });
          imported++;
          break;
        }
        case "medicines": {
          const name = row.name || row.medicinename || row.medicine_name || row.drug || "";
          const genericName = row.genericname || row.generic_name || row.generic || "";
          const category = row.category || row.type || "";
          const strength = row.strength || row.dosage || "";
          const dosageForm = row.form || row.formtype || row.dosageform || "";
          const manufacturer = row.manufacturer || row.brand || row.company || "";
          const salePrice = parseFloat(row.saleprice || row.sale_price || row.price || row.mrp || "0") || 0;
          const buyPrice = parseFloat(row.buyprice || row.buy_price || row.cost || "0") || 0;
          const stockQty = parseInt(row.stock || row.quantity || row.qty || "0") || 0;

          if (!name) { skipped++; continue; }

          await db.medicine.create({
            data: {
              name,
              genericName: genericName || null,
              category: category || "General",
              strength: strength || null,
              dosageForm: dosageForm || null,
              manufacturer: manufacturer || null,
              salePrice,
              purchasePrice: buyPrice,
              stockQty,
              batchNo: `IMPORT-${Date.now()}`,
              expiryDate: new Date("2027-12-31"),
              branchId,
              status: "active",
            },
          });
          imported++;
          break;
        }
        default:
          skipped++;
      }
    } catch (err) {
      errors.push(`Row ${imported + skipped + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
      skipped++;
    }
  }

  return NextResponse.json({
    success: true,
    type,
    branch: { id: branch.id, name: branch.name },
    imported,
    skipped,
    errors: errors.slice(0, 10), // Return first 10 errors
  });
});
