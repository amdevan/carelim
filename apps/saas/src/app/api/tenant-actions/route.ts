import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, tenantId, adminEmail, data } = body;

    if (!action || !tenantId) {
      return NextResponse.json({ error: "action and tenantId are required" }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    let result;

    switch (action) {
      case "suspend":
        result = await db.tenant.update({
          where: { id: tenantId },
          data: { status: "suspended" },
        });
        break;

      case "activate":
        result = await db.tenant.update({
          where: { id: tenantId },
          data: { status: "active" },
        });
        break;

      case "reactivate":
        result = await db.tenant.update({
          where: { id: tenantId },
          data: { status: "active" },
        });
        break;

      case "extend_trial": {
        const days = data?.days || 14;
        const currentEnd = tenant.trialEndsAt || new Date();
        const newEnd = new Date(
          Math.max(currentEnd.getTime(), Date.now()) + days * 86400000
        );
        result = await db.tenant.update({
          where: { id: tenantId },
          data: { trialEndsAt: newEnd, status: "trial" },
        });
        break;
      }

      case "change_plan": {
        const { planId } = data || {};
        if (!planId) {
          return NextResponse.json({ error: "planId is required" }, { status: 400 });
        }
        result = await db.tenant.update({
          where: { id: tenantId },
          data: { planId },
        });
        break;
      }

      case "send_invoice": {
        // Create a SaaS invoice for the tenant
        const amount = data?.amount || 0;
        const tax = data?.tax || 0;
        const invoiceCount = await db.saaSInvoice.count();
        const invoiceNo = `INV-${String(invoiceCount + 1).padStart(5, "0")}`;
        result = await db.saaSInvoice.create({
          data: {
            invoiceNo,
            tenantId,
            amount,
            tax,
            total: amount + tax,
            status: "unpaid",
            description: data?.description || "SaaS Subscription Invoice",
          },
        });
        break;
      }

      case "mark_paid": {
        const { invoiceId } = data || {};
        if (invoiceId) {
          result = await db.saaSInvoice.update({
            where: { id: invoiceId },
            data: { status: "paid", paidAt: new Date() },
          });
        } else {
          // Mark all unpaid invoices as paid
          await db.saaSInvoice.updateMany({
            where: { tenantId, status: "unpaid" },
            data: { status: "paid", paidAt: new Date() },
          });
          result = { success: true };
        }
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Log the action
    await db.saaSAuditLog.create({
      data: {
        adminEmail: adminEmail || "unknown",
        tenantId,
        action,
        module: "tenant_management",
        detail: `Action "${action}" performed on tenant: ${tenant.name}`,
      },
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("tenant-actions error:", error);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
