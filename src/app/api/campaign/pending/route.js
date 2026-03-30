import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import CampaignInteraction from "@/models/CampaignInteraction";
import { NextResponse } from "next/server";

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

    const mongoUser = await User.findOne({ supabaseId: user.id });
    if (!mongoUser || mongoUser.role !== "sports-ambassador") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const interactions = await CampaignInteraction.find({
      $and: [
        {
          $or: [{ userId: mongoUser._id }, { userId: mongoUser.invitedBy }],
        },
        { status: "pending" },
        {
          $or: [{ interactionType: "apply" }],
        },
      ],
    }).select("campaignId interactionType");
    const campaignIds = interactions
      .map((i) => i.campaignId.toString())
      .filter((id, index, self) => self.indexOf(id) === index);

    const campaigns = await Campaign.find({
      _id: { $in: campaignIds },
      stateID: { $ne: 2 },
    })
      .populate("brandId", "brand.companyName")
      .select("basics assets brandId");

    return NextResponse.json({ data: { data: campaigns } }, { status: 200 });
  } catch (error) {
    console.error("Error fetching pending campaign requests:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
