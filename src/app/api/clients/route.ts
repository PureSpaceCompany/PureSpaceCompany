import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const createClientSchema = z.object({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(1),
  state: z.string().min(2),
  zip: z.string().min(5),
  entryInstructions: z.string().optional().nullable(),
  gateCode: z.string().optional().nullable(),
  petNotes: z.string().optional().nullable(),
  specialNotes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const clients = await prisma.clientProfile.findMany({
      where: search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { company: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: { user: { select: { email: true } }, _count: { select: { jobs: true } } },
      orderBy: { lastName: "asc" },
    });

    return NextResponse.json({ data: clients });
  } catch (err: any) {
    console.error("[GET /api/clients]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    if (!data.company?.trim() && !data.firstName?.trim()) {
      return NextResponse.json({ error: "Provide either a company name or a first name" }, { status: 400 });
    }

    const client = await prisma.clientProfile.create({ data });
    return NextResponse.json({ data: client }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/clients]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
