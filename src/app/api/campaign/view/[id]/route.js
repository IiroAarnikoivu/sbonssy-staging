import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import CampaignInteraction from "@/models/CampaignInteraction";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const supabase = await createClient();

    // Authenticate user with Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json(
        { message: "Unauthorized: Authentication failed" },
        { status: 401 }
      );
    }

    // Verify user exists in MongoDB
    const mongoUser = await User.findOne({ supabaseId: user.id });
    if (!mongoUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Extract campaign ID from params
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { message: "Campaign ID is required" },
        { status: 400 }
      );
    }

    // Find the campaign
    const campaign = await Campaign.findById(id).populate({
      path: "brandId",
      select: "brand.companyName brand.shopifyDetails",
    });

    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 }
      );
    }

    let interaction;

    // Authorization checks
    if (mongoUser.role === "brand") {
      // Brand users can only view their own campaigns
      if (campaign.brandId._id.toString() !== mongoUser._id.toString()) {
        return NextResponse.json(
          { message: "Forbidden: You can only view your own campaigns" },
          { status: 403 }
        );
      }
    } else {
      // Ambassadors can only view public or apply-type campaigns they haven't joined
      if (
        !["public", "apply", "private"].includes(campaign.basics.campaignType)
      ) {
        return NextResponse.json(
          { message: "Forbidden: Campaign is not accessible" },
          { status: 403 }
        );
      }

      // Check if the user has joined the campaign
      interaction = await CampaignInteraction.findOne({
        // userId: mongoUser._id,
        campaignId: id,
        $or: [
          { interactionType: "apply", status: "accepted" },
          { interactionType: "public", status: "active" },
          { interactionType: "private", status: "accepted" },
        ],
      });

      //   if (interaction) {
      //     return NextResponse.json(
      //       { message: "Forbidden: You have already joined this campaign" },
      //       { status: 403 }
      //     );
      //   }
    }

    // Format campaign data
    const formattedCampaign = {
      _id: campaign._id.toString(),
      basics: campaign.basics,
      assets: campaign.assets,
      creatorProfile: campaign.creatorProfile,
      compensation: campaign.compensation,
      goals: campaign.goals,
      legal: campaign.legal,
      brandId: campaign.brandId?._id.toString(),
      brandName: campaign.brandId?.brand?.companyName,
      status: campaign.status,
      ambassadors: interaction,
    };

    return NextResponse.json(
      {
        message: "Campaign retrieved successfully",
        data: {
          data: { ...campaign.toObject(), ambassador: interaction?.userId },
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
