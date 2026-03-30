import { connectDB } from "@/lib/db";
import Campaign from "@/models/Campaign";
import CampaignInteraction from "@/models/CampaignInteraction";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    await connectDB();

    // Extract campaign ID from params
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { message: "Campaign ID is required" },
        { status: 400 }
      );
    }

    // Find the campaign and populate brand details, excluding stateId === 2
    const campaign = await Campaign.findOne({
      _id: id,
      stateId: { $ne: 2 },
    }).populate("brandId", "brand.companyName");

    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 }
      );
    }

    // Find ambassador interactions with user details populated
    const interactions = await CampaignInteraction.find({
      campaignId: id,
      status: { $in: ["pending", "accepted", "active"] },
    }).populate({
      path: "userId",
      select: "-password",
    });

    // Format ambassadors to include interactionId and user details
    const ambassadors = interactions.map((interaction) => ({
      interactionId: interaction._id,
      user: interaction.userId,
    }));

    // Format the campaign data
    const formattedCampaign = {
      ...campaign.toObject(),
      ambassadors: ambassadors.filter((amb) => amb.user !== null),
      brandName: campaign.brandId?.brand?.companyName,
    };

    return NextResponse.json(
      {
        message: "Campaign retrieved successfully",
        data: {
          data: formattedCampaign,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      {
        message: error.message || "Error fetching campaign",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
