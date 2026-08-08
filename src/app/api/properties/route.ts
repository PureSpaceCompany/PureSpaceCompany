import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const createSchema = z.object({
  clientId: z.string(),
  name: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(1),
  state: z.string().min(2),
  zip: z.string().min(5),
  entryInstructions: z.string().optional().nullable(),
  gateCode: z.string().optional().nullable(),
  petNotes: z.string().optional().nullable(),
  specialNotes: z.string().optional().nullable(),
  cleaningFee: z.coerce.number().nonnegative().optional().nullable(),
  soloCleanMins: z.coerce.number().int().positive().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    const props = await prisma.property.findMany({
      where: {
        ...(clientId ? { clientId } : {}),
        isActive: true,
      },
      include: { _count: { select: { jobs: true } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: props });
  } catch (err: any) {
    console.error("[GET /api/properties]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const property = await prisma.property.create({ data: parsed.data });
    return NextResponse.json({ data: property }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/properties]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
