import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const properties = await prisma.property.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        zip: true,
        lat: true,
        lng: true,
        gateCode: true,
        petNotes: true,
        entryInstructions: true,
        specialNotes: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            phone: true,
          },
        },
        _count: {
          select: {
            jobs: true,
          },
        },
        jobs: {
          select: {
            id: true,
            title: true,
            status: true,
            serviceType: true,
            scheduledStart: true,
            scheduledEnd: true,
            flatRate: true,
            cleanerPay: true,
            assignments: {
              select: { staff: { select: { firstName: true, lastName: true } } },
              take: 2,
            },
            invoice: { select: { total: true, status: true } },
          },
          orderBy: { scheduledStart: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const mapped = properties.map((p) => ({
      id: p.id,
      name: p.name,
      addressLine1: p.addressLine1,
      addressLine2: p.addressLine2,
      city: p.city,
      state: p.state,
      zip: p.zip,
      lat: p.lat,
      lng: p.lng,
      gateCode: p.gateCode,
      petNotes: p.petNotes,
      entryInstructions: p.entryInstructions,
      specialNotes: p.specialNotes,
      client: p.client,
      totalJobs: p._count.jobs,
      completedJobs: p.jobs.filter((j) => j.status === "COMPLETED").length,
      jobs: p.jobs,
    }));

    return NextResponse.json({ data: mapped });
  } catch (err: any) {
    console.error("[GET /api/properties/map]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
