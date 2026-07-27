import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = (req.nextauth.token as any)?.role;
    const path = req.nextUrl.pathname;

    const isCleanerRoute = path === "/cleaner" || path.startsWith("/cleaner/");
    const isClientRoute  = path === "/client"  || path.startsWith("/client/");

    // Cleaner: only /cleaner/*
    if (role === "CLEANER" && !isCleanerRoute) {
      return NextResponse.redirect(new URL("/cleaner", req.url));
    }

    // Client: only /client/*
    if (role === "CLIENT" && !isClientRoute) {
      return NextResponse.redirect(new URL("/client/bookings", req.url));
    }

    // Admin/Manager: block cleaner-only and client-only routes
    if (["ADMIN", "MANAGER"].includes(role) && (isCleanerRoute || isClientRoute)) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Only run middleware on authenticated requests — unauthenticated handled by layout
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/schedule/:path*",
    "/jobs/:path*",
    "/clients/:path*",
    "/properties/:path*",
    "/staff/:path*",
    "/invoices/:path*",
    "/inbox/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/cleaner/:path*",
    "/client/:path*",
  ],
};
