import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import CampaignShare from "@/models/CampaignShare";
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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { campaignId } = await req.json();
    if (!campaignId) {
      return NextResponse.json(
        { message: "Campaign ID is required" },
        { status: 400 },
      );
    }

    const mongoUser = await User.findOne({ supabaseId: user.id });
    if (!mongoUser || mongoUser.role !== "sports-ambassador") {
      return NextResponse.json(
        { message: "Forbidden: Only sports ambassadors can share campaigns" },
        { status: 403 },
      );
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 },
      );
    }

    // Get tracking key from ambassador data
    const subRole = mongoUser.subRole || "athlete";
    const subRoleData = mongoUser[toCamelCase(subRole)];
    const trackingKey =
      subRoleData?.tracking_key || `AMB_GUEST_${mongoUser._id.slice(-4)}`;

    // Generate unique share URL dynamically based on current host
    const host = req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const baseUrl = host
      ? `${proto}://${host}`
      : process.env.NEXT_PUBLIC_SITE_URL;
    const shareUrl = `${baseUrl}/api/click?ambassador=${trackingKey}&campaign=${campaignId}`;

    // Check if share already exists
    let campaignShare = await CampaignShare.findOne({
      campaignId,
      athleteId: mongoUser._id,
    });
    if (!campaignShare) {
      campaignShare = await CampaignShare.create({
        campaignId,
        athleteId: mongoUser._id,
        shareUrl: shareUrl,
      });
    }

    return NextResponse.json(
      {
        message: "Share URL generated successfully",
        data: { shareUrl: campaignShare.shareUrl },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Error generating share URL" },
      { status: 500 },
    );
  }
}
