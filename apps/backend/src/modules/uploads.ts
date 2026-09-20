/**
 * Uploads & file serving — port of frontend /api/upload/logo and
 * /api/files/[id].
 *
 * Files live in the DB (UploadedFile rows) so they survive container
 * redeploys. POST /upload/logo requires a valid JWT (the Next middleware
 * default-deny covered it; only tenant settings pages call it). GET
 * /files/:id is public — logos must render on the login screen and in
 * prints (IDs are unguessable cuids).
 */
import { Request, Response, NextFunction, Router } from "express";
import multer from "multer";
import { rawDb } from "../lib/prisma";
import { fail, wrap } from "../lib/http";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml", "image/gif"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
});

async function uploadLogo(req: Request, res: Response) {
  try {
    const file = req.file;

    if (!file) {
      return fail(res, 400, "No file provided");
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return fail(res, 400, "Invalid file type. Allowed: PNG, JPG, WebP, SVG, GIF");
    }

    if (file.size > MAX_SIZE) {
      return fail(res, 400, "File too large. Max 2MB");
    }

    // Store in DB so uploads survive container redeploys (public/ is not
    // served for runtime-written files in Next standalone output).
    const bytes = file.buffer;
    const row = await rawDb.uploadedFile.create({
      data: { mime: file.mimetype, size: bytes.length, data: bytes.toString("base64") },
      select: { id: true },
    });

    return res.json({ url: `/api/files/${row.id}`, id: row.id });
  } catch (error) {
    console.error("Logo upload error:", error);
    return fail(res, 500, "Upload failed");
  }
}

/** Multer size-limit errors → the same message the Next route returned. */
function multerError(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if ((err as { code?: string })?.code === "LIMIT_FILE_SIZE") {
    return fail(res, 400, "File too large. Max 2MB");
  }
  next(err);
}

export function uploadLogoRouter(): Router {
  const r = Router();
  r.post("/logo", upload.single("file"), wrap(uploadLogo));
  r.use(multerError);
  return r;
}

async function serveFile(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const file = await rawDb.uploadedFile.findUnique({ where: { id }, select: { mime: true, data: true } });
    if (!file) return fail(res, 404, "Not found");

    const bytes = Buffer.from(file.data, "base64");
    res.setHeader("Content-Type", file.mime);
    res.setHeader("Content-Length", String(bytes.length));
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).end(bytes);
  } catch (error) {
    console.error("Error serving file:", error);
    return fail(res, 500, "Failed to serve file");
  }
}

export function filesRouter(): Router {
  const r = Router();
  r.get("/:id", wrap(serveFile));
  return r;
}