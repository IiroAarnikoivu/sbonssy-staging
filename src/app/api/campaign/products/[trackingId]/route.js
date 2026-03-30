import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Campaign from "@/models/Campaign";

// GET /api/campaign/products/[trackingId]
// Public endpoint: returns the products associated with a campaign by its unique trackingId
export async function GET(_req, { params }) {
  try {
    const { trackingId } = params || {};

    if (!trackingId || typeof trackingId !== "string") {
      return NextResponse.json(
        { message: "trackingId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const campaign = await Campaign.findOne({ trackingId })
      .select("basics.title basics.offerType status products trackingId")
      .lean();

    if (!campaign) {
      return NextResponse.json({ message: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        campaign: {
          trackingId: campaign.trackingId,
          title: campaign.basics?.title || "",
          offerType: campaign.basics?.offerType || "",
          status: campaign.status || "",
        },
        products: Array.isArray(campaign.products) ? campaign.products : [],
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Server error", error: process.env.NODE_ENV === "development" ? error?.message : undefined },
      { status: 500 }
    );
  }
}
