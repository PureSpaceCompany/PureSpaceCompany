import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const updateSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "CLEANER", "CLIENT"]).optional(),
  password: z.string().min(8).optional(),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { role, password, email, firstName, lastName } = parsed.data;
    const data: any = {};
    if (role) data.role = role;
    if (email) data.email = email;
    if (password) data.passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, email: true, role: true, staffProfile: true, clientProfile: true },
    });

    // Update name on linked profile if provided
    if (firstName !== undefined || lastName !== undefined) {
      const nameData: any = {};
      if (firstName !== undefined) nameData.firstName = firstName;
      if (lastName !== undefined) nameData.lastName = lastName;
      if (user.staffProfile) {
        await prisma.staffProfile.update({ where: { userId: params.id }, data: nameData });
      } else if (user.clientProfile) {
        await prisma.clientProfile.update({ where: { userId: params.id }, data: nameData });
      } else {
        // ADMIN users have no profile — create a staffProfile to store the name
        await prisma.staffProfile.create({
          data: { userId: params.id, firstName: firstName ?? "", lastName: lastName ?? "", isActive: true, hourlyRate: 0 },
        });
      }
    }

    return NextResponse.json({ data: user });
  } catch (err: any) {
    console.error("[PATCH /api/users/:id]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const currentUser = session?.user as any;
    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent deleting yourself
    const target = await prisma.user.findUnique({ where: { id: params.id }, select: { email: true } });
    if (target?.email === currentUser?.email) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/users/:id]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
