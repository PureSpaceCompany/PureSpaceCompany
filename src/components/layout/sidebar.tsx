"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Calendar, Briefcase, Users, UserCog,
  FileText, Settings, LogOut, BarChart2, MapPin, Menu, X, Inbox,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/ui/logo";

const adminNav = [
  { href: "/admin",      label: "Dashboard", icon: LayoutDashboard },
  { href: "/schedule",   label: "Schedule",  icon: Calendar },
  { href: "/jobs",       label: "Jobs",      icon: Briefcase },
  { href: "/clients",    label: "Clients",   icon: Users },
  { href: "/properties", label: "Properties",icon: MapPin },
  { href: "/staff",      label: "Staff",     icon: UserCog },
  { href: "/invoices",   label: "Invoices",  icon: FileText },
  { href: "/inbox",      label: "Inbox",     icon: Inbox },
  { href: "/reports",    label: "Reports",   icon: BarChart2 },
  { href: "/settings",   label: "Settings",  icon: Settings },
];

const cleanerNav = [
  { href: "/cleaner", label: "My Schedule", icon: Calendar },
];

const clientNav = [
  { href: "/client/bookings", label: "Bookings", icon: Calendar },
  { href: "/client/invoices", label: "Invoices",  icon: FileText },
];

// navy sidebar bg
const NAVY = "#163A70";
const NAVY_DARK = "#0f2a54";
const GOLD = "#C8A46A";

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as any)?.role ?? "CLIENT";
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav =
    role === "CLEANER" ? cleanerNav :
    role === "CLIENT"  ? clientNav  :
    adminNav;

  const bottomNav = nav.slice(0, 5);
  const moreRoutes = nav.slice(5).map((n) => n.href);
  const moreActive = moreRoutes.some((href) => pathname === href || pathname.startsWith(href + "/"));

  const NavLink = ({ href, label, icon: Icon, onClick }: { href: string; label: string; icon: any; onClick?: () => void }) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        onClick={onClick}
        style={active ? { backgroundColor: GOLD, color: "#fff" } : {}}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          active ? "" : "text-blue-200 hover:bg-white/10 hover:text-white"
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {label}
      </Link>
    );
  };

  const sidebarStyle = { backgroundColor: NAVY };
  const borderStyle = { borderColor: "rgba(200,164,106,0.2)" };

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen shrink-0" style={sidebarStyle}>
        <div className="px-5 pt-5 pb-4 border-b" style={borderStyle}>
          <a href="https://stayshines.com" target="_blank" rel="noopener noreferrer">
            <Logo size="md" variant="light" />
          </a>
          {session?.user?.name && (
            <p className="text-xs mt-3 truncate" style={{ color: "rgba(200,164,106,0.85)" }}>
              Welcome, {(session.user.name as string).split(" ")[0]}
            </p>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => <NavLink key={item.href} {...item} />)}
        </nav>

        <div className="px-3 py-4 border-t" style={borderStyle}>
          <div className="px-3 py-2 text-xs truncate" style={{ color: "rgba(200,164,106,0.6)" }}>
            {session?.user?.email}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-blue-200 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 shadow-lg" style={sidebarStyle}>
        <Logo size="sm" variant="light" />
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Mobile drawer ── */}
      <aside className={cn(
        "md:hidden fixed top-0 left-0 z-50 h-full w-72 flex flex-col transition-transform duration-300 ease-in-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )} style={sidebarStyle}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={borderStyle}>
          <Logo size="sm" variant="light" />
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <NavLink key={item.href} {...item} onClick={() => setMobileOpen(false)} />
          ))}
        </nav>

        <div className="px-3 py-4 border-t" style={borderStyle}>
          <div className="px-3 py-2 text-xs truncate" style={{ color: "rgba(200,164,106,0.6)" }}>
            {session?.user?.email}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-blue-200 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t flex items-center justify-around px-2 h-16" style={{ ...sidebarStyle, ...borderStyle, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {bottomNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-0"
              style={{ color: active ? GOLD : "rgba(147,197,253,0.7)" }}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-medium truncate">{label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors"
          style={{ color: moreActive ? GOLD : "rgba(147,197,253,0.7)" }}
        >
          <Menu className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </>
  );
}
