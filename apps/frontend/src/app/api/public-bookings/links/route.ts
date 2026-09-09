import { NextRequest, NextResponse } from "next/server";
import { rawDb as db } from "@/lib/db";
import { getAuthTenantId } from "@/lib/auth";

function generateSlug(...parts: (string | null | undefined)[]): string {
  const base = parts.filter(Boolean).join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base}-${Date.now().toString(36)}`;
}

// GET — list booking links
export async function GET(req: NextRequest) {
  try {
    const tenantId = getAuthTenantId(req);
    const where = tenantId ? { tenantId } : {};

    const links = await db.bookingLink.findMany({
      where,
      include: { branch: { select: { id: true, name: true } }, doctor: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(links);
  } catch (error) {
    console.error("Failed to fetch booking links:", error);
    return NextResponse.json({ error: "Failed to fetch links" }, { status: 500 });
  }
}

// POST — create booking link(s)
// Supports:
//   - Single link: { doctorName, department, branchId, doctorId, label }
//   - Generate all branches: { generateAllBranches: true, doctorId?, department? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = getAuthTenantId(req);
    const origin = req.headers.get("origin") || "http://localhost:3000";

    // Verify tenant exists if provided
    let validTenantId: string | null = null;
    if (tenantId) {
      const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
      if (tenant) validTenantId = tenant.id;
    }

    // Get or create config (only if tenant exists)
    let configId: string | null = null;
    if (validTenantId) {
      let config = await db.bookingConfig.findUnique({ where: { tenantId: validTenantId } });
      if (!config) {
        config = await db.bookingConfig.create({ data: { tenantId: validTenantId } });
      }
      configId = config.id;
    }

    // Generate links for all branches
    if (body.generateAllBranches) {
      const where: any = {};
      if (validTenantId) where.tenantId = validTenantId;

      const branches = await db.branch.findMany({ where, select: { id: true, name: true } });
      if (branches.length === 0) {
        return NextResponse.json({ error: "No branches found" }, { status: 400 });
      }

      // Get doctor info if doctorId provided
      let doctorInfo = null;
      if (body.doctorId) {
        doctorInfo = await db.doctor.findUnique({
          where: { id: body.doctorId },
          select: { id: true, name: true, specialization: true },
        });
      }

      const createdLinks = [];
      for (const branch of branches) {
        const slug = generateSlug(branch.name, doctorInfo?.name, body.department);
        const url = `${origin}/book/${slug}?branch=${branch.id}${body.doctorId ? `&doctor=${body.doctorId}` : ""}`;

        const link = await db.bookingLink.create({
          data: {
            tenantId: validTenantId,
            branchId: branch.id,
            configId,
            doctorId: body.doctorId || null,
            doctorName: doctorInfo?.name || body.doctorName || null,
            department: body.department || doctorInfo?.specialization || null,
            label: body.label || `${branch.name}${doctorInfo ? ` - ${doctorInfo.name}` : ""}${body.department ? ` (${body.department})` : ""}`,
            url,
            slug,
            active: true,
          },
        });
        createdLinks.push(link);
      }

      return NextResponse.json(createdLinks, { status: 201 });
    }

    // Single link creation
    const slug = generateSlug(body.doctorName, body.department, body.label);
    const branchParam = body.branchId ? `?branch=${body.branchId}` : "";
    const doctorParam = body.doctorId ? `${branchParam ? "&" : "?"}doctor=${body.doctorId}` : "";
    const url = `${origin}/book/${slug}${branchParam}${doctorParam}`;

    // Resolve doctor name if doctorId provided but no doctorName
    let doctorName = body.doctorName || null;
    let department = body.department || null;
    if (body.doctorId && !doctorName) {
      const doc = await db.doctor.findUnique({
        where: { id: body.doctorId },
        select: { name: true, specialization: true },
      });
      doctorName = doc?.name || null;
      department = department || doc?.specialization || null;
    }

    const link = await db.bookingLink.create({
      data: {
        tenantId: validTenantId,
        branchId: body.branchId || null,
        configId,
        doctorId: body.doctorId || null,
        doctorName,
        department,
        label: body.label || null,
        url,
        slug,
        active: true,
      },
    });
    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("Failed to create booking link:", error);
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  }
}
