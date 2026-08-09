const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

// ── helpers ──────────────────────────────────────────────────────────────────
function d(daysFromNow, hour = 9, min = 0) {
  const dt = new Date();
  dt.setDate(dt.getDate() + daysFromNow);
  dt.setHours(hour, min, 0, 0);
  return dt;
}
function dEnd(base, hours = 2) {
  return new Date(base.getTime() + hours * 3600_000);
}
let invNum = 1;
function inv() { return `INV-${String(invNum++).padStart(4, "0")}`; }

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🧹 Clearing all data...");

  // Delete in dependency order
  await prisma.invoice.deleteMany();
  await prisma.timesheet.deleteMany();
  await prisma.jobPhoto.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.jobAssignment.deleteMany();
  await prisma.job.deleteMany();
  await prisma.property.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.contactRequest.deleteMany();
  await prisma.checklistTemplate.deleteMany();
  await prisma.user.deleteMany();
  await prisma.appSettings.deleteMany();

  console.log("✅ All data cleared.");

  // ── App Settings ─────────────────────────────────────────────────────────
  await prisma.appSettings.create({
    data: {
      id: "default",
      companyName: "Pure Space Company",
      supportEmail: "contact@purespacecompany.com",
      phone: "(512) 847-3920",
      invoicePaymentDays: 14,
      invoiceNotes: "Thank you for choosing Pure Space Company! Payment is due within the terms stated above.",
    },
  });

  // ── Admin: Camila Hungaro ─────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("PureSpace2024!", 12);
  const adminUser = await prisma.user.create({
    data: {
      email: "contact@purespacecompany.com",
      passwordHash: adminHash,
      role: "ADMIN",
      staffProfile: {
        create: {
          firstName: "Camila",
          lastName: "Hungaro",
          phone: "(512) 847-3920",
          hourlyRate: 0,
          skills: ["management", "scheduling", "client_relations"],
          isActive: true,
        },
      },
    },
  });

  // ── Staff ─────────────────────────────────────────────────────────────────
  const staffData = [
    { first: "Sofia",   last: "Martinez", phone: "(512) 334-7721", rate: 22, skills: ["standard_clean","deep_clean","move_in_out"], email: "sofia@puredemo.com" },
    { first: "Lucas",   last: "Oliveira", phone: "(512) 448-0032", rate: 20, skills: ["standard_clean","commercial","post_construction"], email: "lucas@puredemo.com" },
    { first: "Aisha",   last: "Thompson", phone: "(512) 991-2245", rate: 24, skills: ["deep_clean","move_in_out","vacation_rental"], email: "aisha@puredemo.com" },
    { first: "Miguel",  last: "Reyes",    phone: "(512) 663-5510", rate: 19, skills: ["standard_clean","commercial"], email: "miguel@puredemo.com" },
  ];
  const staffHash = await bcrypt.hash("staff123", 10);
  const staffProfiles = [];
  for (const s of staffData) {
    const u = await prisma.user.create({
      data: {
        email: s.email,
        passwordHash: staffHash,
        role: "CLEANER",
        staffProfile: {
          create: {
            firstName: s.first,
            lastName: s.last,
            phone: s.phone,
            hourlyRate: s.rate,
            skills: s.skills,
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
      include: { staffProfile: true },
    });
    staffProfiles.push(u.staffProfile);
  }
  const [sofia, lucas, aisha, miguel] = staffProfiles;

  // ── Clients ───────────────────────────────────────────────────────────────
  const clientHash = await bcrypt.hash("client123", 10);

  const mkClient = async (email, first, last, phone, addr, city, zip, notes, extra = {}) => {
    const u = await prisma.user.create({
      data: {
        email,
        passwordHash: clientHash,
        role: "CLIENT",
        clientProfile: {
          create: {
            firstName: first, lastName: last,
            phone, addressLine1: addr, city, state: "TX", zip,
            specialNotes: notes,
            ...extra,
          },
        },
      },
      include: { clientProfile: true },
    });
    return u.clientProfile;
  };

  const jennifer = await mkClient(
    "jennifer.walsh@email.com","Jennifer","Walsh","(512) 203-9981",
    "2847 Barton Creek Blvd","Austin","78735",
    "Prefers eco-friendly products. Dog named Biscuit — very friendly.",
    { petNotes: "Golden Retriever, friendly" }
  );
  const marcus = await mkClient(
    "marcus.bell@email.com","Marcus","Bell","(512) 774-2200",
    "5012 South Congress Ave","Austin","78745",
    "Leave invoice under the door mat. Gate code: 4821."
  );
  const sunrise = await mkClient(
    "hello@sunriseprops.com","","","(512) 660-1188",
    "1400 S Lamar Blvd Ste 200","Austin","78704",
    "Property management company. Contact Sarah for access.",
    { company: "Sunrise Properties LLC", firstName: "Sarah", lastName: "Kim" }
  );
  const david = await mkClient(
    "david.nguyen@email.com","David","Nguyen","(737) 204-5599",
    "903 Rundberg Ln","Austin","78753",
    "Has two cats. Prefers morning appointments."
  );
  const claire = await mkClient(
    "claire.foster@email.com","Claire","Foster","(512) 389-4470",
    "7201 Hart Ln","Austin","78731",
    "New client. Needs deep clean first visit, then regular bi-weekly."
  );

  // ── Properties ────────────────────────────────────────────────────────────
  const mkProp = (clientId, name, addr, city, zip, fee, notes = "") =>
    prisma.property.create({
      data: {
        clientId, name,
        addressLine1: addr, city, state: "TX", zip,
        cleaningFee: fee, soloCleanMins: Math.round(fee * 1.2),
        specialNotes: notes, isActive: true,
      },
    });

  const jenniferHome = await mkProp(jennifer.id, "Jennifer's Home", "2847 Barton Creek Blvd", "Austin", "78735", 160, "3 bed / 2 bath. Key in lockbox code 3312.");
  const marcusHome   = await mkProp(marcus.id,   "Marcus's House",  "5012 South Congress Ave","Austin","78745", 140, "2 bed / 1 bath. Park on street.");
  const sunriseUnit1 = await mkProp(sunrise.id,  "Sunrise Unit 12A","1820 E 6th St #12A",     "Austin","78702", 120, "Airbnb unit. Linen kit in closet.");
  const sunriseUnit2 = await mkProp(sunrise.id,  "Sunrise Unit 8B", "1820 E 6th St #8B",      "Austin","78702", 120, "Airbnb unit. Linen kit in closet.");
  const sunriseOffice= await mkProp(sunrise.id,  "Sunrise Office",  "1400 S Lamar Blvd #200", "Austin","78704", 220, "Commercial. After 6pm only.");
  const davidApt     = await mkProp(david.id,    "David's Apartment","903 Rundberg Ln #4",    "Austin","78753", 110, "1 bed / 1 bath. Second floor.");
  const claireHome   = await mkProp(claire.id,   "Claire's Home",   "7201 Hart Ln",           "Austin","78731", 175, "4 bed / 3 bath. First visit deep clean.");

  // ── Checklist templates ───────────────────────────────────────────────────
  const stdItems = [
    { label: "Vacuum all floors", sortOrder: 1 },
    { label: "Mop hard floors", sortOrder: 2 },
    { label: "Clean & sanitize bathrooms", sortOrder: 3 },
    { label: "Wipe kitchen counters & sink", sortOrder: 4 },
    { label: "Clean appliance exteriors", sortOrder: 5 },
    { label: "Empty all trash cans", sortOrder: 6 },
    { label: "Dust furniture & surfaces", sortOrder: 7 },
    { label: "Clean mirrors & glass", sortOrder: 8 },
  ];
  const deepItems = [
    ...stdItems,
    { label: "Clean inside oven", sortOrder: 9 },
    { label: "Clean inside refrigerator", sortOrder: 10 },
    { label: "Wipe cabinet interiors", sortOrder: 11 },
    { label: "Scrub grout & tile", sortOrder: 12 },
    { label: "Clean baseboards", sortOrder: 13 },
    { label: "Clean window sills & tracks", sortOrder: 14 },
    { label: "Wash all blinds", sortOrder: 15 },
  ];
  await prisma.checklistTemplate.createMany({
    data: [
      { name: "Standard Clean",   serviceType: "STANDARD",   items: stdItems,  isDefault: true },
      { name: "Deep Clean",       serviceType: "DEEP_CLEAN",  items: deepItems, isDefault: true },
      { name: "Move-In / Move-Out",serviceType: "MOVE_IN_OUT",items: deepItems, isDefault: false },
      { name: "Commercial Clean", serviceType: "COMMERCIAL",  items: stdItems,  isDefault: false },
    ],
  });

  // ── Jobs helper ───────────────────────────────────────────────────────────
  const mkJob = async ({ client, property, title, type, status, recurrence = "ONCE",
    start, end, rate, lead, extra = [], notes = "", invStatus = null, cleanerPayAmt = null }) => {

    const job = await prisma.job.create({
      data: {
        clientId: client.id,
        propertyId: property.id,
        title, serviceType: type, status, recurrence,
        scheduledStart: start, scheduledEnd: end,
        flatRate: rate,
        extraItems: extra,
        cleanerPay: cleanerPayAmt ?? Math.round(rate * 0.55),
        notes,
        assignments: { create: { staffId: lead.id, isLead: true, pay: cleanerPayAmt ?? Math.round(rate * 0.55) } },
        checklist: {
          create: (type === "DEEP_CLEAN" || type === "MOVE_IN_OUT" ? deepItems : stdItems).map((i) => ({
            ...i,
            isCompleted: status === "COMPLETED",
            completedAt: status === "COMPLETED" ? end : null,
          })),
        },
      },
    });

    if (invStatus) {
      const sub = rate;
      const tax = +(sub * 0.0875).toFixed(2);
      const total = +(sub + tax).toFixed(2);
      const issuedAt = new Date(start.getTime() + 3600_000);
      const dueAt = new Date(issuedAt.getTime() + 14 * 86400_000);
      await prisma.invoice.create({
        data: {
          jobId: job.id, clientId: client.id,
          invoiceNumber: inv(), status: invStatus,
          subtotal: sub, taxRate: 0.0875, taxAmount: tax, total,
          issuedAt, dueAt,
          paidAt:     invStatus === "PAID" ? dueAt : null,
          paidAmount: invStatus === "PAID" ? total : null,
          lineItems: [{ description: title, qty: 1, unitPrice: sub, total: sub }],
          notes: "Thank you for choosing Pure Space Company!",
        },
      });
    }

    return job;
  };

  console.log("🏠 Creating jobs & invoices...");

  // ── Past completed jobs (history + invoices) ───────────────────────────────
  await mkJob({ client: jennifer, property: jenniferHome, title: "Standard Clean – Jennifer's Home",   type: "STANDARD",   status: "COMPLETED", start: d(-42, 9), end: dEnd(d(-42,9), 2.5), rate: 160, lead: sofia, invStatus: "PAID" });
  await mkJob({ client: jennifer, property: jenniferHome, title: "Standard Clean – Jennifer's Home",   type: "STANDARD",   status: "COMPLETED", start: d(-28, 9), end: dEnd(d(-28,9), 2.5), rate: 160, lead: sofia, invStatus: "PAID" });
  await mkJob({ client: jennifer, property: jenniferHome, title: "Standard Clean – Jennifer's Home",   type: "STANDARD",   status: "COMPLETED", start: d(-14, 9), end: dEnd(d(-14,9), 2.5), rate: 160, lead: sofia, invStatus: "PAID" });

  await mkJob({ client: marcus, property: marcusHome, title: "Standard Clean – Marcus's House",         type: "STANDARD",   status: "COMPLETED", start: d(-35, 10), end: dEnd(d(-35,10), 2), rate: 140, lead: lucas, invStatus: "PAID" });
  await mkJob({ client: marcus, property: marcusHome, title: "Deep Clean – Marcus's House",             type: "DEEP_CLEAN", status: "COMPLETED", start: d(-20, 10), end: dEnd(d(-20,10), 4), rate: 240, lead: lucas, invStatus: "PAID" });
  await mkJob({ client: marcus, property: marcusHome, title: "Standard Clean – Marcus's House",         type: "STANDARD",   status: "COMPLETED", start: d(-7,  10), end: dEnd(d(-7, 10), 2), rate: 140, lead: lucas, invStatus: "PENDING" });

  await mkJob({ client: sunrise, property: sunriseUnit1, title: "Turnover – Unit 12A",                 type: "STANDARD",   status: "COMPLETED", start: d(-30, 11), end: dEnd(d(-30,11), 1.5), rate: 120, lead: aisha, invStatus: "PAID" });
  await mkJob({ client: sunrise, property: sunriseUnit1, title: "Turnover – Unit 12A",                 type: "STANDARD",   status: "COMPLETED", start: d(-16, 11), end: dEnd(d(-16,11), 1.5), rate: 120, lead: aisha, invStatus: "PAID" });
  await mkJob({ client: sunrise, property: sunriseUnit2, title: "Turnover – Unit 8B",                  type: "STANDARD",   status: "COMPLETED", start: d(-22, 13), end: dEnd(d(-22,13), 1.5), rate: 120, lead: aisha, invStatus: "PAID" });
  await mkJob({ client: sunrise, property: sunriseUnit2, title: "Turnover – Unit 8B",                  type: "STANDARD",   status: "COMPLETED", start: d(-10, 13), end: dEnd(d(-10,13), 1.5), rate: 120, lead: miguel, invStatus: "PAID" });
  await mkJob({ client: sunrise, property: sunriseOffice,"title": "Office Clean – Sunrise HQ",         type: "COMMERCIAL", status: "COMPLETED", start: d(-14, 18), end: dEnd(d(-14,18), 3),   rate: 220, lead: lucas, invStatus: "PAID" });
  await mkJob({ client: sunrise, property: sunriseOffice,"title": "Office Clean – Sunrise HQ",         type: "COMMERCIAL", status: "COMPLETED", start: d(-7,  18), end: dEnd(d(-7, 18), 3),   rate: 220, lead: lucas, invStatus: "OVERDUE" });

  await mkJob({ client: david, property: davidApt, title: "Standard Clean – David's Apartment",        type: "STANDARD",   status: "COMPLETED", start: d(-21, 10), end: dEnd(d(-21,10), 1.5), rate: 110, lead: sofia, invStatus: "PAID" });
  await mkJob({ client: david, property: davidApt, title: "Deep Clean – David's Apartment",            type: "DEEP_CLEAN", status: "COMPLETED", start: d(-45, 10), end: dEnd(d(-45,10), 3),   rate: 190, lead: aisha, invStatus: "PAID" });

  await mkJob({ client: claire, property: claireHome, title: "Deep Clean – Claire's Home (First Visit)",type: "DEEP_CLEAN", status: "COMPLETED", start: d(-9, 8), end: dEnd(d(-9,8), 5), rate: 295, lead: sofia, invStatus: "PAID" });

  // ── Today / in-progress ───────────────────────────────────────────────────
  await mkJob({ client: jennifer, property: jenniferHome, title: "Standard Clean – Jennifer's Home",   type: "STANDARD",   status: "IN_PROGRESS", recurrence: "BIWEEKLY", start: d(0, 9), end: dEnd(d(0,9), 2.5), rate: 160, lead: sofia });
  await mkJob({ client: sunrise,  property: sunriseUnit1, title: "Turnover – Unit 12A",                type: "STANDARD",   status: "ASSIGNED",    start: d(0, 11), end: dEnd(d(0,11), 1.5), rate: 120, lead: aisha });

  // ── Upcoming jobs ─────────────────────────────────────────────────────────
  await mkJob({ client: marcus,   property: marcusHome,   title: "Standard Clean – Marcus's House",    type: "STANDARD",   status: "ASSIGNED",    recurrence: "BIWEEKLY", start: d(2, 10), end: dEnd(d(2,10), 2),   rate: 140, lead: lucas });
  await mkJob({ client: sunrise,  property: sunriseUnit2, title: "Turnover – Unit 8B",                 type: "STANDARD",   status: "ASSIGNED",    start: d(2, 13), end: dEnd(d(2,13), 1.5), rate: 120, lead: miguel });
  await mkJob({ client: david,    property: davidApt,     title: "Standard Clean – David's Apartment", type: "STANDARD",   status: "ASSIGNED",    recurrence: "MONTHLY",  start: d(4, 10), end: dEnd(d(4,10), 1.5), rate: 110, lead: sofia });
  await mkJob({ client: claire,   property: claireHome,   title: "Bi-Weekly Clean – Claire's Home",    type: "STANDARD",   status: "ASSIGNED",    recurrence: "BIWEEKLY", start: d(5, 8),  end: dEnd(d(5,8),  3),   rate: 175, lead: sofia });
  await mkJob({ client: sunrise,  property: sunriseOffice,"title": "Office Clean – Sunrise HQ",        type: "COMMERCIAL", status: "ASSIGNED",    start: d(6, 18), end: dEnd(d(6,18), 3),   rate: 220, lead: lucas });
  await mkJob({ client: sunrise,  property: sunriseUnit1, title: "Turnover – Unit 12A",                type: "STANDARD",   status: "UNASSIGNED",  start: d(8, 11), end: dEnd(d(8,11), 1.5), rate: 120, lead: aisha });
  await mkJob({ client: jennifer, property: jenniferHome, title: "Standard Clean – Jennifer's Home",   type: "STANDARD",   status: "ASSIGNED",    recurrence: "BIWEEKLY", start: d(14,9),  end: dEnd(d(14,9), 2.5), rate: 160, lead: sofia });
  await mkJob({ client: marcus,   property: marcusHome,   title: "Standard Clean – Marcus's House",    type: "STANDARD",   status: "UNASSIGNED",  recurrence: "BIWEEKLY", start: d(16,10), end: dEnd(d(16,10),2),   rate: 140, lead: lucas });
  await mkJob({ client: david,    property: davidApt,     title: "Deep Clean – David's Apartment",     type: "DEEP_CLEAN", status: "ASSIGNED",    start: d(19,10), end: dEnd(d(19,10),3),   rate: 190, lead: aisha });
  await mkJob({ client: claire,   property: claireHome,   title: "Bi-Weekly Clean – Claire's Home",    type: "STANDARD",   status: "UNASSIGNED",  recurrence: "BIWEEKLY", start: d(19, 8), end: dEnd(d(19,8), 3),   rate: 175, lead: sofia });
  await mkJob({ client: sunrise,  property: sunriseUnit2, title: "Move-Out Clean – Unit 8B",           type: "MOVE_IN_OUT",status: "ASSIGNED",    start: d(21,9),  end: dEnd(d(21,9),  4),   rate: 220, lead: aisha });

  // ── Cancelled / No-show ───────────────────────────────────────────────────
  await mkJob({ client: david,    property: davidApt,     title: "Standard Clean – David's Apartment", type: "STANDARD",   status: "CANCELLED",   start: d(-5, 10),end: dEnd(d(-5,10), 1.5), rate: 110, lead: miguel });
  await mkJob({ client: marcus,   property: marcusHome,   title: "Standard Clean – Marcus's House",    type: "STANDARD",   status: "NO_SHOW",     start: d(-3, 10),end: dEnd(d(-3,10), 2),   rate: 140, lead: lucas });

  // ── Contact requests ──────────────────────────────────────────────────────
  await prisma.contactRequest.createMany({
    data: [
      { name: "Rachel Green",    email: "rachel.g@email.com",    phone: "(512) 203-4411", message: "Looking for weekly cleaning for my 3-bed home in South Austin. Need someone reliable for Tuesdays.", status: "NEW" },
      { name: "Tom Wheeler",     email: "tom.wheeler@email.com", phone: "(737) 885-2290", message: "Need a deep clean for a move-out in two weeks. 2 bed / 2 bath apartment.", status: "READ" },
      { name: "Lakeside Stays",  email: "info@lakesidestays.com",phone: "(512) 771-0034", message: "We have 4 Airbnb units on Lake Travis and need a reliable turnover team. Can you handle same-day turnovers?", status: "NEW" },
      { name: "Monica Tran",     email: "monica.tran@email.com", phone: "(512) 990-5512", message: "Hi, I'd like to schedule a one-time deep clean before the holidays. I have a 4 bed / 2.5 bath house.", status: "CONVERTED" },
      { name: "Austin Tech Hub", email: "ops@austintechhub.io",  phone: "(737) 200-8891", message: "Looking for a commercial cleaning company for our 3,000 sqft co-working space. Need 3x per week evenings.", status: "READ" },
    ],
  });

  console.log("✅ Demo data created successfully!");
  console.log("\n📋 Login credentials:");
  console.log("   Admin:  contact@purespacecompany.com  /  PureSpace2024!");
  console.log("   Staff:  sofia@puredemo.com  /  staff123");
  console.log("   Client: jennifer.walsh@email.com  /  client123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
