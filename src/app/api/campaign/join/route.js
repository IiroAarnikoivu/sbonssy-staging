// pages/api/campaign/join.js
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import CampaignInteraction from "@/models/CampaignInteraction";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { toCamelCase } from "@/lib/helper";

export async function POST(req) {
  try {
    await connectDB();
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    const mongoUser = await User.findOne({ supabaseId: user.id });
    if (!mongoUser || mongoUser.role !== "sports-ambassador") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { campaignId, userId, termsAccepted } = await req.json();
    if (
      !mongoose.Types.ObjectId.isValid(campaignId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return NextResponse.json({ message: "Invalid IDs" }, { status: 400 });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign || campaign.basics.campaignType !== "public") {
      return NextResponse.json(
        { message: "Invalid or non-public campaign" },
        { status: 400 }
      );
    }

    const subRole = toCamelCase(mongoUser.subRole || "");
    const stripeAccountId = mongoUser?.[subRole]?.stripeAccountId;
    if (!stripeAccountId) {
      return NextResponse.json(
        { message: "Stripe account not connected. Please connect your account to join." },
        { status: 400 }
      );
    }

    const account = await stripe.accounts.retrieve(stripeAccountId);
    const currentlyDue = account?.requirements?.currently_due || [];
    const disabledReason = account?.requirements?.disabled_reason || null;
    const enabledForPayoutsOrCharges = !!(account?.payouts_enabled || account?.charges_enabled);
    const isVerified = enabledForPayoutsOrCharges && currentlyDue.length === 0 && !disabledReason;
    if (!isVerified) {
      return NextResponse.json(
        { message: "Stripe account not verified. Please complete verification to join." },
        { status: 403 }
      );
    }

    const existingInteraction = await CampaignInteraction.findOne({
      campaignId,
      userId,
      interactionType: "public",
    });
    if (existingInteraction) {
      return NextResponse.json({ message: "Already joined" }, { status: 400 });
    }

    const interaction = new CampaignInteraction({
      campaignId,
      userId,
      brandId: campaign.brandId,
      interactionType: "public",
      status: "active",
      termsAccepted,
    });
    await interaction.save();

    return NextResponse.json(
      { message: "Joined campaign successfully", status: "active" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error joining campaign:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
