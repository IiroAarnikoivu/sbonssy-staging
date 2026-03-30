import { connectDB } from "@/lib/db";
import stripe from "@/lib/stripe";
import Invoice from "@/models/Invoice";
import Payout from "@/models/Payout";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(request) {
  await connectDB();
  const sig = request.headers.get("stripe-signature");
  const body = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      await Invoice.updateOne(
        { stripeInvoiceId: invoice.id },
        { status: "paid" }
      );

      const dbInvoice = await Invoice.findOne({ stripeInvoiceId: invoice.id });
      const campaignId = dbInvoice.campaignId;
      const ambassador = await User.findOne({ role: "sports-ambassador" }); // Adjust for multiple ambassadors

      if (!ambassador || !ambassador.stripeAccountId) {
        console.error("No Stripe Connect account for ambassador");
        return NextResponse.json(
          { error: "No Stripe Connect account" },
          { status: 400 }
        );
      }

      const payoutAmount = invoice.amount_paid / 200; // 50% of invoice amount
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payments/payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ambassadorId: ambassador._id,
          campaignId,
          amount: payoutAmount,
        }),
      });
    } else if (event.type === "invoice.payment_failed") {
      await Invoice.updateOne(
        { stripeInvoiceId: event.data.object.id },
        { status: "failed" }
      );
    } else if (event.type === "payout.paid") {
      await Payout.updateOne(
        { stripePayoutId: event.data.object.id },
        { status: "paid" }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
