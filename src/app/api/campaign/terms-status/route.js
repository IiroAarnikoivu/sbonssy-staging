import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import CampaignInteraction from "@/models/CampaignInteraction";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");

    await connectDB();
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    const mongoUser = await User.findOne({ supabaseId: user.id });
    if (!mongoUser || mongoUser.role !== "sports-ambassador") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }
    const userId = mongoUser?._id;
    const interaction = await CampaignInteraction.findOne({
      campaignId,
      userId,
    });

    return NextResponse.json(
      {
        success: true,
        termsAccepted: interaction?.termsAccepted || false,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}
