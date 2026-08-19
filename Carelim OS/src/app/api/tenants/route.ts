import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const tenants = await db.tenant.findMany({
    include: {
      plan: true,
      usageRecords: { take: 1, orderBy: { date: "desc" } },
      tenantModules: { include: { module: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tenants);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { modules, ...tenantData } = body;

    // Create the tenant
    const tenant = await db.tenant.create({ data: tenantData });

    // If modules were selected, create TenantModule records
    if (modules && Array.isArray(modules) && modules.length > 0) {
      // Find or create PlatformModule records for each selected module
      const moduleCreates = await Promise.all(
        modules.map(async (mod: { key: string; name: string; category: string }) => {
          // Find or create the platform module
          let platformModule = await db.platformModule.findFirst({
            where: { name: mod.name },
          });
          if (!platformModule) {
            platformModule = await db.platformModule.create({
              data: {
                name: mod.name,
                description: `${mod.name} module for healthcare management`,
                category: mod.category,
              },
            });
          }
          return platformModule;
        })
      );

      // Create TenantModule records
      await db.tenantModule.createMany({
        data: moduleCreates.map((pm) => ({
          tenantId: tenant.id,
          moduleId: pm.id,
          enabled: true,
        })),
      });
    }

    // Create audit log
    await db.saaSAuditLog.create({
      data: {
        adminEmail: "admin@carelim.com",
        tenantId: tenant.id,
        action: "CREATE",
        module: "Tenants",
        detail: `Created clinic: ${tenant.name} with ${modules?.length || 0} modules`,
      },
    });

    // Re-fetch with relations
    const created = await db.tenant.findUnique({
      where: { id: tenant.id },
      include: {
        plan: true,
        tenantModules: { include: { module: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Create tenant error:", error);
    return NextResponse.json(
      { error: "Failed to create tenant" },
      { status: 500 }
    );
  }
}
