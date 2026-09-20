import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml", "image/gif"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Allowed: PNG, JPG, WebP, SVG, GIF" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Max 2MB" }, { status: 400 });
    }

    // Store in DB so uploads survive container redeploys (public/ is not
    // served for runtime-written files in Next standalone output).
    const bytes = Buffer.from(await file.arrayBuffer());
    const row = await db.uploadedFile.create({
      data: { mime: file.type, size: bytes.length, data: bytes.toString("base64") },
      select: { id: true },
    });

    return NextResponse.json({ url: `/api/files/${row.id}`, id: row.id });
  } catch (error) {
    console.error("Logo upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
