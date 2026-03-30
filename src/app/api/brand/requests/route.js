// src/app/api/brand/requests/route.js
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import CampaignInteraction from "@/models/CampaignInteraction";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

// GET: Fetch pending requests for the brand
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

    const brandUser = await User.findOne({ supabaseId: user.id });
    if (!brandUser || brandUser.role !== "brand") {
      return NextResponse.json(
        { message: "Unauthorized: Must be a brand" },
        { status: 403 }
      );
    }

    // Cleanup: Delete requests with non-existent campaigns
    const brandIdToCheck = brandUser?.invitedBy
      ? brandUser?.invitedBy
      : brandUser._id;

    // Find all requests for this brand
    const allRequests = await CampaignInteraction.find({
      brandId: brandIdToCheck,
      interactionType: "apply",
      status: "pending",
    })
      .select("_id campaignId")
      .lean();

    // Get all campaign IDs from requests
    const campaignIds = [
      ...new Set(allRequests.map((req) => req.campaignId.toString())),
    ];

    if (campaignIds.length > 0) {
      // Find which campaigns actually exist
      const existingCampaigns = await Campaign.find({
        _id: { $in: campaignIds },
      })
        .select("_id")
        .lean();

      const existingCampaignIds = new Set(
        existingCampaigns.map((c) => c._id.toString())
      );

      // Find requests with non-existent campaigns
      const orphanedRequestIds = allRequests
        .filter((req) => !existingCampaignIds.has(req.campaignId.toString()))
        .map((req) => req._id);

      // Delete orphaned requests
      if (orphanedRequestIds.length > 0) {
        const deleteResult = await CampaignInteraction.deleteMany({
          _id: { $in: orphanedRequestIds },
        });
      }
    }

    // Extract campaignId from query parameters
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    // Build query object
    const query = {
      brandId: brandUser?.invitedBy ? brandUser?.invitedBy : brandUser._id,
      interactionType: "apply",
      status: "pending",
    };

    // Add campaignId to query only if provided and valid
    if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
      query.campaignId = campaignId;
    }

    const interactions = await CampaignInteraction.find(query)
      .populate({
        path: "userId",
        populate: {
          path: "invitedBy",
        },
        // match: { role: "sports-ambassador" }, // Uncomment if you want to enforce this
      })
      .populate({
        path: "campaignId",
        select: "basics.title assets.logos brandId stateID",
        populate: {
          path: "brandId",
          select: "brand.companyName",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const total = await CampaignInteraction.countDocuments(query);

    // Format the response
    const formattedRequests = interactions
      .filter((i) => i.userId && i.campaignId)
      .map((interaction) => ({
        _id: interaction._id.toString(),
        status: interaction.status,
        createdAt: interaction.createdAt,
        updatedAt: interaction.updatedAt,
        sender: {
          _id: interaction.userId._id.toString(),
          name: interaction.userId.name || interaction.userId.email,
          subRole: interaction.userId.subRole || "ambassador",
        },
        campaign: {
          _id: interaction.campaignId._id.toString(),
          title: interaction.campaignId.basics?.title || "Untitled Campaign",
          logo: interaction.campaignId.assets?.logos?.[0]?.url || "",
          brandName:
            interaction.campaignId.brandId?.brand?.companyName ||
            "Unknown Brand",
          stateID: interaction.campaignId.stateID,
        },
      }));

    return NextResponse.json(
      {
        data: { requests: interactions },
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          limit: limit,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching brand requests:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// POST: Create or resubmit a campaign join request
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

    const dbUser = await User.findOne({ supabaseId: user.id });
    if (!dbUser || dbUser.role !== "sports-ambassador") {
      return NextResponse.json(
        { message: "Unauthorized: Must be an ambassador" },
        { status: 403 }
      );
    }

    const { campaignId, brandId, userId } = await req.json();

    if (
      !mongoose.Types.ObjectId.isValid(campaignId) ||
      !mongoose.Types.ObjectId.isValid(brandId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return NextResponse.json(
        { message: "Invalid campaignId, brandId, or userId" },
        { status: 400 }
      );
    }

    if (dbUser._id.toString() !== userId) {
      return NextResponse.json(
        { message: "Unauthorized: User mismatch" },
        { status: 403 }
      );
    }

    const campaign = await Campaign.findOne({
      _id: campaignId,
      brandId,
    });
    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found or invalid brand" },
        { status: 404 }
      );
    }

    if (campaign.basics.campaignType !== "apply") {
      return NextResponse.json(
        { message: "Campaign is not of type 'apply'" },
        { status: 400 }
      );
    }

    const existingInteraction = await CampaignInteraction.findOne({
      campaignId,
      userId,
      brandId,
      interactionType: "apply",
    });

    if (existingInteraction) {
      if (existingInteraction.status === "pending") {
        return NextResponse.json(
          { message: "Request already pending" },
          { status: 409 }
        );
      }
      if (
        existingInteraction.status === "cancelled" ||
        existingInteraction.status === "rejected"
      ) {
        existingInteraction.status = "pending";
        existingInteraction.updatedAt = new Date();
        await existingInteraction.save();
        return NextResponse.json(
          {
            message: "Request resubmitted",
            status: "pending",
            requestId: existingInteraction._id,
          },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { message: "Request already processed" },
        { status: 400 }
      );
    }

    const interaction = new CampaignInteraction({
      campaignId,
      userId,
      brandId,
      interactionType: "apply",
      status: "pending",
    });
    await interaction.save();

    return NextResponse.json(
      {
        message: "Join request sent successfully",
        status: "pending",
        requestId: interaction._id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating campaign interaction:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
