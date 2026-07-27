import { PrismaClient, Role, ServiceType, JobStatus, RecurrenceRule, InvoiceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Admin user ──────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@cleanpro.com" },
    update: {},
    create: {
      email: "admin@cleanpro.com",
      passwordHash: await bcrypt.hash("admin123", 12),
      role: Role.ADMIN,
      staffProfile: {
        create: {
          firstName: "Alex",
          lastName: "Rivera",
          phone: "555-0100",
          hourlyRate: 0,
          skills: ["management"],
          isActive: true,
        },
      },
    },
  });

  // ── Manager ─────────────────────────────────────────────────
  const managerUser = await prisma.user.upsert({
    where: { email: "manager@cleanpro.com" },
    update: {},
    create: {
      email: "manager@cleanpro.com",
      passwordHash: await bcrypt.hash("manager123", 12),
      role: Role.MANAGER,
      staffProfile: {
        create: {
          firstName: "Sam",
          lastName: "Torres",
          phone: "555-0101",
          hourlyRate: 25,
          skills: ["scheduling", "client_relations"],
          isActive: true,
          availability: [
            { day: "MON", start: "08:00", end: "17:00" },
            { day: "TUE", start: "08:00", end: "17:00" },
            { day: "WED", start: "08:00", end: "17:00" },
            { day: "THU", start: "08:00", end: "17:00" },
            { day: "FRI", start: "08:00", end: "17:00" },
          ],
        },
      },
    },
  });

  // ── Cleaner ─────────────────────────────────────────────────
  const cleanerUser = await prisma.user.upsert({
    where: { email: "cleaner@cleanpro.com" },
    update: {},
    create: {
      email: "cleaner@cleanpro.com",
      passwordHash: await bcrypt.hash("cleaner123", 12),
      role: Role.CLEANER,
      staffProfile: {
        create: {
          firstName: "Jordan",
          lastName: "Kim",
          phone: "555-0102",
          hourlyRate: 18,
          skills: ["standard_clean", "deep_clean", "carpet_cleaning"],
          isActive: true,
          availability: [
            { day: "MON", start: "09:00", end: "18:00" },
            { day: "TUE", start: "09:00", end: "18:00" },
            { day: "WED", start: "09:00", end: "18:00" },
            { day: "THU", start: "09:00", end: "18:00" },
            { day: "FRI", start: "09:00", end: "18:00" },
          ],
        },
      },
    },
  });

  // ── Client ──────────────────────────────────────────────────
  const clientUser = await prisma.user.upsert({
    where: { email: "client@example.com" },
    update: {},
    create: {
      email: "client@example.com",
      passwordHash: await bcrypt.hash("client123", 12),
      role: Role.CLIENT,
      clientProfile: {
        create: {
          firstName: "Morgan",
          lastName: "Chen",
          phone: "555-0200",
          addressLine1: "123 Oak Street",
          city: "Austin",
          state: "TX",
          zip: "78701",
          entryInstructions: "Key under mat, alarm code 1234",
          petNotes: "Two friendly cats – please keep doors closed",
          specialNotes: "Prefer eco-friendly products",
        },
      },
    },
  });

  // ── Checklist template ──────────────────────────────────────
  await prisma.checklistTemplate.upsert({
    where: { id: "tmpl-standard-01" },
    update: {},
    create: {
      id: "tmpl-standard-01",
      name: "Standard Clean",
      serviceType: ServiceType.STANDARD,
      isDefault: true,
      items: [
        { label: "Vacuum all floors", sortOrder: 1 },
        { label: "Mop hard floors", sortOrder: 2 },
        { label: "Clean bathrooms (toilet, sink, tub/shower)", sortOrder: 3 },
        { label: "Sanitize kitchen counters & sink", sortOrder: 4 },
        { label: "Wipe appliance exteriors", sortOrder: 5 },
        { label: "Empty trash cans", sortOrder: 6 },
        { label: "Dust furniture & surfaces", sortOrder: 7 },
        { label: "Clean mirrors & glass", sortOrder: 8 },
      ],
    },
  });

  // ── Sample job ──────────────────────────────────────────────
  const clientProfile = await prisma.clientProfile.findUnique({
    where: { userId: clientUser.id },
  });

  const cleanerProfile = await prisma.staffProfile.findUnique({
    where: { userId: cleanerUser.id },
  });

  if (clientProfile && cleanerProfile) {
    const sampleJob = await prisma.job.create({
      data: {
        clientId: clientProfile.id,
        title: "Weekly Standard Clean – Oak Street",
        serviceType: ServiceType.STANDARD,
        status: JobStatus.ASSIGNED,
        recurrence: RecurrenceRule.WEEKLY,
        scheduledStart: new Date(Date.now() + 86400 * 1000), // tomorrow
        scheduledEnd: new Date(Date.now() + 86400 * 1000 + 2 * 3600 * 1000),
        flatRate: 120,
        assignments: {
          create: { staffId: cleanerProfile.id, isLead: true },
        },
        checklist: {
          create: [
            { label: "Vacuum all floors", sortOrder: 1 },
            { label: "Mop hard floors", sortOrder: 2 },
            { label: "Clean bathrooms", sortOrder: 3 },
            { label: "Sanitize kitchen counters", sortOrder: 4 },
            { label: "Wipe appliance exteriors", sortOrder: 5 },
            { label: "Empty trash cans", sortOrder: 6 },
            { label: "Dust furniture & surfaces", sortOrder: 7 },
            { label: "Clean mirrors", sortOrder: 8 },
          ],
        },
      },
    });

    // Draft invoice for the job
    await prisma.invoice.create({
      data: {
        jobId: sampleJob.id,
        clientId: clientProfile.id,
        invoiceNumber: "INV-0001",
        status: InvoiceStatus.DRAFT,
        subtotal: 120,
        taxRate: 0.0875,
        taxAmount: 10.5,
        total: 130.5,
        lineItems: [{ description: "Standard Clean – 2 hrs", qty: 1, unitPrice: 120, total: 120 }],
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
