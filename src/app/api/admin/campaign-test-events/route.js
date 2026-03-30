import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Campaign from "@/models/Campaign";
import AdminTestEvent from "@/models/AdminTestEvent";
import mongoose from "mongoose";

// GET: list test events for a campaign
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

    const events = await AdminTestEvent.find({
      campaignId: new mongoose.Types.ObjectId(campaign._id),
      isTest: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        events,
        count: events.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/admin/campaign-test-events:", error.message);
    return NextResponse.json(
      { message: error.message || "Error fetching test events" },
      { status: 500 }
    );
  }
}
