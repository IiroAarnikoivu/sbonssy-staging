import { connectDB } from "@/lib/db";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import CampaignInteraction from "@/models/CampaignInteraction";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id: supabaseId } = await params;
    await connectDB();

    const mongoUser = await User.findOne({ supabaseId: supabaseId });
    if (!mongoUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 8;
    const skip = (page - 1) * limit;
    const brandId = mongoUser?._id;

    // Fetch campaigns for the brand
    const campaigns = await Campaign.find({ brandId }).skip(skip).limit(limit);

    // Fetch campaign interactions for the retrieved campaigns
    const campaignIds = campaigns.map((campaign) => campaign._id);
    const interactions = await CampaignInteraction.find({
      campaignId: { $in: campaignIds },
    }).populate("userId"); // Populate ambassador details

    // Map campaigns to include ambassador details
    const formattedCampaigns = campaigns.map((campaign) => {
      // Find interactions for this campaign
      const campaignInteractions = interactions.filter(
        (interaction) =>
          interaction.campaignId.toString() === campaign._id.toString()
      );

      // Extract ambassadors from interactions, filtering out null userId
      const ambassadors = campaignInteractions
        .filter((interaction) => interaction.userId) // Only include interactions with valid userId
        .map((interaction) => ({
          ...interaction.userId.toObject(),
        }));

      return {
        _id: campaign._id.toString(),
        basics: campaign.basics,
        assets: campaign.assets,
        brandId: campaign.brandId?._id?.toString() || null, // Handle null brandId
        brandName: campaign.brandId?.brand?.companyName || "Unknown Brand", // Fallback for brandName
        status: campaign.status,
        ambassadors, // Add ambassadors to the response
      };
    });

    const totalItems = await Campaign.countDocuments({ brandId });
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json(
      {
        data: {
          data: formattedCampaigns,
          pagination: {
            currentPage: page,
            totalItems,
            totalPages,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
