import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FavoriteCampaign from "@/models/FavoriteCampaign";
import User from "@/models/User";
import createClient from "@/lib/supabase/server";

export async function POST(request) {
  try {
    await connectDB();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { campaignId, action } = await request.json();

    if (!campaignId) {
      return NextResponse.json(
        { message: "Campaign ID is required" },
        { status: 400 }
      );
    }

    const mongoUser = await User.findOne({ supabaseId: user.id });
    if (!mongoUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (action === "add") {
      // Check if already favorited
      const existingFavorite = await FavoriteCampaign.findOne({
        userId: mongoUser._id,
        campaignId,
      });

      if (existingFavorite) {
        return NextResponse.json(
          { message: "Campaign already favorited" },
          { status: 400 }
        );
      }

      const favorite = await FavoriteCampaign.create({
        userId: mongoUser._id,
        campaignId,
      });

      return NextResponse.json(
        {
          data: {
            message: "Campaign added to favorites",
            data: favorite,
            success: true,
            action: "added",
          },
        },
        { status: 200 }
      );
    } else if (action === "remove") {
      const result = await FavoriteCampaign.deleteOne({
        userId: mongoUser._id,
        campaignId,
      });

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { message: "Campaign not found in favorites" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          data: {
            message: "Campaign removed from favorites",
            success: true,
            action: "removed",
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const supabaseIdParam =
      searchParams.get("supabaseId") || searchParams.get("id");
    const mongoIdParam = searchParams.get("mongoId");

    let targetUser = null;

    if (supabaseIdParam || mongoIdParam) {
      // Public read: fetch favorites for the specified ambassador
      targetUser = await User.findOne(
        mongoIdParam ? { _id: mongoIdParam } : { supabaseId: supabaseIdParam }
      );
      if (!targetUser) {
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        );
      }
    } else {
      // Authenticated read: fetch favorites for the current user
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const mongoUser = await User.findOne({ supabaseId: user.id });
      if (!mongoUser) {
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        );
      }
      targetUser = mongoUser;
    }

    const now = new Date();

    // Use aggregation pipeline for better performance
    const favorites = await FavoriteCampaign.aggregate([
      // Match user's favorites
      { $match: { userId: targetUser._id } },

      // Lookup campaign details
      {
        $lookup: {
          from: "campaigns", // Replace with your actual campaigns collection name
          localField: "campaignId",
          foreignField: "_id",
          as: "campaign",
        },
      },
      { $unwind: "$campaign" },

      // Lookup brand details
      {
        $lookup: {
          from: "users", // Brands are stored in the users collection
          localField: "campaign.brandId",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },

      // Filter campaigns — exclude paused (stateID=2) campaigns
      {
        $match: {
          "campaign.stateID": { $ne: 2 },
          $or: [
            { "campaign.basics.isOngoing": true },
            {
              $and: [
                { "campaign.basics.endDate": { $ne: null } },
                { "campaign.basics.endDate": { $gte: now } },
              ],
            },
            { "campaign.basics.endDate": null },
          ],
        },
      },

      // Project only needed fields
      {
        $project: {
          _id: "$campaign._id",
          basics: "$campaign.basics",
          assets: "$campaign.assets",
          brandId: "$brand._id",
          brandName: "$brand.brand.companyName",
          affilationLink: "$campaign.compensation.affiliateLinkDestination",
        },
      },
    ]);
    return NextResponse.json(
      { data: { data: favorites, success: true } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
