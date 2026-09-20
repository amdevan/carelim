import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Serves uploaded files (logos) stored in the database.
 * Public read: logos must render on the login screen and in prints.
 * IDs are unguessable cuids.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const file = await db.uploadedFile.findUnique({ where: { id }, select: { mime: true, data: true } });
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const bytes = Buffer.from(file.data, "base64");
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": file.mime,
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 });
  }
}
