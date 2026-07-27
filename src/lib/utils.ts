import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { JobStatus, InvoiceStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Map job status → Tailwind badge colours
export const JOB_STATUS_COLOR: Record<JobStatus, string> = {
  UNASSIGNED: "bg-gray-100 text-gray-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-orange-100 text-orange-700",
};

// Map job status → FullCalendar background colour
export const JOB_CALENDAR_COLOR: Record<JobStatus, string> = {
  UNASSIGNED: "#6b7280",
  ASSIGNED: "#3b82f6",
  IN_PROGRESS: "#f59e0b",
  COMPLETED: "#22c55e",
  CANCELLED: "#ef4444",
  NO_SHOW: "#f97316",
};

export const INVOICE_STATUS_COLOR: Record<InvoiceStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  VOID: "bg-gray-100 text-gray-400 line-through",
};

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

// Returns the best display name for a client (company takes priority over person name)
export function clientDisplayName(c: {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
}): string {
  if (c.company) return c.company;
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed Client";
}

// Generate a collision-safe invoice number using timestamp + random suffix
export function generateInvoiceNumber(): string {
  const d = new Date();
  const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const random = Math.floor(Math.random() * 9000 + 1000); // 4-digit random
  return `INV-${yyyymmdd}-${random}`;
}
