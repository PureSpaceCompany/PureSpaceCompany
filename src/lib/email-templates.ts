function e(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  PAID: "Paid", PENDING: "Pending", OVERDUE: "Overdue", DRAFT: "Draft", VOID: "Void",
};

export const INVOICE_STATUS_EMAIL_COLOR: Record<string, string> = {
  PAID: "#059669", PENDING: "#d97706", OVERDUE: "#dc2626", DRAFT: "#6b7280", VOID: "#9ca3af",
};

export function buildInvoiceEmailHtml({
  clientName,
  invoiceNumber,
  jobTitle,
  serviceDate,
  amount,
  dueDate,
  paymentUrl,
  companyName,
}: {
  clientName: string;
  invoiceNumber: string;
  jobTitle: string;
  serviceDate: string;
  amount: string;
  dueDate: string;
  paymentUrl: string;
  companyName: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${e(invoiceNumber)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#1A3D2B;padding:32px 40px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">${e(companyName)}</p>
              <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">Professional Cleaning Services</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Hi ${e(clientName)},</p>
              <p style="margin:0 0 32px;font-size:16px;color:#111827;line-height:1.6;">
                Thank you for choosing ${e(companyName)}. Your invoice is ready. Please review the details below and click the button to pay securely online.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:32px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:12px;">
                          <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Invoice Number</p>
                          <p style="margin:2px 0 0;font-size:15px;color:#111827;font-weight:600;">${e(invoiceNumber)}</p>
                        </td>
                        <td style="padding-bottom:12px;text-align:right;">
                          <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Amount Due</p>
                          <p style="margin:2px 0 0;font-size:22px;color:#1A3D2B;font-weight:700;">${e(amount)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #e5e7eb;padding-top:12px;">
                          <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Service</p>
                          <p style="margin:2px 0 0;font-size:14px;color:#374151;">${e(jobTitle)}</p>
                          <p style="margin:2px 0 0;font-size:12px;color:#6b7280;">Service date: ${e(serviceDate)}</p>
                        </td>
                        <td style="border-top:1px solid #e5e7eb;padding-top:12px;text-align:right;">
                          <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Due Date</p>
                          <p style="margin:2px 0 0;font-size:14px;color:#dc2626;font-weight:600;">${e(dueDate)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${e(paymentUrl)}" style="display:inline-block;background-color:#1A3D2B;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:8px;">
                      Pay Now &mdash; ${e(amount)}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:10px;">
                    <p style="margin:0;font-size:11px;color:#9ca3af;">Secure payment powered by Stripe &middot; All major cards accepted</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
                If you have any questions about this invoice, reply to this email or contact us directly. Thank you for your business!
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">${e(companyName)} &middot; This is an automated invoice email</p>
              <p style="margin:4px 0 0;font-size:11px;color:#d1d5db;">Invoice link: ${e(paymentUrl)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildStatementEmailHtml({
  clientName,
  companyName,
  dateLabel,
  rows,
  totalBilled,
  totalPaid,
  balanceDue,
}: {
  clientName: string;
  companyName: string;
  dateLabel: string;
  rows: { date: string; property: string; invoiceNumber: string; status: string; amount: string }[];
  totalBilled: string;
  totalPaid: string;
  balanceDue: string;
}): string {
  const rowsHtml = rows
    .map(
      (r, i) => `
      <tr style="background-color:${i % 2 === 1 ? "#f9fafb" : "#ffffff"};">
        <td style="padding:10px 16px;font-size:13px;color:#374151;white-space:nowrap;">${e(r.date)}</td>
        <td style="padding:10px 16px;font-size:13px;color:#374151;">${e(r.property)}</td>
        <td style="padding:10px 16px;font-size:13px;color:#374151;font-family:monospace;">${e(r.invoiceNumber)}</td>
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:${INVOICE_STATUS_EMAIL_COLOR[r.status] ?? "#374151"};">${e(INVOICE_STATUS_LABEL[r.status] ?? r.status)}</td>
        <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:600;text-align:right;">${e(r.amount)}</td>
      </tr>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Account Statement — ${e(dateLabel)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#1A3D2B;padding:32px 40px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">${e(companyName)}</p>
              <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">Account Statement</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 24px;">
              <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Dear ${e(clientName)},</p>
              <p style="margin:0 0 24px;font-size:16px;color:#111827;line-height:1.6;">
                Please find your account statement for <strong>${e(dateLabel)}</strong> below. This summarises all services completed during the period.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;margin-bottom:24px;">
                <thead>
                  <tr style="background-color:#f3f4f6;">
                    <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;text-align:left;">Date</th>
                    <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;text-align:left;">Property / Service</th>
                    <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;text-align:left;">Invoice #</th>
                    <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;text-align:left;">Status</th>
                    <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;text-align:right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
              <table cellpadding="0" cellspacing="0" align="right" style="min-width:220px;border-top:2px solid #e5e7eb;padding-top:12px;">
                <tr>
                  <td style="padding:4px 0;font-size:14px;color:#6b7280;padding-right:24px;">Total Billed</td>
                  <td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${e(totalBilled)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:14px;color:#059669;padding-right:24px;">Amount Paid</td>
                  <td style="padding:4px 0;font-size:14px;color:#059669;font-weight:600;text-align:right;">${e(totalPaid)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0 4px;font-size:15px;font-weight:700;color:#111827;padding-right:24px;border-top:1px solid #e5e7eb;">Balance Due</td>
                  <td style="padding:8px 0 4px;font-size:15px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;color:${balanceDue === "$0.00" ? "#059669" : "#dc2626"};">${e(balanceDue)}</td>
                </tr>
              </table>
              <div style="clear:both;padding-top:32px;">
                <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
                  If you have any questions about this statement, please reply to this email. Thank you for your continued business!
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">${e(companyName)} &middot; This is an automated account statement</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
