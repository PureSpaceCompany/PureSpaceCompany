import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { JOB_CALENDAR_COLOR, clientDisplayName } from "@/lib/utils";
import { JobStatus } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const userRole = (session.user as any).role;
    const profileId = (session.user as any).profileId;

    const where: any = { status: { not: "CANCELLED" } };

    if (from || to) {
      where.scheduledStart = {};
      if (from) where.scheduledStart.gte = new Date(from);
      if (to) where.scheduledStart.lte = new Date(to);
    }

    if (userRole === "CLEANER") {
      where.assignments = { some: { staffId: profileId } };
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        client: { select: { firstName: true, lastName: true, company: true } },
        assignments: { include: { staff: { select: { firstName: true, lastName: true } } } },
      },
    });

    const events = jobs.map((job) => ({
      id: job.id,
      title: `${clientDisplayName(job.client)} – ${job.title}`,
      start: job.scheduledStart.toISOString(),
      end: job.scheduledEnd.toISOString(),
      backgroundColor: JOB_CALENDAR_COLOR[job.status as JobStatus],
      borderColor: JOB_CALENDAR_COLOR[job.status as JobStatus],
      extendedProps: {
        status: job.status,
        clientName: clientDisplayName(job.client),
        assignees: job.assignments.map((a) => `${a.staff.firstName} ${a.staff.lastName}`),
      },
    }));

    return NextResponse.json({ data: events });
  } catch (err: any) {
    console.error("[GET /api/schedule]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
