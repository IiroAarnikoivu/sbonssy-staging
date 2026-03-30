import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Campaign from "@/models/Campaign";

// GET: fetch tracking verification status for a campaign
// Query: campaignId (Mongo _id) | trackingId (tracking code)
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");
    const trackingId = searchParams.get("trackingId");

    const campaign = trackingId
      ? await Campaign.findOne({ trackingId })
      : await Campaign.findById(campaignId);

    if (!campaign) {
      return NextResponse.json({ message: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        verification: campaign.verification || { status: "not_started" },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/admin/campaign-tracking-status:", error.message);
    return NextResponse.json(
      { message: error.message || "Error fetching tracking status" },
      { status: 500 }
    );
  }
}
