import { NextRequest, NextResponse } from "next/server";

type Handler = (req: NextRequest, ctx: any) => Promise<NextResponse>;

/**
 * Wraps a route handler so any uncaught exception returns a JSON error
 * instead of an empty/HTML response that breaks `res.json()` on the client.
 */
export function withErrorHandler(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err: any) {
      console.error(`[API ERROR] ${req.method} ${req.nextUrl?.pathname}`, err);
      return NextResponse.json(
        { error: err?.message ?? "Internal server error" },
        { status: 500 }
      );
    }
  };
}
