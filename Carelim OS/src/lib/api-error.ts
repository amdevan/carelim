import { NextResponse } from "next/server";

/**
 * Standard error response for API routes.
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiError(statusCode: number, message: string) {
  return NextResponse.json({ error: message }, { status: statusCode });
}

/**
 * Wrapper for API route handlers that adds try/catch error handling.
 * Usage: export const GET = withErrorHandling(async (req) => { ... });
 */
export function withErrorHandling(
  handler: (req: Request, context?: any) => Promise<NextResponse>
) {
  return async (req: Request, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return apiError(error.statusCode, error.message);
      }
      console.error("API Error:", error);
      return apiError(500, "Internal server error");
    }
  };
}
