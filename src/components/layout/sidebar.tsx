"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Calendar, Briefcase, Users, UserCog,
  FileText, Settings, LogOut, SprayCan, BarChart2, MapPin, Menu, X,
} from "lucide-react";
import { signOut } from "next-auth/react";

const adminNav = [
  { href: "/admin",      label: "Dashboard", icon: LayoutDashboard },
  { href: "/schedule",   label: "Schedule",  icon: Calendar },
  { href: "/jobs",       label: "Jobs",      icon: Briefcase },
  { href: "/clients",    label: "Clients",   icon: Users },
  { href: "/properties", label: "Properties",icon: MapPin },
  { href: "/staff",      label: "Staff",     icon: UserCog },
  { href: "/invoices",   label: "Invoices",  icon: FileText },
  { href: "/reports",    label: "Reports",   icon: BarChart2 },
  { href: "/settings",   label: "Settings",  icon: Settings },
];

const cleanerNav = [
  { href: "/cleaner", label: "My Jobs", icon: Briefcase },
];

const clientNav = [
  { href: "/client/bookings", label: "Bookings", icon: Calendar },
  { href: "/client/invoices", label: "Invoices",  icon: FileText },
];

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as any)?.role ?? "CLIENT";
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav =
    role === "CLEANER" ? cleanerNav :
    role === "CLIENT"  ? clientNav  :
    adminNav;

  // Bottom nav shows first 5 items on mobile
  const bottomNav = nav.slice(0, 5);

  const NavLink = ({ href, label, icon: Icon, onClick }: { href: string; label: string; icon: any; onClick?: () => void }) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          active ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {label}
      </Link>
    );
  };

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-900 text-gray-100 min-h-screen shrink-0">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-700">
          <div className="p-1.5 bg-blue-600 rounded-lg">
            <SprayCan className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">CleanPro</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => <NavLink key={item.href} {...item} />)}
        </nav>

        <div className="px-3 py-4 border-t border-gray-700">
          <div className="px-3 py-2 text-xs text-gray-500 truncate">{session?.user?.email}</div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 bg-gray-900 text-white shadow-lg">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-blue-600 rounded-lg">
            <SprayCan className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">CleanPro</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside className={cn(
        "md:hidden fixed top-0 left-0 z-50 h-full w-72 bg-gray-900 text-gray-100 flex flex-col transition-transform duration-300 ease-in-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <SprayCan className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">CleanPro</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <NavLink key={item.href} {...item} onClick={() => setMobileOpen(false)} />
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-700">
          <div className="px-3 py-2 text-xs text-gray-500 truncate">{session?.user?.email}</div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav (quick access to top 5 items) ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-gray-900 border-t border-gray-700 flex items-center justify-around px-2 h-16 safe-area-bottom">
        {bottomNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-0",
                active ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-medium truncate">{label}</span>
            </Link>
          );
        })}
        {/* "More" button opens the drawer */}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-gray-500 hover:text-gray-300 transition-colors"
        >
          <Menu className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </>
  );
}
