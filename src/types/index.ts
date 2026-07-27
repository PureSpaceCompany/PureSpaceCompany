// Central type exports – mirrors Prisma models with computed helpers

export type Role = "ADMIN" | "MANAGER" | "CLEANER" | "CLIENT";
export type JobStatus = "UNASSIGNED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type InvoiceStatus = "DRAFT" | "PENDING" | "PAID" | "OVERDUE" | "VOID";
export type ServiceType = "STANDARD" | "DEEP_CLEAN" | "MOVE_IN_OUT" | "POST_CONSTRUCTION" | "RECURRING" | "COMMERCIAL";

export interface StaffProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  hourlyRate: number;
  skills: string[];
  isActive: boolean;
  availability?: WeeklyAvailability[] | null;
}

export interface WeeklyAvailability {
  day: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
  start: string; // "HH:mm"
  end: string;
}

export interface ClientProfile {
  id: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  phone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  zip: string;
  entryInstructions?: string | null;
  gateCode?: string | null;
  petNotes?: string | null;
  specialNotes?: string | null;
}

export interface ChecklistItem {
  id: string;
  jobId: string;
  label: string;
  isCompleted: boolean;
  completedAt?: string | null;
  completedBy?: string | null;
  sortOrder: number;
  notes?: string | null;
}

export interface JobPhoto {
  id: string;
  url: string;
  caption?: string | null;
  isBefore: boolean;
  uploadedBy: string;
  uploadedAt: string;
}

export interface JobAssignment {
  id: string;
  staffId: string;
  isLead: boolean;
  staff: StaffProfile;
}

export interface Job {
  id: string;
  title: string;
  serviceType: ServiceType;
  status: JobStatus;
  recurrence?: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  notes?: string | null;
  flatRate?: number | null;
  clientId?: string;
  propertyId?: string | null;
  client: ClientProfile;
  assignments: JobAssignment[];
  checklist: ChecklistItem[];
  photos: JobPhoto[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  issuedAt?: string | null;
  dueAt?: string | null;
  paidAt?: string | null;
  lineItems: InvoiceLineItem[];
  job: { title: string; scheduledStart: string };
  client: ClientProfile;
}

export interface InvoiceLineItem {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

// API response wrappers
export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

// FullCalendar event shape
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    status: JobStatus;
    clientName: string;
    assignees: string[];
  };
}
