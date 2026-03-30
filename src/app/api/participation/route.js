import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import VisitorEvent from "@/models/VisitorEvent";
import crypto from "crypto";

export async function POST(req) {
  try {
    await connectDB();
    const { campaignId, athleteTrackingKey } = await req.json();

    if (!campaignId || !athleteTrackingKey) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const campaign = await Campaign.findOne({ trackingId: campaignId });
    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.compensation.type !== "flat-fee") {
      return NextResponse.json(
        { message: "Invalid campaign type for participation" },
        { status: 400 }
      );
    }

    const ambassador = await User.findOne({
      $or: [
        { "athlete.tracking_key": athleteTrackingKey },
        { "team.tracking_key": athleteTrackingKey },
        { "influencer.tracking_key": athleteTrackingKey },
        { "coach.tracking_key": athleteTrackingKey },
        { "exAthlete.tracking_key": athleteTrackingKey },
        { "paraAthlete.tracking_key": athleteTrackingKey },
      ],
    });

    if (!ambassador) {
      return NextResponse.json(
        { message: "Ambassador not found" },
        { status: 404 }
      );
    }

    // Atomic upsert to guarantee only one participation per (campaign, ambassador)
    const visitorId = `VIS_${crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()}`;
    const transactionId = `TX_${crypto
      .randomBytes(4)
      .toString("hex")}_${Date.now()}`;
    const ambassadorEarnings = campaign.compensation.amount || 50;
    const platformFee = ambassadorEarnings * 0.2;

    const result = await VisitorEvent.findOneAndUpdate(
      {
        campaignId: campaign._id,
        athleteId: ambassador._id,
        "eventData.eventName": "participation",
      },
      {
        $setOnInsert: {
          campaignId: campaign._id,
          athleteId: ambassador._id,
          brandId: campaign.brandId,
          visitorId,
          eventType: "conversion",
          eventData: {
            eventName: "participation",
            amount: ambassadorEarnings,
            platformFee,
            currency: "EUR",
            transactionId,
          },
        },
      },
      { upsert: true, new: true }
    );

    // If the document existed already and was not inserted, inform the caller
    // Mongoose doesn't directly expose whether it was an insert here; rely on unique index to prevent dupes
    return NextResponse.json(
      {
        message: "Participation tracked",
        ambassadorEarnings: result.eventData?.amount ?? ambassadorEarnings,
        platformFee: result.eventData?.platformFee ?? platformFee,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/participation:", error.message);
    return NextResponse.json(
      { message: error.message || "Error tracking participation" },
      { status: 500 }
    );
  }
}
