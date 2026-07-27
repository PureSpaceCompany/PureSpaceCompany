"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface InvoiceItem {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface InvoicePDFProps {
  invoice: {
    invoiceNumber: string;
    issuedAt?: string | null;
    dueAt?: string | null;
    status: string;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    paidAmount?: number | null;
    lineItems: InvoiceItem[] | any;
    notes?: string | null;
    client: {
      firstName?: string | null;
      lastName?: string | null;
      company?: string | null;
      addressLine1?: string;
      addressLine2?: string | null;
      city?: string;
      state?: string;
      zip?: string;
    };
    job?: {
      title?: string;
      scheduledStart?: string;
      property?: {
        name?: string;
        addressLine1?: string;
        city?: string;
        state?: string;
        zip?: string;
      } | null;
    } | null;
  };
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
}

export function InvoicePDFButton({ invoice, companyName = "CleanPro Services", companyAddress = "", companyPhone = "" }: InvoicePDFProps) {
  const download = useCallback(async () => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 18;

    // Header — company
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(companyName, margin, 22);

    if (companyAddress) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(companyAddress, margin, 28);
    }
    if (companyPhone) {
      doc.setFontSize(9);
      doc.text(companyPhone, margin, companyAddress ? 33 : 28);
    }

    // INVOICE label
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246);
    doc.text("INVOICE", pageW - margin, 22, { align: "right" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`# ${invoice.invoiceNumber}`, pageW - margin, 30, { align: "right" });

    const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

    doc.text(`Issued: ${fmtDate(invoice.issuedAt)}`, pageW - margin, 36, { align: "right" });
    doc.text(`Due: ${fmtDate(invoice.dueAt)}`, pageW - margin, 41, { align: "right" });

    // Status badge
    const statusColors: Record<string, [number, number, number]> = {
      PAID: [22, 163, 74],
      PENDING: [234, 179, 8],
      OVERDUE: [220, 38, 38],
      DRAFT: [107, 114, 128],
      VOID: [156, 163, 175],
    };
    const [sr, sg, sb] = statusColors[invoice.status] ?? [107, 114, 128];
    doc.setFillColor(sr, sg, sb);
    doc.roundedRect(pageW - margin - 22, 44, 22, 7, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.status, pageW - margin - 11, 49, { align: "center" });

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, 55, pageW - margin, 55);

    // Bill To
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("BILL TO", margin, 63);

    const clientName = invoice.client.company
      || [invoice.client.firstName, invoice.client.lastName].filter(Boolean).join(" ")
      || "Client";

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(clientName, margin, 69);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    let cy = 74;
    if (invoice.client.addressLine1) { doc.text(invoice.client.addressLine1, margin, cy); cy += 5; }
    if (invoice.client.addressLine2) { doc.text(invoice.client.addressLine2, margin, cy); cy += 5; }
    if (invoice.client.city) {
      doc.text(`${invoice.client.city}, ${invoice.client.state ?? ""} ${invoice.client.zip ?? ""}`.trim(), margin, cy);
      cy += 5;
    }

    // Service Address (if property)
    if (invoice.job?.property) {
      const p = invoice.job.property;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("SERVICE ADDRESS", margin + 70, 63);

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(p.name ?? "", margin + 70, 69);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      let py = 74;
      if (p.addressLine1) { doc.text(p.addressLine1, margin + 70, py); py += 5; }
      if (p.city) { doc.text(`${p.city}, ${p.state ?? ""} ${p.zip ?? ""}`.trim(), margin + 70, py); }
    }

    // Line items table
    const items: InvoiceItem[] = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];

    autoTable(doc, {
      startY: Math.max(cy, 95),
      margin: { left: margin, right: margin },
      head: [["Description", "Qty", "Unit Price", "Total"]],
      body: items.map((it) => [
        it.description,
        it.qty.toString(),
        formatCurrency(it.unitPrice),
        formatCurrency(it.total),
      ]),
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: { fontSize: 9, textColor: [71, 85, 105] },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 18, halign: "center" },
        2: { cellWidth: 32, halign: "right" },
        3: { cellWidth: 32, halign: "right" },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 6;

    // Totals block (right-aligned)
    const totalsX = pageW - margin - 60;
    const labelX = totalsX;
    const valueX = pageW - margin;

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");

    let ty = finalY;
    if (Number(invoice.taxAmount) > 0) {
      doc.text("Subtotal", labelX, ty); doc.text(formatCurrency(Number(invoice.subtotal)), valueX, ty, { align: "right" }); ty += 6;
      doc.text(`Tax (${(Number(invoice.taxRate) * 100).toFixed(2)}%)`, labelX, ty); doc.text(formatCurrency(Number(invoice.taxAmount)), valueX, ty, { align: "right" }); ty += 6;
      doc.setDrawColor(226, 232, 240);
      doc.line(labelX, ty, valueX, ty); ty += 4;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Total", labelX, ty); doc.text(formatCurrency(Number(invoice.total)), valueX, ty, { align: "right" }); ty += 6;

    if (invoice.status === "PAID" && invoice.paidAmount != null) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(22, 163, 74);
      doc.text("Amount Paid", labelX, ty); doc.text(formatCurrency(Number(invoice.paidAmount)), valueX, ty, { align: "right" }); ty += 6;
      const balance = Number(invoice.total) - Number(invoice.paidAmount);
      if (balance > 0.01) {
        doc.setTextColor(220, 38, 38);
        doc.text("Balance Due", labelX, ty); doc.text(formatCurrency(balance), valueX, ty, { align: "right" });
      }
    }

    // Notes
    if (invoice.notes) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("NOTES", margin, finalY + 4);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(invoice.notes, margin, finalY + 10, { maxWidth: 100 });
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 12;
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Thank you for your business!", pageW / 2, footerY, { align: "center" });

    doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
  }, [invoice, companyName, companyAddress, companyPhone]);

  return (
    <Button variant="ghost" size="sm" onClick={download} className="gap-1.5">
      <FileDown className="w-4 h-4" /> Download PDF
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Client statement — one PDF covering all rows for a single client
// ---------------------------------------------------------------------------

export interface StatementJob {
  title: string;
  scheduledStart?: string | null;
  propertyName?: string | null;
  invoiceNumber?: string | null;
  invoiceStatus?: string | null;
  amount: number;         // pre-tax flat rate / subtotal
  total: number;          // with tax
}

interface StatementProps {
  clientName: string;
  jobs: StatementJob[];
  companyName?: string;
}

export function ClientStatementPDFButton({ clientName, jobs, companyName = "CleanPro Services" }: StatementProps) {
  const download = useCallback(async () => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 18;

    // Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(companyName, margin, 22);

    doc.setFontSize(28);
    doc.setTextColor(59, 130, 246);
    doc.text("STATEMENT", pageW - margin, 22, { align: "right" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Client: ${clientName}`, pageW - margin, 30, { align: "right" });
    doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, pageW - margin, 36, { align: "right" });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, 44, pageW - margin, 44);

    const statusColors: Record<string, [number, number, number]> = {
      PAID: [22, 163, 74],
      PENDING: [234, 179, 8],
      OVERDUE: [220, 38, 38],
      DRAFT: [107, 114, 128],
      VOID: [156, 163, 175],
      NONE: [156, 163, 175],
    };

    // Columns: Date | Property | Invoice # | Status | Total  (no Service column)
    const rows = jobs.map((j) => [
      j.scheduledStart ? new Date(j.scheduledStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
      j.propertyName ?? "—",
      j.invoiceNumber ?? "—",
      j.invoiceStatus ?? "—",
      formatCurrency(j.total),
    ]);

    // Status column index is now 3
    const STATUS_COL = 3;

    autoTable(doc, {
      startY: 52,
      margin: { left: margin, right: margin },
      head: [["Date", "Property", "Invoice #", "Status", "Total"]],
      body: rows,
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8, textColor: [71, 85, 105] },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 38 },
        3: { cellWidth: 22, halign: "center" },
        4: { cellWidth: 26, halign: "right" },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      // Suppress autoTable's own text for status cells so we can draw colored text once
      willDrawCell: (data) => {
        if (data.column.index === STATUS_COL && data.section === "body") {
          data.cell.text = [];
        }
      },
      didDrawCell: (data) => {
        if (data.column.index === STATUS_COL && data.section === "body") {
          const status = String(data.cell.raw ?? "");
          const color = statusColors[status] ?? [107, 114, 128];
          doc.setTextColor(...color);
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          const { x, y, width, height } = data.cell;
          doc.text(status, x + width / 2, y + height / 2 + 1, { align: "center" });
          // Reset color so next cells aren't affected
          doc.setTextColor(71, 85, 105);
          doc.setFont("helvetica", "normal");
        }
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;

    const unpaid = jobs.filter((j) => j.invoiceStatus !== "PAID" && j.invoiceStatus !== "VOID").reduce((s, j) => s + j.total, 0);
    const grandTotal = jobs.filter((j) => j.invoiceStatus !== "VOID").reduce((s, j) => s + j.total, 0);

    const tx = pageW - margin;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Total Billed:", tx - 50, finalY); doc.text(formatCurrency(grandTotal), tx, finalY, { align: "right" });
    doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold");
    doc.text("Balance Due:", tx - 50, finalY + 8); doc.text(formatCurrency(unpaid), tx, finalY + 8, { align: "right" });

    const footerY = doc.internal.pageSize.getHeight() - 12;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("Thank you for your business!", pageW / 2, footerY, { align: "center" });

    doc.save(`Statement-${clientName.replace(/\s+/g, "-")}.pdf`);
  }, [clientName, jobs, companyName]);

  return (
    <Button variant="ghost" size="sm" onClick={download} className="gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
      <FileDown className="w-4 h-4" /> Statement PDF
    </Button>
  );
}
