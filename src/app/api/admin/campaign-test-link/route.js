import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import crypto from "crypto";

// POST: generate or return a test token and build a shareable test click URL
// Body: { campaignId: string (Mongo _id) | trackingId: string, ambassadorTrackingKey: string }
export async function POST(req) {
  try {
    await connectDB();
    const { campaignId, trackingId, ambassadorTrackingKey } = await req.json();

    if (!ambassadorTrackingKey || (!campaignId && !trackingId)) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 },
      );
    }

    const campaign = trackingId
      ? await Campaign.findOne({ trackingId })
      : await Campaign.findById(campaignId);

    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 },
      );
    }

    // Ensure ambassador exists (valid key)
    const ambassador = await User.findOne({
      $or: [
        { "athlete.tracking_key": ambassadorTrackingKey },
        { "team.tracking_key": ambassadorTrackingKey },
        { "influencer.tracking_key": ambassadorTrackingKey },
        { "coach.tracking_key": ambassadorTrackingKey },
        { "exAthlete.tracking_key": ambassadorTrackingKey },
        { "paraAthlete.tracking_key": ambassadorTrackingKey },
      ],
    });
    if (!ambassador) {
      return NextResponse.json(
        { message: "Ambassador not found for provided tracking key" },
        { status: 404 },
      );
    }

    // Generate a token if it doesn't exist or has been cleared
    if (!campaign.verification?.testToken) {
      const token = crypto.randomBytes(16).toString("hex");
      campaign.verification = {
        ...(campaign.verification?.toObject?.() || campaign.verification || {}),
        testToken: token,
        status: campaign.verification?.status || "not_started",
      };
      await campaign.save();
    }

    // Build base URL dynamically from request headers to support localhost, staging, and production
    const host = req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "http";
    let baseUrl = `${proto}://${host}`;

    // Fallback if host header is missing (rare)
    if (!host) {
      baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "";
    }

    const returnUrl = `${baseUrl}/admin/campaigns`;
    const testLink = `${baseUrl}/api/click?campaign=${encodeURIComponent(
      campaign.trackingId,
    )}&athlete=${encodeURIComponent(
      ambassadorTrackingKey,
    )}&testToken=${encodeURIComponent(
      campaign.verification.testToken,
    )}&returnUrl=${encodeURIComponent(returnUrl)}`;

    return NextResponse.json(
      {
        data: {
          success: true,
          testLink,
          testToken: campaign.verification.testToken,
          verification: campaign.verification,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in /api/admin/campaign-test-link:", error.message);
    return NextResponse.json(
      { message: error.message || "Error generating test link" },
      { status: 500 },
    );
  }
}
