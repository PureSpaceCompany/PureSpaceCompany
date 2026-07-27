import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const schema = z.object({
  companyName:        z.string().min(1),
  supportEmail:       z.string().email().or(z.literal("")).optional(),
  phone:              z.string().optional(),
  invoicePaymentDays: z.number().int().min(1).max(365).optional(),
  invoiceNotes:       z.string().optional(),
});

export async function GET() {
  try {
    const settings = await prisma.appSettings.upsert({
      where:  { id: "default" },
      update: {},
      create: { id: "default" },
    });
    return NextResponse.json({ data: settings });
  } catch (err: any) {
    console.error("[GET /api/settings]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const settings = await prisma.appSettings.upsert({
      where:  { id: "default" },
      update: parsed.data,
      create: { id: "default", ...parsed.data },
    });
    return NextResponse.json({ data: settings });
  } catch (err: any) {
    console.error("[PATCH /api/settings]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
