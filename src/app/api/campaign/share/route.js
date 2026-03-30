import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import CampaignShare from "@/models/CampaignShare";
import mongoose from "mongoose";
import { toCamelCase } from "@/lib/helper";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:5200";

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

    const ambassador = await User.findOne({ supabaseId: user.id });
    if (!ambassador || ambassador.role !== "sports-ambassador") {
      return NextResponse.json(
        { message: "Forbidden: Only ambassadors can share campaigns" },
        { status: 403 }
      );
    }

    const { campaignId } = await req.json();
    if (!campaignId) {
      return NextResponse.json(
        { message: "Invalid campaignId" },
        { status: 400 }
      );
    }

    let campaign;
    if (mongoose.Types.ObjectId.isValid(campaignId)) {
      campaign = await Campaign.findById(campaignId);
    } else {
      campaign = await Campaign.findOne({ trackingId: campaignId });
    }

    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 }
      );
    }

    const trackingKey =
      ambassador[toCamelCase(ambassador.subRole)]?.tracking_key;

    if (!trackingKey) {
      return NextResponse.json(
        { message: "Ambassador tracking key not found" },
        { status: 400 }
      );
    }

    // Generate share URL
    const queryParams = new URLSearchParams({
      athlete: trackingKey,
      campaign: campaign.trackingId,
      utm_source: "sbonssy",
      utm_medium: "affiliate",
      utm_campaign: campaign.trackingId,
      utm_content: trackingKey,
    });
    const shareUrl = `${BASE_URL}/campaign/${campaign.trackingId}?${queryParams.toString()}`;

    // Create campaign share record
    const campaignShare = await CampaignShare.create({
      campaignId: campaign._id,
      athleteId: ambassador._id,
      shareUrl,
      createdAt: new Date(),
    });

    // Trigger flat-fee participation
    if (campaign.compensation.type === "flat-fee") {
      try {
        const participationResponse = await fetch(
          `${BASE_URL}/api/participation`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignId: campaign.trackingId,
              athleteTrackingKey: trackingKey,
            }),
          }
        );

        if (!participationResponse.ok) {
          const errorText = await participationResponse.text();
          console.error(
            `Failed to record flat-fee participation: ${errorText}`
          );
        } else {
        }
      } catch (error) {
        console.error("Error recording flat-fee participation:", error.message);
        // Continue with share URL response even if participation fails
      }
    }

    return NextResponse.json(
      { message: "Share URL generated", shareUrl, campaignShare },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error generating share URL:", error.message);
    return NextResponse.json(
      { message: error.message || "Error generating share URL" },
      { status: 500 }
    );
  }
}
