import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import CampaignInteraction from "@/models/CampaignInteraction";
import { NextResponse } from "next/server";

export async function GET(req) {
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

    const mongoUser = await User.findOne({ supabaseId: user.id });
    if (!mongoUser || mongoUser.role !== "sports-ambassador") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    // Extract pagination parameters from query
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    const interactions = await CampaignInteraction.find({
      $and: [
        {
          $or: [{ userId: mongoUser._id }, { userId: mongoUser.invitedBy }],
        },
        {
          $or: [
            { interactionType: "apply", status: "accepted" },
            { interactionType: "public", status: "active" },
            { interactionType: "private", status: "accepted" },
          ],
        },
      ],
    }).select("campaignId interactionType");

    const campaignIds = interactions
      .map((i) => i.campaignId.toString())
      .filter((id, index, self) => self.indexOf(id) === index);

    // Get total count for pagination metadata
    const totalCampaigns = campaignIds.length;

    const now = new Date();
    const campaigns = await Campaign.find({
      _id: { $in: campaignIds },
      stateID: 1, // Only active campaigns
      "verification.status": "accepted", // Only verified campaigns
      $or: [
        { "basics.isOngoing": true },
        { "basics.endDate": { $gte: now } },
        { "basics.endDate": { $eq: null } },
      ],
    })
      .populate("brandId", "brand.companyName")
      .select("basics assets brandId stateID verification")
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: -1 });

    const formattedCampaigns = campaigns.map((campaign) => ({
      _id: campaign._id.toString(),
      title: campaign.basics?.title || "Untitled Campaign",
      description: campaign.basics?.description || "No description available",
      campaignType: campaign.basics?.campaignType || "unknown",
      brandName: campaign.brandId?.brand?.companyName || "Unknown Brand",
      logo: campaign.assets?.logos?.[0]?.url || "",
      isOngoing: campaign.basics?.isOngoing || false,
      startDate: campaign.basics?.startDate || null,
      endDate: campaign.basics?.endDate || null,
    }));

    return NextResponse.json(
      {
        data: {
          data: formattedCampaigns,
          pagination: {
            total: totalCampaigns,
            page,
            limit,
            totalPages: Math.ceil(totalCampaigns / limit),
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching joined campaigns:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
