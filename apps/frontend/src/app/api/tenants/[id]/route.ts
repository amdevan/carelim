import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await db.tenant.findUnique({
    where: { id },
    include: {
      plan: true,
      invoices: { orderBy: { date: "desc" }, take: 10 },
      tenantModules: { include: { module: true } },
      usageRecords: { orderBy: { date: "desc" }, take: 5 },
      supportTickets: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(t);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { modules, addModules, toggleModule, ...tenantData } = body;

    // Handle module toggle (enable/disable a single module)
    if (toggleModule) {
      const { moduleId, enabled } = toggleModule;
      const existing = await db.tenantModule.findFirst({
        where: { tenantId: id, moduleId },
      });
      if (existing) {
        await db.tenantModule.update({
          where: { id: existing.id },
          data: { enabled },
        });
      } else {
        // Create TenantModule if it doesn't exist
        await db.tenantModule.create({
          data: { tenantId: id, moduleId, enabled },
        });
      }
      // Re-fetch tenant
      const tenant = await db.tenant.findUnique({
        where: { id },
        include: {
          plan: true,
          tenantModules: { include: { module: true } },
        },
      });
      return NextResponse.json(tenant);
    }

    // Handle adding new modules to a tenant
    if (addModules && Array.isArray(addModules)) {
      for (const mod of addModules) {
        // Find or create platform module
        let platformModule = await db.platformModule.findFirst({
          where: { name: mod.name },
        });
        if (!platformModule) {
          platformModule = await db.platformModule.create({
            data: {
              name: mod.name,
              description: `${mod.name} module`,
              category: mod.category || "general",
            },
          });
        }
        // Check if already assigned
        const existing = await db.tenantModule.findFirst({
          where: { tenantId: id, moduleId: platformModule.id },
        });
        if (!existing) {
          await db.tenantModule.create({
            data: {
              tenantId: id,
              moduleId: platformModule.id,
              enabled: true,
            },
          });
        }
      }
      // Re-fetch tenant
      const tenant = await db.tenant.findUnique({
        where: { id },
        include: {
          plan: true,
          tenantModules: { include: { module: true } },
        },
      });
      return NextResponse.json(tenant);
    }

    // Handle bulk module replacement
    if (modules && Array.isArray(modules)) {
      // Delete existing tenant modules
      await db.tenantModule.deleteMany({ where: { tenantId: id } });
      // Create new ones
      if (modules.length > 0) {
        const moduleCreates = await Promise.all(
          modules.map(async (mod: { key: string; name: string; category: string }) => {
            let platformModule = await db.platformModule.findFirst({
              where: { name: mod.name },
            });
            if (!platformModule) {
              platformModule = await db.platformModule.create({
                data: {
                  name: mod.name,
                  description: `${mod.name} module`,
                  category: mod.category,
                },
              });
            }
            return platformModule;
          })
        );
        await db.tenantModule.createMany({
          data: moduleCreates.map((pm) => ({
            tenantId: id,
            moduleId: pm.id,
            enabled: true,
          })),
        });
      }
    }

    // Update tenant data
    await db.tenant.update({ where: { id }, data: tenantData });

    // Create audit log
    await db.saaSAuditLog.create({
      data: {
        adminEmail: "admin@carelim.com",
        tenantId: id,
        action: "UPDATE",
        module: "Tenants",
        detail: `Updated tenant: ${JSON.stringify(Object.keys(tenantData))}`,
      },
    });

    // Re-fetch with relations
    const updated = await db.tenant.findUnique({
      where: { id },
      include: {
        plan: true,
        tenantModules: { include: { module: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update tenant error:", error);
    return NextResponse.json(
      { error: "Failed to update tenant" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Create audit log before deletion
    const tenant = await db.tenant.findUnique({ where: { id } });
    if (tenant) {
      await db.saaSAuditLog.create({
        data: {
          adminEmail: "admin@carelim.com",
          tenantId: id,
          action: "DELETE",
          module: "Tenants",
          detail: `Deleted clinic: ${tenant.name}`,
        },
      });
    }

    await db.tenant.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete tenant error:", error);
    return NextResponse.json(
      { error: "Failed to delete tenant" },
      { status: 500 }
    );
  }
}
