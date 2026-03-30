import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import createClient from "@/lib/supabase/server";
import Campaign from "@/models/Campaign";
import CampaignInteraction from "@/models/CampaignInteraction";

export async function GET(request) {
  try {
    // Initialize Supabase client and get session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // // Check if user is admin using is_super_admin from user_metadata
    // const { data: userData, error: userError } = await supabase.auth.getUser();
    // if (userError || !userData?.user?.user_metadata?.is_super_admin) {
    //   return NextResponse.json(
    //     { error: "Forbidden: Admin access required" },
    //     { status: 403 }
    //   );
    // }

    await connectDB();

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    //  const role = searchParams.get("role") || null;
    const skip = (page - 1) * limit;

    // // Get total count for pagination
    const total = await CampaignInteraction.countDocuments();

    const campaigns = await CampaignInteraction.find()
      .populate({
        path: "brandId",
        model: User, // Assuming brandId references the User model
        select: "brand", // Select relevant brand fields
      })
      .populate({ path: "userId", model: User })
      .populate({ path: "campaignId", model: Campaign, select: "basics" })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: {
          campaigns,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
