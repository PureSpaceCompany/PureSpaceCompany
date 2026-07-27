"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Calendar, Briefcase, Users, UserCog,
  FileText, Settings, LogOut, SprayCan, BarChart2,
} from "lucide-react";
import { signOut } from "next-auth/react";

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/staff", label: "Staff", icon: UserCog },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const cleanerNav = [
  { href: "/cleaner", label: "My Jobs", icon: Briefcase },
];

const clientNav = [
  { href: "/client/bookings", label: "Bookings", icon: Calendar },
  { href: "/client/invoices", label: "Invoices", icon: FileText },
];

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as any)?.role ?? "CLIENT";

  const nav =
    role === "CLEANER" ? cleanerNav :
    role === "CLIENT" ? clientNav :
    adminNav;

  return (
    <aside className="flex flex-col w-64 bg-gray-900 text-gray-100 min-h-screen">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-700">
        <div className="p-1.5 bg-blue-600 rounded-lg">
          <SprayCan className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">CleanPro</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User / sign out */}
      <div className="px-3 py-4 border-t border-gray-700">
        <div className="px-3 py-2 text-xs text-gray-500 truncate">{session?.user?.email}</div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
