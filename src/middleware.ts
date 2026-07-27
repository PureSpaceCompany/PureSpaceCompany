import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = (req.nextauth.token as any)?.role;
    const path = req.nextUrl.pathname;

    // Cleaner: only /cleaner/*
    if (role === "CLEANER" && !path.startsWith("/cleaner")) {
      return NextResponse.redirect(new URL("/cleaner", req.url));
    }

    // Client: only /client/*
    if (role === "CLIENT" && !path.startsWith("/client")) {
      return NextResponse.redirect(new URL("/client/bookings", req.url));
    }

    // Admin/Manager: block cleaner and client routes
    if (["ADMIN", "MANAGER"].includes(role) && (path.startsWith("/cleaner") || path.startsWith("/client"))) {
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
