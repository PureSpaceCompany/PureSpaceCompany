import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// Next.js App Router: disable body parsing so we get the raw text for signature verification
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("[Stripe webhook] signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const invoiceId = session.metadata?.invoiceId;

    if (!invoiceId) {
      console.error("[Stripe webhook] No invoiceId in session metadata", session.id);
      return NextResponse.json({ received: true });
    }

    try {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paidAmount: session.amount_total ? session.amount_total / 100 : undefined,
          stripePaymentIntent: session.payment_intent ?? null,
        },
      });
      console.log(`[Stripe webhook] Invoice ${invoiceId} marked as PAID`);
    } catch (err: any) {
      console.error("[Stripe webhook] Failed to update invoice:", err.message);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
