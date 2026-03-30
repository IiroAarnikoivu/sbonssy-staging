import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Payout from "@/models/Payout";

export async function POST(request) {
  await connectDB();
  const { ambassadorId, campaignId, amount } = await request.json();

  try {
    let user = await User.findById(ambassadorId);
    if (!user) {
      return NextResponse.json(
        { error: "Ambassador not found" },
        { status: 404 }
      );
    }
    if (!user.stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { userId: ambassadorId },
      });
      await User.updateOne(
        { _id: ambassadorId },
        { stripeAccountId: account.id }
      );
      user = await User.findById(ambassadorId);
    }

    const payout = await stripe.payouts.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      destination: user.stripeAccountId,
      metadata: { campaignId },
    });

    await Payout.create({
      ambassadorId,
      campaignId,
      stripePayoutId: payout.id,
      amount,
      status: payout.status,
    });

    return NextResponse.json({ success: true, payoutId: payout.id });
  } catch (error) {
    console.error("Payout creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
