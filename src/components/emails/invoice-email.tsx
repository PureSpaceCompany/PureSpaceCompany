import * as React from "react";

interface Props {
  clientName: string;
  invoiceNumber: string;
  jobTitle: string;
  serviceDate: string;
  amount: string;
  dueDate: string;
  paymentUrl: string;
  companyName: string;
}

export function InvoiceEmail({
  clientName,
  invoiceNumber,
  jobTitle,
  serviceDate,
  amount,
  dueDate,
  paymentUrl,
  companyName,
}: Props) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Invoice {invoiceNumber}</title>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#f4f4f5",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: "#f4f4f5", padding: "40px 20px" }}>
          <tr>
            <td align="center">
              <table width="100%" cellPadding={0} cellSpacing={0} style={{ maxWidth: 600, backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>

                {/* Header */}
                <tr>
                  <td style={{ backgroundColor: "#1e3a5f", padding: "32px 40px", textAlign: "center" }}>
                    <p style={{ margin: 0, color: "#ffffff", fontSize: 24, fontWeight: 700 }}>{companyName}</p>
                    <p style={{ margin: "4px 0 0", color: "#93c5fd", fontSize: 13 }}>Professional Cleaning Services</p>
                  </td>
                </tr>

                {/* Body */}
                <tr>
                  <td style={{ padding: "40px 40px 32px" }}>
                    <p style={{ margin: "0 0 8px", fontSize: 14, color: "#6b7280" }}>Hi {clientName},</p>
                    <p style={{ margin: "0 0 32px", fontSize: 16, color: "#111827", lineHeight: 1.6 }}>
                      Thank you for choosing {companyName}. Your invoice is ready. Please review the details below and click the button to pay securely online.
                    </p>

                    {/* Invoice details box */}
                    <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 32 }}>
                      <tr>
                        <td style={{ padding: "20px 24px" }}>
                          <table width="100%" cellPadding={0} cellSpacing={0}>
                            <tr>
                              <td style={{ paddingBottom: 12 }}>
                                <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Invoice Number</p>
                                <p style={{ margin: "2px 0 0", fontSize: 15, color: "#111827", fontWeight: 600 }}>{invoiceNumber}</p>
                              </td>
                              <td style={{ paddingBottom: 12, textAlign: "right" }}>
                                <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Amount Due</p>
                                <p style={{ margin: "2px 0 0", fontSize: 22, color: "#1e3a5f", fontWeight: 700 }}>{amount}</p>
                              </td>
                            </tr>
                            <tr>
                              <td style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
                                <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Service</p>
                                <p style={{ margin: "2px 0 0", fontSize: 14, color: "#374151" }}>{jobTitle}</p>
                                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>Service date: {serviceDate}</p>
                              </td>
                              <td style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12, textAlign: "right" }}>
                                <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Due Date</p>
                                <p style={{ margin: "2px 0 0", fontSize: 14, color: "#dc2626", fontWeight: 600 }}>{dueDate}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    {/* Pay button */}
                    <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 32 }}>
                      <tr>
                        <td align="center">
                          <a
                            href={paymentUrl}
                            style={{
                              display: "inline-block",
                              backgroundColor: "#2563eb",
                              color: "#ffffff",
                              fontSize: 16,
                              fontWeight: 700,
                              textDecoration: "none",
                              padding: "14px 40px",
                              borderRadius: 8,
                            }}
                          >
                            Pay Now — {amount}
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style={{ paddingTop: 10 }}>
                          <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>Secure payment powered by Stripe · All major cards accepted</p>
                        </td>
                      </tr>
                    </table>

                    <p style={{ margin: 0, fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
                      If you have any questions about this invoice, reply to this email or contact us directly. Thank you for your business!
                    </p>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td style={{ backgroundColor: "#f9fafb", borderTop: "1px solid #e5e7eb", padding: "20px 40px", textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                      {companyName} · This is an automated invoice email
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#d1d5db" }}>
                      Invoice link: {paymentUrl}
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}
