import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LandingPage } from "@/components/landing/landing-page";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);

  const dashboardHref = session
    ? (() => {
        const role = (session.user as any)?.role;
        if (role === "CLEANER") return "/cleaner";
        if (role === "CLIENT") return "/client/bookings";
        return "/admin";
      })()
    : null;

  const settings = await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  return (
    <LandingPage
      companyName={settings.companyName}
      phone={settings.phone}
      email={settings.supportEmail}
      dashboardHref={dashboardHref}
    />
  );
}
