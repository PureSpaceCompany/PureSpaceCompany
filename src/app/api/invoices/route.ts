import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");

    const userRole = (session.user as any).role;
    const profileId = (session.user as any).profileId;

    const where: any = {};
    if (status) where.status = status;

    if (userRole === "CLIENT") {
      where.clientId = profileId;
    } else if (clientId) {
      where.clientId = clientId;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: {
          select: {
            firstName: true, lastName: true, company: true,
            user: { select: { email: true } },
          },
        },
        job: {
          select: {
            title: true,
            scheduledStart: true,
            flatRate: true,
            property: { select: { name: true, addressLine1: true, city: true, state: true, zip: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: invoices });
  } catch (err: any) {
    console.error("[GET /api/invoices]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
