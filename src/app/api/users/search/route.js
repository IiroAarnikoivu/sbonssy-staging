import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(request) {
  await connectDB();

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const role = searchParams.get("role");
  const subRole = searchParams.get("subRole"); // New query param for subRole

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    const searchConditions = [
      {
        $or: [
          { email: { $regex: query, $options: "i" } },
          { "brand.name": { $regex: query, $options: "i" } },
          { "brand.companyName": { $regex: query, $options: "i" } },
          { "athlete.name": { $regex: query, $options: "i" } },
          { "athlete.teamClubName": { $regex: query, $options: "i" } },
          { "team.name": { $regex: query, $options: "i" } },
          { "team.teamClubName": { $regex: query, $options: "i" } },
          { "influencer.name": { $regex: query, $options: "i" } },
          { "exAthlete.name": { $regex: query, $options: "i" } },
          { "paraAthlete.name": { $regex: query, $options: "i" } },
          { "coach.name": { $regex: query, $options: "i" } },
          { "athlete.interests": { $regex: query, $options: "i" } },
          { "brand.valuesAndInterests": { $regex: query, $options: "i" } },
          { "fan.interests": { $regex: query, $options: "i" } },
          { "team.interests": { $regex: query, $options: "i" } },
          { "influencer.interests": { $regex: query, $options: "i" } },
          { "exAthlete.interests": { $regex: query, $options: "i" } },
          { "paraAthlete.interests": { $regex: query, $options: "i" } },
          { "coach.interests": { $regex: query, $options: "i" } },
        ],
      },
      {
        role: { $in: ["sports-ambassador", "fan", "brand"] }, // Restrict to valid roles
      },
    ];

    if (role) {
      searchConditions.push({ role });
    }

    if (role === "sports-ambassador" && subRole) {
      searchConditions.push({
        subRole: {
          $in: [
            "team",
            "athlete",
            "influencer",
            "coach",
            "ex-athlete",
            "para-athlete",
          ],
        },
      });
      if (subRole !== "all") {
        searchConditions.push({ subRole });
      }
    }

    const users = await User.find({
      $and: searchConditions,
    })
      .select(
        "_id email role subRole athlete team influencer brand exAthlete paraAthlete coach fan blockedUsers"
      )
      .lean(); // Convert to plain JS objects

    const formattedUsers = users.map((user) => {
      let profileData = {};
      let name = user.email; // Default to email
      let images = [];
      let socialMedia = {};
      let location = {};
      let interests = [];
      let sport = "";
      let gender = "";
      let teamClubName = "";
      let level = "";
      let biography = "";
      let achievements = "";
      let records = "";
      let goals = "";
      let subRole = user.subRole || "";
      let companyName = "";
      let companyLogo = "";
      let favoriteTeams = [];

      switch (user.role) {
        case "brand":
          profileData = user.brand || {};
          name = profileData.name || profileData.companyName || user.email;
          companyName = profileData.companyName || "";
          companyLogo = profileData.companyLogo || "";
          images = companyLogo
            ? [{ url: companyLogo, isProfile: true, publicId: "" }]
            : profileData.images || [];
          socialMedia = profileData.socialMedia || {};
          location = profileData.location || {};
          interests = profileData.valuesAndInterests || [];
          break;
        case "sports-ambassador":
          switch (user.subRole) {
            case "athlete":
              profileData = user.athlete || {};
              name = profileData.name || user.email;
              images = profileData.images || [];
              socialMedia = profileData.socialMedia || {};
              location = profileData.location || {};
              interests = profileData.interests || [];
              sport = profileData.sport || "";
              gender = profileData.gender || "";
              teamClubName = profileData.teamClubName || "";
              level = profileData.level || "";
              biography = profileData.biography || "";
              achievements = profileData.achievements || "";
              records = profileData.records || "";
              goals = profileData.goals || "";
              break;
            case "team":
              profileData = user.team || {};
              name = profileData.name || profileData.teamClubName || user.email;
              images = profileData.images || [];
              socialMedia = profileData.socialMedia || {};
              location = profileData.location || {};
              interests = profileData.interests || [];
              sport = profileData.sports?.join(", ") || "";
              level = profileData.level || "";
              teamClubName = profileData.teamClubName || "";
              break;
            case "influencer":
              profileData = user.influencer || {};
              name = profileData.name || user.email;
              images = profileData.images || [];
              socialMedia = profileData.socialMedia || {};
              location = profileData.location || {};
              interests = profileData.interests || [];
              gender = profileData.gender || "";
              biography = profileData.biography || "";
              achievements = profileData.achievements || "";
              records = profileData.records || "";
              goals = profileData.goals || "";
              break;
            case "ex-athlete":
              profileData = user.exAthlete || {};
              name = profileData.name || user.email;
              images = profileData.images || [];
              socialMedia = profileData.socialMedia || {};
              location = profileData.location || {};
              interests = profileData.interests || [];
              sport = profileData.sport || "";
              gender = profileData.gender || "";
              teamClubName = profileData.teamClubName || "";
              level = profileData.level || "";
              biography = profileData.biography || "";
              achievements = profileData.achievements || "";
              records = profileData.records || "";
              goals = profileData.goals || "";
              break;
            case "para-athlete":
              profileData = user.paraAthlete || {};
              name = profileData.name || user.email;
              images = profileData.images || [];
              socialMedia = profileData.socialMedia || {};
              location = profileData.location || {};
              interests = profileData.interests || [];
              sport = profileData.sport || "";
              gender = profileData.gender || "";
              teamClubName = profileData.teamClubName || "";
              level = profileData.level || "";
              biography = profileData.biography || "";
              achievements = profileData.achievements || "";
              records = profileData.records || "";
              goals = profileData.goals || "";
              break;
            case "coach":
              profileData = user.coach || {};
              name = profileData.name || user.email;
              images = profileData.images || [];
              socialMedia = profileData.socialMedia || {};
              location = profileData.location || {};
              interests = profileData.interests || [];
              sport = profileData.sport || "";
              gender = profileData.gender || "";
              teamClubName = profileData.teamClubName || "";
              level = profileData.level || "";
              biography = profileData.biography || "";
              achievements = profileData.achievements || "";
              records = profileData.records || "";
              goals = profileData.goals || "";
              break;
            default:
              profileData = {};
              name = user.email;
          }
          break;
        case "fan":
          profileData = user.fan || {};
          name = user.email;
          images = profileData.images || [];
          socialMedia = profileData.socialMedia || {};
          location = profileData.location || {};
          interests = profileData.interests || [];
          favoriteTeams = profileData.favoriteTeams || [];
          break;
        default:
          profileData = {};
      }

      return {
        _id: user._id,
        id: user._id,
        email: user.email,
        role: user.role,
        subRole,
        name,
        images,
        socialMedia,
        location,
        interests,
        sport,
        gender,
        teamClubName,
        level,
        biography,
        achievements,
        records,
        goals,
        companyName,
        companyLogo,
        favoriteTeams,
        blockedUsers: user.blockedUsers || [],
      };
    });

    return NextResponse.json(formattedUsers, { status: 200 });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
