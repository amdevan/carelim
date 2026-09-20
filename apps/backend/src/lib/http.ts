/**
 * HTTP helpers mirroring the JSON shapes the frontend clients already expect
 * (NextResponse.json equivalents) plus uniform Prisma error mapping.
 */
import { Request, Response, NextFunction } from "express";

export function json(res: Response, data: unknown, status = 200) {
  return res.status(status).json(data);
}

export function fail(res: Response, status: number, error: string) {
  return res.status(status).json({ error });
}

/** Map Prisma errors to the same status codes the Next routes returned. */
export function prismaError(res: Response, error: unknown, fallback: string): Response {
  const e = error as { name?: string; message?: string; code?: string };
  if (e?.name === "PrismaClientValidationError") {
    return fail(res, 400, "Invalid request");
  }
  if (e?.name === "PrismaClientKnownRequestError") {
    if (e.code === "P2025") return fail(res, 404, "Record not found");
    if (e.message?.includes("Unique constraint")) return fail(res, 400, "A record with this value already exists");
    if (e.message?.includes("Foreign key constraint")) return fail(res, 400, "Referenced record not found");
    return fail(res, 500, fallback);
  }
  if (e?.name === "PrismaClientUnknownRequestError") {
    return fail(res, 503, "Database connection error");
  }
  return fail(res, 500, fallback);
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Express 4-style async wrapper (Express 5 also auto-forwards, this keeps stack traces clean). */
export function wrap(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

export function clientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return req.ip || "127.0.0.1";
}
