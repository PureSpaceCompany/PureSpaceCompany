import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "MANAGER", "CLEANER", "CLIENT"]),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        staffProfile: { select: { firstName: true, lastName: true, isActive: true } },
        clientProfile: { select: { firstName: true, lastName: true, company: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: users });
  } catch (err: any) {
    console.error("[GET /api/users]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { email, password, role, firstName, lastName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        ...(role === "CLEANER" || role === "MANAGER" ? {
          staffProfile: {
            create: {
              firstName: firstName ?? "",
              lastName: lastName ?? "",
              hourlyRate: 0,
              skills: [],
            },
          },
        } : {}),
        ...(role === "CLIENT" ? {
          clientProfile: {
            create: {
              firstName: firstName ?? "",
              lastName: lastName ?? "",
              addressLine1: "",
              city: "",
              state: "",
              zip: "",
            },
          },
        } : {}),
      },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/users]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
