/**
 * Tenants module (SaaS super-admin) — port of frontend /api/tenants and
 * /api/tenants/[id]. Uses rawDb (super admin sees all tenants).
 * Mounted behind requireSuperAdmin.
 */
import { Router, Request, Response } from "express";
import { rawDb } from "../lib/prisma";
import { fail, wrap } from "../lib/http";

async function listTenants(_req: Request, res: Response) {
  const tenants = await rawDb.tenant.findMany({
    include: {
      plan: true,
      usageRecords: { take: 1, orderBy: { date: "desc" } },
      tenantModules: { include: { module: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(tenants);
}

async function createTenant(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const { modules, ...tenantData } = body;

    const tenant = await rawDb.tenant.create({ data: tenantData });

    if (modules && Array.isArray(modules) && modules.length > 0) {
      const moduleCreates = await Promise.all(
        modules.map(async (mod: { key: string; name: string; category: string }) => {
          let platformModule = await rawDb.platformModule.findFirst({
            where: { name: mod.name },
          });
          if (!platformModule) {
            platformModule = await rawDb.platformModule.create({
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

      await rawDb.tenantModule.createMany({
        data: moduleCreates.map((pm: { id: string }) => ({
          tenantId: tenant.id,
          moduleId: pm.id,
          enabled: true,
        })),
      });
    }

    await rawDb.saaSAuditLog.create({
      data: {
        adminEmail: "admin@carelim.com",
        tenantId: tenant.id,
        action: "CREATE",
        module: "Tenants",
        detail: `Created clinic: ${tenant.name} with ${modules?.length || 0} modules`,
      },
    });

    const created = await rawDb.tenant.findUnique({
      where: { id: tenant.id },
      include: {
        plan: true,
        tenantModules: { include: { module: true } },
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("Create tenant error:", error);
    fail(res, 500, "Failed to create tenant");
  }
}

async function getTenant(req: Request, res: Response) {
  const id = req.params.id as string;
  const t = await rawDb.tenant.findUnique({
    where: { id },
    include: {
      plan: true,
      invoices: { orderBy: { date: "desc" }, take: 10 },
      tenantModules: { include: { module: true } },
      usageRecords: { orderBy: { date: "desc" }, take: 5 },
      supportTickets: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!t) return fail(res, 404, "Not found");
  res.json(t);
}

async function updateTenant(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const body = req.body || {};
    const { modules, addModules, toggleModule, ...tenantData } = body;

    if (toggleModule) {
      const { moduleId, enabled } = toggleModule;
      const existing = await rawDb.tenantModule.findFirst({
        where: { tenantId: id, moduleId },
      });
      if (existing) {
        await rawDb.tenantModule.update({
          where: { id: existing.id },
          data: { enabled },
        });
      } else {
        await rawDb.tenantModule.create({
          data: { tenantId: id, moduleId, enabled },
        });
      }
      const tenant = await rawDb.tenant.findUnique({
        where: { id },
        include: { plan: true, tenantModules: { include: { module: true } } },
      });
      return res.json(tenant);
    }

    if (addModules && Array.isArray(addModules)) {
      for (const mod of addModules) {
        let platformModule = await rawDb.platformModule.findFirst({
          where: { name: mod.name },
        });
        if (!platformModule) {
          platformModule = await rawDb.platformModule.create({
            data: {
              name: mod.name,
              description: `${mod.name} module`,
              category: mod.category || "general",
            },
          });
        }
        const existing = await rawDb.tenantModule.findFirst({
          where: { tenantId: id, moduleId: platformModule.id },
        });
        if (!existing) {
          await rawDb.tenantModule.create({
            data: {
              tenantId: id,
              moduleId: platformModule.id,
              enabled: true,
            },
          });
        }
      }
      const tenant = await rawDb.tenant.findUnique({
        where: { id },
        include: { plan: true, tenantModules: { include: { module: true } } },
      });
      return res.json(tenant);
    }

    if (modules && Array.isArray(modules)) {
      await rawDb.tenantModule.deleteMany({ where: { tenantId: id } });
      if (modules.length > 0) {
        const moduleCreates = await Promise.all(
          modules.map(async (mod: { key: string; name: string; category: string }) => {
            let platformModule = await rawDb.platformModule.findFirst({
              where: { name: mod.name },
            });
            if (!platformModule) {
              platformModule = await rawDb.platformModule.create({
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
        await rawDb.tenantModule.createMany({
          data: moduleCreates.map((pm: { id: string }) => ({
            tenantId: id,
            moduleId: pm.id,
            enabled: true,
          })),
        });
      }
    }

    await rawDb.tenant.update({ where: { id }, data: tenantData });

    await rawDb.saaSAuditLog.create({
      data: {
        adminEmail: "admin@carelim.com",
        tenantId: id,
        action: "UPDATE",
        module: "Tenants",
        detail: `Updated tenant: ${JSON.stringify(Object.keys(tenantData))}`,
      },
    });

    const updated = await rawDb.tenant.findUnique({
      where: { id },
      include: { plan: true, tenantModules: { include: { module: true } } },
    });

    res.json(updated);
  } catch (error) {
    console.error("Update tenant error:", error);
    fail(res, 500, "Failed to update tenant");
  }
}

async function deleteTenant(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const tenant = await rawDb.tenant.findUnique({ where: { id } });
    if (tenant) {
      await rawDb.saaSAuditLog.create({
        data: {
          adminEmail: "admin@carelim.com",
          tenantId: id,
          action: "DELETE",
          module: "Tenants",
          detail: `Deleted clinic: ${tenant.name}`,
        },
      });
    }

    await rawDb.tenant.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error("Delete tenant error:", error);
    fail(res, 500, "Failed to delete tenant");
  }
}

export function tenantsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listTenants));
  r.post("/", wrap(createTenant));
  r.get("/:id", wrap(getTenant));
  r.patch("/:id", wrap(updateTenant));
  r.delete("/:id", wrap(deleteTenant));
  return r;
}
