import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import CampaignInteraction from "@/models/CampaignInteraction";
import mongoose from "mongoose";
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
    if (!mongoUser || mongoUser.role !== "brand") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");
    const search = searchParams.get("search"); // Optional search parameter

    // Validate campaignId if provided
    if (campaignId) {
      if (!mongoose.Types.ObjectId.isValid(campaignId)) {
        return NextResponse.json(
          { message: "Invalid campaignId" },
          { status: 400 },
        );
      }

      const campaign = await mongoose.model("Campaign").findById(campaignId);
      if (!campaign) {
        return NextResponse.json(
          { message: "Campaign not found" },
          { status: 404 },
        );
      }

      if (campaign.verification?.status !== "accepted") {
        return NextResponse.json(
          { message: "Campaign must be accepted by Admin" },
          { status: 400 },
        );
      }
    }

    // Base query for ambassadors
    const ambassadorQuery = {
      role: "sports-ambassador",
      isProfileCompleted: true,
      $or: [
        { athlete: { $exists: true, $ne: null } },
        { exAthlete: { $exists: true, $ne: null } },
        { paraAthlete: { $exists: true, $ne: null } },
        { coach: { $exists: true, $ne: null } },
        { team: { $exists: true, $ne: null } },
        { influencer: { $exists: true, $ne: null } },
      ],
    };

    // Add search filter if provided
    if (search && search.trim()) {
      const searchConditions = [
        { "athlete.name": { $regex: search.trim(), $options: "i" } },
        { "exAthlete.name": { $regex: search.trim(), $options: "i" } },
        { "paraAthlete.name": { $regex: search.trim(), $options: "i" } },
        { "coach.name": { $regex: search.trim(), $options: "i" } },
        { "team.name": { $regex: search.trim(), $options: "i" } },
        { "influencer.name": { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
      ];

      // Create a new $or condition that combines the role requirements with search
      ambassadorQuery.$and = [
        {
          $or: [
            { athlete: { $exists: true, $ne: null } },
            { exAthlete: { $exists: true, $ne: null } },
            { paraAthlete: { $exists: true, $ne: null } },
            { coach: { $exists: true, $ne: null } },
            { team: { $exists: true, $ne: null } },
            { influencer: { $exists: true, $ne: null } },
          ],
        },
        {
          $or: searchConditions,
        },
      ];

      // Remove the original $or since we're using $and now
      delete ambassadorQuery.$or;
    }

    // If campaignId is provided, exclude ambassadors already invited
    if (campaignId) {
      const existingInteractions = await CampaignInteraction.find({
        campaignId,
        interactionType: "private",
        status: { $in: ["pending", "accepted"] },
      }).select("userId");

      const excludedAmbassadorIds = existingInteractions.map((i) =>
        i.userId.toString(),
      );

      // Only add exclusion if there are ambassadors to exclude
      if (excludedAmbassadorIds.length > 0) {
        ambassadorQuery._id = {
          ...ambassadorQuery._id,
          $nin: excludedAmbassadorIds,
        };
      }
    }

    const ambassadors = await User.find(ambassadorQuery)
      .select(
        "_id subRole athlete.name athlete.images exAthlete.name exAthlete.images paraAthlete.name paraAthlete.images coach.name coach.images team.name team.images influencer.name influencer.images email",
      )
      .sort({ _id: 1 }); // Ensure consistent ordering

    const formattedAmbassadors = ambassadors.map((amb) => {
      let name = "";
      let profileImage = null;

      // Normalize subRole to handle hyphenated variants (e.g., "ex-athlete")
      // without changing what we return to the client.
      const normalizedSubRole =
        amb.subRole === "ex-athlete"
          ? "exAthlete"
          : amb.subRole === "para-athlete"
            ? "paraAthlete"
            : amb.subRole;

      // Determine name and profile image based on normalized subRole
      switch (normalizedSubRole) {
        case "athlete":
          name = amb.athlete?.name || "";
          profileImage =
            amb.athlete?.images?.find((img) => img.isProfile)?.url || null;
          break;
        case "exAthlete":
          name = amb.exAthlete?.name || "";
          profileImage =
            amb.exAthlete?.images?.find((img) => img.isProfile)?.url || null;
          break;
        case "paraAthlete":
          name = amb.paraAthlete?.name || "";
          profileImage =
            amb.paraAthlete?.images?.find((img) => img.isProfile)?.url || null;
          break;
        case "coach":
          name = amb.coach?.name || "";
          profileImage =
            amb.coach?.images?.find((img) => img.isProfile)?.url || null;
          break;
        case "team":
          name = amb.team?.name || "";
          profileImage =
            amb.team?.images?.find((img) => img.isProfile)?.url || null;
          break;
        case "influencer":
          name = amb.influencer?.name || "";
          profileImage =
            amb.influencer?.images?.find((img) => img.isProfile)?.url || null;
          break;
        default:
          name = "";
          profileImage = null;
      }

      return {
        _id: amb._id.toString(),
        name,
        email: amb.email,
        subRole: amb.subRole, // keep original value for display
        profileImage,
      };
    });

    return NextResponse.json(
      {
        data: { data: formattedAmbassadors },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching ambassadors:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
