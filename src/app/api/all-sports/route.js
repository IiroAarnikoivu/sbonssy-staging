import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { winterSports, summerSports } from "@/lib/helper";

// List of all possible subRoles
const ALL_SUB_ROLES = [
  "influencer",
  "coach",
  "athlete",
  "paraAthlete",
  "exAthlete",
  "team",
];

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Extract filters
    let subRole = searchParams.get("subRole");
    const sport = searchParams.get("sport");
    const level = searchParams.get("level");
    const gender = searchParams.get("gender");
    const interests = searchParams.get("interests");
    const socialMedia = searchParams.get("socialMedia");
    const sort = searchParams.get("sort");
    const search = searchParams.get("search");
    const season = searchParams.get("season");

    // Validate sort parameter - updated with new options
    const validSortOptions = [
      "createdAt-desc",
      "createdAt-asc",
      "name-asc",
      "name-desc",
    ];
    if (sort && !validSortOptions.includes(sort)) {
      return NextResponse.json(
        { success: false, error: "Invalid sort parameter" },
        { status: 400 },
      );
    }

    // Transform and normalize subRole values for DB matching
    const selectedDbSubRoles = subRole
      ? subRole
          .split(",")
          .map((role) =>
            role === "paraAthlete"
              ? "para-athlete"
              : role === "exAthlete"
                ? "ex-athlete"
                : role,
          )
      : [];

    // Build base query
    const baseQuery = {
      role: "sports-ambassador",
      isProfileCompleted: true,

      ...(selectedDbSubRoles.length > 0 && {
        subRole: { $in: selectedDbSubRoles },
      }),
    };

    // Helper: role key mapping for nested fields
    const toNestedRoleKey = (role) =>
      role === "ex-athlete"
        ? "exAthlete"
        : role === "para-athlete"
          ? "paraAthlete"
          : role;

    // Use camelCase role keys for nested lookups; if no subRole filter, use all possible nested keys
    const rolesForNested =
      selectedDbSubRoles.length > 0
        ? selectedDbSubRoles.map(toNestedRoleKey)
        : ALL_SUB_ROLES;

    // Helper to escape regex special chars
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Helper function to build OR queries across provided roles (nested fields)
    const buildOrAcrossRoles = (field, valueArray, isRegex = false) => {
      const values = Array.isArray(valueArray)
        ? valueArray
        : typeof valueArray === "string"
          ? valueArray.split(",").filter(Boolean)
          : [];

      return {
        $or: rolesForNested.map((roleKey) => {
          const fieldPath = `${roleKey}.${field}`;
          if (isRegex && typeof valueArray === "string") {
            return { [fieldPath]: { $regex: valueArray, $options: "i" } };
          }
          return { [fieldPath]: { $in: values } };
        }),
      };
    };

    // Helper: case-insensitive exact match across roles using regex-in
    const buildOrAcrossRolesExactCI = (field, valueArray) => {
      const values = Array.isArray(valueArray)
        ? valueArray
        : typeof valueArray === "string"
          ? valueArray.split(",").filter(Boolean)
          : [];
      const regexes = values.map((v) => new RegExp(`^${escapeRegex(v)}$`, "i"));
      return {
        $or: rolesForNested.map((roleKey) => ({
          [`${roleKey}.${field}`]: { $in: regexes },
        })),
      };
    };

    // Collect AND conditions
    const andConditions = [];

    // Require a connected Stripe account for the applicable subRole(s)
    andConditions.push({
      $or: rolesForNested.map((roleKey) => ({
        [`${roleKey}.stripeAccountId`]: { $exists: true, $ne: "" },
      })),
    });

    // Handle season filter
    // Use tolerant, case-insensitive regex to account for minor variations
    // like hyphens vs spaces, capitalization, etc.
    if (season) {
      const seasonSports = season === "winter" ? winterSports : summerSports;

      // Build flexible regex patterns for each sport name by replacing any
      // sequence of non-alphanumeric characters with a wildcard pattern.
      const seasonRegexes = (Array.isArray(seasonSports) ? seasonSports : [])
        .filter(Boolean)
        .map((v) => {
          // Escape regex special chars, then loosen non-alphanumeric separators
          const escaped = escapeRegex(v);
          const flexible = escaped.replace(/[^A-Za-z0-9]+/g, "\\W+");
          return new RegExp(flexible, "i");
        });

      if (seasonRegexes.length > 0) {
        andConditions.push({
          $or: rolesForNested.map((roleKey) => ({
            [`${roleKey}.sports`]: { $in: seasonRegexes },
          })),
        });
      }
    }

    // Handle sport filter
    if (sport) {
      andConditions.push(buildOrAcrossRoles("sports", sport, false));
    }

    // Handle level filter
    if (level) {
      // Case-insensitive exact match for level values (e.g., "Semi-Pro")
      andConditions.push(buildOrAcrossRolesExactCI("level", level));
    }

    // Handle gender filter
    if (gender) {
      // Case-insensitive exact match for gender values (male/female/other)
      andConditions.push(buildOrAcrossRolesExactCI("gender", gender));
    }

    // location filter removed

    // Handle interests filter
    if (interests) {
      andConditions.push(buildOrAcrossRoles("interests", interests, false));
    }

    // Handle social media filter
    if (socialMedia) {
      const platforms = socialMedia.split(",").filter(Boolean);
      if (platforms.length > 0) {
        andConditions.push({
          $or: rolesForNested.flatMap((role) =>
            platforms.map((platform) => ({
              [`${role}.socialMedia.${platform}`]: { $exists: true, $ne: "" },
            })),
          ),
        });
      }
    }

    // Compose final query with $and
    const finalQuery =
      andConditions.length > 0
        ? { $and: [baseQuery, ...andConditions] }
        : baseQuery;

    // Build shared base for both data and count (projection to reduce payload)
    const projectionStage = {
      $project: {
        _id: 1,
        supabaseId: 1,
        subRole: 1,
        role: 1,
        isProfileCompleted: 1,
        createdAt: 1,
        computedName: 1,
        // Return only the needed nested fields per subRole
        "athlete.name": 1,
        "athlete.sports": 1,
        "athlete.images": 1,
        "athlete.goals": 1,
        "athlete.socialMedia": 1,
        "athlete.location": 1,
        "athlete.stripeAccountId": 1,
        "athlete.level": 1,
        "athlete.gender": 1,
        "exAthlete.name": 1,
        "exAthlete.sports": 1,
        "exAthlete.images": 1,
        "exAthlete.goals": 1,
        "exAthlete.socialMedia": 1,
        "exAthlete.location": 1,
        "exAthlete.stripeAccountId": 1,
        "exAthlete.level": 1,
        "exAthlete.gender": 1,
        "paraAthlete.name": 1,
        "paraAthlete.sports": 1,
        "paraAthlete.images": 1,
        "paraAthlete.goals": 1,
        "paraAthlete.socialMedia": 1,
        "paraAthlete.location": 1,
        "paraAthlete.stripeAccountId": 1,
        "paraAthlete.level": 1,
        "paraAthlete.gender": 1,
        "coach.name": 1,
        "coach.sports": 1,
        "coach.images": 1,
        "coach.goals": 1,
        "coach.socialMedia": 1,
        "coach.location": 1,
        "coach.stripeAccountId": 1,
        "coach.level": 1,
        "coach.gender": 1,
        "team.teamClubName": 1,
        "team.sports": 1,
        "team.images": 1,
        "team.goals": 1,
        "team.socialMedia": 1,
        "team.location": 1,
        "team.stripeAccountId": 1,
        "team.level": 1,
        "team.gender": 1,
        "influencer.name": 1,
        "influencer.sports": 1,
        "influencer.images": 1,
        "influencer.goals": 1,
        "influencer.socialMedia": 1,
        "influencer.location": 1,
        "influencer.stripeAccountId": 1,
        "influencer.level": 1,
        "influencer.gender": 1,
      },
    };

    // Use a single $facet aggregation to get both data and count in one DB round-trip
    const facetPipeline = [
      { $match: finalQuery },
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
      ...(search
        ? [{ $match: { computedName: { $regex: new RegExp(search, "i") } } }]
        : []),
      {
        $facet: {
          data: [
            {
              $sort:
                sort === "createdAt-desc"
                  ? { createdAt: -1 }
                  : sort === "createdAt-asc"
                    ? { createdAt: 1 }
                    : sort === "name-asc"
                      ? { computedName: 1 }
                      : sort === "name-desc"
                        ? { computedName: -1 }
                        : { createdAt: -1 },
            },
            { $skip: skip },
            { $limit: limit },
            projectionStage,
          ],
          totalCount: [{ $count: "total" }],
        },
      },
    ];

    const [facetResult] = await User.aggregate(facetPipeline).collation({
      locale: "en",
      strength: 2,
    });

    let filteredData = facetResult?.data || [];
    let filteredTotal = facetResult?.totalCount?.[0]?.total || 0;

    // geolocation filtering removed

    const response = NextResponse.json({
      success: true,
      total: filteredTotal,
      data: filteredData,
      pagination: { page, limit, total: filteredTotal },
    });

    // Allow short-lived CDN/ISR caching: 60s fresh, 300s stale-while-revalidate
    // Avoids hammering the DB on every page visit for identical queries
    if (!search) {
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300",
      );
    }

    return response;
  } catch (error) {
    console.error("Sports ambassadors fetch error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
