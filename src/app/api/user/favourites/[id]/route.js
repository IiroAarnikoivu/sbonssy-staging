import { connectDB } from "@/lib/db";
import FavoriteCampaign from "@/models/FavoriteCampaign";
import User from "@/models/User";
import { NextResponse } from "next/server";
import createClient from "@/lib/supabase/server";

export async function GET(request, { params }) {
  try {
    const { id: supabaseId } = await params;

    await connectDB();

    const supabase = await createClient();
    const { data: { user } = {} } = await supabase.auth.getUser();

    const mongoUser = await User.findOne({ supabaseId });

    if (!mongoUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 8;
    const skip = (page - 1) * limit;

    // Show all favorited campaigns regardless of privacy settings
    // Any user type (brand, sports-ambassador, etc.) can view favorited campaigns
    // Paused campaigns (stateID=2) are also shown on ambassador profiles
    const query = {
      $or: [{ userId: mongoUser._id }, { userId: mongoUser.invitedBy }],
    };

    const favorites = await FavoriteCampaign.find(query)
      .populate({
        path: "campaignId",
        select: "basics assets brandId compensation stateID",
        populate: {
          path: "brandId",
          select: "brand.companyName",
        },
      })
      .lean()
      .skip(skip)
      .limit(limit);

    const totalItems = await FavoriteCampaign.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    // Filter out any entries where the populated campaign is missing or paused
    const safeFavorites = favorites.filter(
      (fav) => fav.campaignId && fav.campaignId.stateID !== 2
    );

    const formattedFavorites = safeFavorites.map((fav) => ({
      _id: fav.campaignId?._id?.toString(),
      basics: fav.campaignId?.basics,
      assets: fav.campaignId?.assets,
      brandId: fav.campaignId?.brandId?._id?.toString(),
      brandName: fav.campaignId?.brandId?.brand?.companyName,
      affilationLink: fav.campaignId?.compensation?.affiliateLinkDestination,
      stateID: fav.campaignId.stateID,
    }));

    return NextResponse.json(
      {
        data: formattedFavorites,
        pagination: {
          currentPage: page,
          totalItems,
          totalPages,
        },
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}
