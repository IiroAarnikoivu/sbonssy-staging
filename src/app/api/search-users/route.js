import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

// Sub-roles we support looking into for sports ambassadors
const ALL_SUB_ROLES = [
  "influencer",
  "coach",
  "athlete",
  "paraAthlete",
  "exAthlete",
  "team",
];

// Map DB subRole value to nested field key used in documents
const toNestedRoleKey = (role) =>
  role === "ex-athlete"
    ? "exAthlete"
    : role === "para-athlete"
    ? "paraAthlete"
    : role;

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    if (!q) {
      return NextResponse.json(
        { success: false, error: "Missing required query param 'q'" },
        { status: 400 }
      );
    }

    const subRole = searchParams.get("subRole"); // comma-separated optional
    const limit = Math.max(
      1,
      Math.min(parseInt(searchParams.get("limit") || "10", 10), 50)
    );

    // Normalize selected subRoles for DB (exAthlete -> ex-athlete, paraAthlete -> para-athlete)
    const selectedDbSubRoles = subRole
      ? subRole
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean)
          .map((r) =>
            r === "paraAthlete"
              ? "para-athlete"
              : r === "exAthlete"
              ? "ex-athlete"
              : r
          )
      : [];

    // Base query for sports ambassadors only
    const baseQuery = {
      role: "sports-ambassador",
      isProfileCompleted: true,
      ...(selectedDbSubRoles.length > 0 && {
        subRole: { $in: selectedDbSubRoles },
      }),
    };

    // Build roles for nested lookups (camelCase)
    const rolesForNested =
      selectedDbSubRoles.length > 0
        ? selectedDbSubRoles.map(toNestedRoleKey)
        : ALL_SUB_ROLES;

    const pipeline = [
      { $match: baseQuery },
      // Compute a display name based on subRole
      {
        $addFields: {
          computedName: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$subRole", "athlete"] },
                  then: "$athlete.name",
                },
                {
                  case: { $eq: ["$subRole", "ex-athlete"] },
                  then: "$exAthlete.name",
                },
                {
                  case: { $eq: ["$subRole", "para-athlete"] },
                  then: "$paraAthlete.name",
                },
                { case: { $eq: ["$subRole", "coach"] }, then: "$coach.name" },
                {
                  case: { $eq: ["$subRole", "team"] },
                  then: "$team.teamClubName",
                },
                {
                  case: { $eq: ["$subRole", "influencer"] },
                  then: "$influencer.name",
                },
              ],
              default: null,
            },
          },
        },
      },
      { $match: { computedName: { $ne: null } } },
      { $match: { computedName: { $regex: new RegExp(q, "i") } } },
      // Best effort avatar from first image per role
      {
        $addFields: {
          avatar: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$subRole", "athlete"] },
                  then: {
                    $ifNull: [
                      { $arrayElemAt: ["$athlete.images.url", 0] },
                      null,
                    ],
                  },
                },
                {
                  case: { $eq: ["$subRole", "ex-athlete"] },
                  then: {
                    $ifNull: [
                      { $arrayElemAt: ["$exAthlete.images.url", 0] },
                      null,
                    ],
                  },
                },
                {
                  case: { $eq: ["$subRole", "para-athlete"] },
                  then: {
                    $ifNull: [
                      { $arrayElemAt: ["$paraAthlete.images.url", 0] },
                      null,
                    ],
                  },
                },
                {
                  case: { $eq: ["$subRole", "coach"] },
                  then: {
                    $ifNull: [{ $arrayElemAt: ["$coach.images.url", 0] }, null],
                  },
                },
                {
                  case: { $eq: ["$subRole", "team"] },
                  then: {
                    $ifNull: [{ $arrayElemAt: ["$team.images.url", 0] }, null],
                  },
                },
                {
                  case: { $eq: ["$subRole", "influencer"] },
                  then: {
                    $ifNull: [
                      { $arrayElemAt: ["$influencer.images.url", 0] },
                      null,
                    ],
                  },
                },
              ],
              default: null,
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          role: 1,
          subRole: 1,
          supabaseId: 1,
          name: "$computedName",
          avatar: 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
    ];

    const users = await User.aggregate(pipeline).collation({
      locale: "en",
      strength: 2,
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("search-users error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
