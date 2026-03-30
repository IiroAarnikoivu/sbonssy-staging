import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import Campaign from "@/models/Campaign";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectDB();
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const page = +searchParams.get("page");
    const limit = +searchParams.get("limit");
    const { data: userData, error: authError } = await supabase.auth.getUser();

    const skip = (page - 1) * limit;

    const total = await Campaign.countDocuments();

    if (authError) {
      return NextResponse.json(
        { message: "Supabase Auth Error" },
        { status: 401 }
      );
    }
    const campaigns = await Campaign.find()
      .populate("brandId")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    const allCampaigns = await Campaign.find();
    return NextResponse.json(
      limit > 0
        ? {
            data: campaigns,
            pagination: {
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit),
            },
          }
        : { data: allCampaigns },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
