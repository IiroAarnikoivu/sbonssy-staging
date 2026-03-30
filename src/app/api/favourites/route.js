import createClient from "@/lib/supabase/server";
import Favourites from "@/models/Favourites";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user?.id || authError) {
      return NextResponse.json({ message: "unauthorised" }, { status: 401 });
    }

    const { id, type } = await request.json();

    let mongoUser;
    if (user.user_metadata.inviter_email) {
      mongoUser = await User.findOne({
        email: user.user_metadata.inviter_email,
      });
    } else {
      mongoUser = await User.findOne({ supabaseId: user.id });
    }

    let favData;
    if (user.user_metadata.role === "brand") {
      // Check if a favourite exists for the ambassadorId
      const existing = await Favourites.findOne({
        ambassadorId: id,
        brandId: mongoUser._id,
      });
      if (existing) {
        await Favourites.deleteOne({
          ambassadorId: id,
          brandId: mongoUser._id,
        });
        return NextResponse.json(
          { message: "Favourite removed", success: true },
          { status: 200 }
        );
      } else {
        favData = new Favourites({
          brandId: mongoUser._id,
          ambassadorId: id,
        });
      }
    } else if (user.user_metadata.role === "sports-ambassador") {
      // Check if a favourite exists for the campaignId
      const existing = await Favourites.findOne({
        campaignId: id,
        ambassadorId: mongoUser._id,
      });

      if (existing) {
        await Favourites.deleteOne({
          campaignId: id,
          ambassadorId: mongoUser._id,
        });
        return NextResponse.json(
          { message: "Favourite removed", success: true },
          { status: 200 }
        );
      } else {
        favData = new Favourites({
          ambassadorId: mongoUser._id,
          campaignId: id,
        });
      }
    } else {
      if (type === "ambassador") {
        const existing = await Favourites.findOne({
          ambassadorId: id,
          fanId: mongoUser._id,
        });
        if (existing) {
          await Favourites.deleteOne({
            ambassadorId: id,
            fanId: mongoUser._id,
          });
          return NextResponse.json(
            { message: "Favourite removed", success: true },
            { status: 200 }
          );
        } else {
          favData = new Favourites({
            ambassadorId: id,
            fanId: mongoUser._id,
          });
        }
      } else if (type === "campaign") {
        const existing = await Favourites.findOne({
          campaignId: id,
          fanId: mongoUser._id,
        });
        if (existing) {
          await Favourites.deleteOne({
            campaignId: id,
            fanId: mongoUser._id,
          });
          return NextResponse.json(
            { message: "Favourite removed", success: true },
            { status: 200 }
          );
        } else {
          favData = new Favourites({
            campaignId: id,
            fanId: mongoUser._id,
          });
        }
      }
    }

    // Save the new favourite to the database
    await favData.save();

    return NextResponse.json(
      { message: "Created", success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error creating favourites", error: error.message },
      { status: 400 }
    );
  }
}

export async function GET(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    const { searchParams } = new URL(request.url);

    // Get page and limit parameters
    const page = parseInt(searchParams.get("page")) || 1;
    const campaignPage = parseInt(searchParams.get("campaignPage")) || page;
    const ambassadorPage = parseInt(searchParams.get("ambassadorPage")) || page;
    const limit = parseInt(searchParams.get("limit")) || 0;

    if (!user?.id || authError) {
      return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
    }

    let mongoUser;
    if (user.user_metadata.inviter_email) {
      mongoUser = await User.findOne({
        email: user.user_metadata.inviter_email,
      });
    } else {
      mongoUser = await User.findOne({ supabaseId: user.id });
    }
    if (mongoUser.role === "brand") {
      const skip = (page - 1) * limit;
      const favData = await Favourites.find({ brandId: mongoUser.id })
        .populate("ambassadorId")
        .skip(skip)
        .limit(limit);

      const totalCount = await Favourites.countDocuments({
        brandId: mongoUser.id,
      });

      return NextResponse.json(
        {
          data: favData,
          pagination: {
            totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
        { status: 200 }
      );
    } else if (mongoUser.role === "sports-ambassador") {
      const skip = (page - 1) * limit;
      const favData = await Favourites.find({ ambassadorId: mongoUser._id })
        .populate({
          path: "campaignId",

          populate: {
            path: "brandId",
            // model: 'User', // uncomment if schema ref name needs to be specified
            select: "brand.companyName", // optional: limit brand fields
          },
        })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalCount = await Favourites.countDocuments({
        ambassadorId: mongoUser._id,
      });

      return NextResponse.json(
        {
          data: {
            data: favData,
            pagination: {
              totalCount,
              page,
              limit,
              totalPages: Math.ceil(totalCount / limit),
            },
          },
        },
        { status: 200 }
      );
    } else {
      // fan role
      const allFavData = await Favourites.find({ fanId: mongoUser._id })
        .populate("ambassadorId")
        .populate("campaignId")
        .lean();

      // Split into campaign and ambassador favorites
      const campaignFavourites = allFavData.filter((item) => item.campaignId);
      const ambassadorFavourites = allFavData.filter(
        (item) => item.ambassadorId
      );

      // Apply separate pagination to each category
      const campaignSkip = (campaignPage - 1) * limit;
      const ambassadorSkip = (ambassadorPage - 1) * limit;

      const campaignPageData = campaignFavourites.slice(
        campaignSkip,
        campaignSkip + limit
      );
      const ambassadorPageData = ambassadorFavourites.slice(
        ambassadorSkip,
        ambassadorSkip + limit
      );
      return NextResponse.json(
        {
          data: {
            campaign: {
              data: limit > 0 ? campaignPageData : campaignFavourites,
              ...(limit > 0 && {
                pagination: {
                  totalCount: campaignFavourites.length,
                  page: campaignPage,
                  limit,
                  totalPages: Math.ceil(campaignFavourites.length / limit),
                },
              }),
            },
            ambassador: {
              data: limit > 0 ? ambassadorPageData : ambassadorFavourites,
              ...(limit > 0 && {
                pagination: {
                  totalCount: ambassadorFavourites.length,
                  page: ambassadorPage,
                  limit,
                  totalPages: Math.ceil(ambassadorFavourites.length / limit),
                },
              }),
            },
          },
        },
        { status: 200 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 400 }
    );
  }
}
