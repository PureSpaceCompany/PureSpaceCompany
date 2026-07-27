import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["MANAGER", "CLEANER"]),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  hourlyRate: z.number().positive(),
  skills: z.array(z.string()).default([]),
  availability: z.any().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") !== "false";

    const staff = await prisma.staffProfile.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: { user: { select: { email: true, role: true } } },
      orderBy: { lastName: "asc" },
    });

    return NextResponse.json({ data: staff });
  } catch (err: any) {
    console.error("[GET /api/staff]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { email, password, role, firstName, lastName, phone, hourlyRate, skills, availability } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role,
        staffProfile: {
          create: { firstName, lastName, phone, hourlyRate, skills, availability },
        },
      },
      include: { staffProfile: true },
    });

    return NextResponse.json({ data: user.staffProfile }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/staff]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
