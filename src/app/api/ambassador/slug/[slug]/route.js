import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

// Normalize DB subRole (e.g., "ex-athlete") into the camelCase keys the UI expects (e.g., "exAthlete")
function normalizeSubRole(subRole) {
  if (!subRole) return null;
  const map = {
    athlete: "athlete",
    team: "team",
    influencer: "influencer",
    coach: "coach",
    "ex-athlete": "exAthlete",
    "para-athlete": "paraAthlete",
  };
  const key = String(subRole).toLowerCase();
  return map[key] || key;
}
export async function GET(_request, { params }) {
  try {
    const { slug } = (await params) || {};
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Slug is required" },
        { status: 400 },
      );
    }

    // Extract optional suffix (last -XXXXXXXX where XXXXXXXX is 8 hex chars)
    const slugStr = String(slug).trim();

    const match = slugStr.match(/^(.*?)-(\p{Hex_Digit}{8})$/u);

    const hasHexSuffix = !!match;
    let namePart = hasHexSuffix ? match[1] : slugStr;

    const suffix = hasHexSuffix ? match[2] : null;

    // Convert full slug back to a human name candidate first.
    // This lets us correctly resolve names that legitimately end with digits (e.g., "athlete 30").
    const fullNameCandidate = String(slugStr).replace(/-/g, " ").trim();

    // If no hex suffix, support numeric disambiguation at the end of the slug: '<base>' (index 1), '<base>2' (index 2), etc.
    // But only fall back to numeric-disambiguation if resolving the full name (including trailing digits) finds no users.
    let ordinalIndex = 1;

    // Helper to build a flexible name regex where spaces can collapse/expand
    const buildFlexibleNameRegex = (name) => {
      const parts = String(name)
        .split(/\s+/)
        .filter(Boolean)
        .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const flexiblePattern = `^${parts.join("\\s+")}$`;
      return new RegExp(flexiblePattern, "i");
    };

    // Attempt direct resolution using the full name first (handles names ending with digits)
    let nameCandidate = fullNameCandidate;
    let attemptedFullNameResolution = false;
    if (!hasHexSuffix) {
      attemptedFullNameResolution = true;
      const nameRegexFull = buildFlexibleNameRegex(fullNameCandidate);

      await connectDB();

      const orConditionsFull = [
        // Direct matches for diacritic-insensitive lookup (collation strength 1 applies here)
        { "athlete.name": fullNameCandidate },
        { "exAthlete.name": fullNameCandidate },
        { "paraAthlete.name": fullNameCandidate },
        { "coach.name": fullNameCandidate },
        { "influencer.name": fullNameCandidate },
        { "team.teamClubName": fullNameCandidate },
        { "team.name": fullNameCandidate },
        // Regex matches for whitespace flexibility (collation ignored for regex)
        { "athlete.name": nameRegexFull },
        { "exAthlete.name": nameRegexFull },
        { "paraAthlete.name": nameRegexFull },
        { "coach.name": nameRegexFull },
        { "influencer.name": nameRegexFull },
        { "team.teamClubName": nameRegexFull },
        { "team.name": nameRegexFull },
      ];

      const usersFull = await User.find({
        role: "sports-ambassador",
        $or: orConditionsFull,
      })
        .collation({ locale: "en", strength: 1 })
        .sort({ createdAt: 1 })
        .select(
          [
            "supabaseId subRole",
            "athlete.name athlete.tracking_key",
            "exAthlete.name exAthlete.tracking_key",
            "paraAthlete.name paraAthlete.tracking_key",
            "coach.name coach.tracking_key",
            "influencer.name influencer.tracking_key",
            "team.teamClubName team.name team.tracking_key",
            "athlete.images.url",
            "exAthlete.images.url",
            "paraAthlete.images.url",
            "coach.images.url",
            "influencer.images.url",
            "team.images.url",
          ].join(" "),
        );

      if (usersFull && usersFull.length > 0) {
        // Found an exact name match treating trailing digits as part of the name.
        const user = usersFull[0];
        const sr = String(user.subRole || "").toLowerCase();
        let name = null;
        let avatar = null;
        if (sr === "athlete") {
          name = user?.athlete?.name || null;
          avatar = user?.athlete?.images?.[0]?.url || null;
        } else if (sr === "ex-athlete") {
          name = user?.exAthlete?.name || null;
          avatar = user?.exAthlete?.images?.[0]?.url || null;
        } else if (sr === "para-athlete") {
          name = user?.paraAthlete?.name || null;
          avatar = user?.paraAthlete?.images?.[0]?.url || null;
        } else if (sr === "coach") {
          name = user?.coach?.name || null;
          avatar = user?.coach?.images?.[0]?.url || null;
        } else if (sr === "influencer") {
          name = user?.influencer?.name || null;
          avatar = user?.influencer?.images?.[0]?.url || null;
        } else if (sr === "team") {
          name = user?.team?.name || user?.team?.teamClubName || null;
          avatar = user?.team?.images?.[0]?.url || null;
        }

        return NextResponse.json({
          success: true,
          data: {
            supabaseId: user.supabaseId,
            subRole: normalizeSubRole(user.subRole),
            name: name,
            avatar: avatar,
          },
        });
      }
    }

    // If hex suffix provided or full-name resolution failed, fall back to existing logic which
    // supports optional tracking suffix and numeric disambiguation.
    if (!hasHexSuffix) {
      const numMatch = namePart.match(/^(.*?)(\d+)$/);
      if (numMatch) {
        namePart = numMatch[1];
        ordinalIndex = parseInt(numMatch[2], 10) || 1;
        if (ordinalIndex < 1) ordinalIndex = 1;
      }
    }

    // Convert name part back to a human name. Accept hyphens as spaces.
    nameCandidate = String(namePart).replace(/-/g, " ").trim();
    if (!nameCandidate) {
      return NextResponse.json(
        { success: false, error: "Invalid slug" },
        { status: 400 },
      );
    }

    if (!attemptedFullNameResolution) {
      await connectDB();
    }

    // Build a flexible name regex: spaces in the slug may correspond to one or more spaces in DB
    // Example: slug "new sports" should match DB name "New  sports" (double space)
    const parts = nameCandidate.split(/\s+/).filter(Boolean);
    const escaped = parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const flexiblePattern = `^${escaped.join("\\s+")}$`;
    const nameRegex = new RegExp(flexiblePattern, "i");

    // Build OR conditions for each subrole, combining name and optional tracking_key suffix
    const suffixRegex = suffix ? new RegExp(`${suffix}$`, "i") : null;

    const orConditions = [
      ...(suffixRegex
        ? [
            // Prefer name + tracking match (direct name match for diacritics)
            {
              "athlete.name": nameCandidate,
              "athlete.tracking_key": suffixRegex,
            },
            {
              "exAthlete.name": nameCandidate,
              "exAthlete.tracking_key": suffixRegex,
            },
            {
              "paraAthlete.name": nameCandidate,
              "paraAthlete.tracking_key": suffixRegex,
            },
            { "coach.name": nameCandidate, "coach.tracking_key": suffixRegex },
            {
              "influencer.name": nameCandidate,
              "influencer.tracking_key": suffixRegex,
            },
            {
              "team.teamClubName": nameCandidate,
              "team.tracking_key": suffixRegex,
            },
            { "team.name": nameCandidate, "team.tracking_key": suffixRegex },
            // Fallback: nameRegex + tracking match (whitespace flexibility)
            { "athlete.name": nameRegex, "athlete.tracking_key": suffixRegex },
            {
              "exAthlete.name": nameRegex,
              "exAthlete.tracking_key": suffixRegex,
            },
            {
              "paraAthlete.name": nameRegex,
              "paraAthlete.tracking_key": suffixRegex,
            },
            { "coach.name": nameRegex, "coach.tracking_key": suffixRegex },
            {
              "influencer.name": nameRegex,
              "influencer.tracking_key": suffixRegex,
            },
            {
              "team.teamClubName": nameRegex,
              "team.tracking_key": suffixRegex,
            },
            { "team.name": nameRegex, "team.tracking_key": suffixRegex },
            // Fallback: allow tracking_key-only match to tolerate name normalization differences
            { "athlete.tracking_key": suffixRegex },
            { "exAthlete.tracking_key": suffixRegex },
            { "paraAthlete.tracking_key": suffixRegex },
            { "coach.tracking_key": suffixRegex },
            { "influencer.tracking_key": suffixRegex },
            { "team.tracking_key": suffixRegex },
          ]
        : [
            // Direct matches for diacritic-insensitive lookup (strength 1)
            { "athlete.name": nameCandidate },
            { "exAthlete.name": nameCandidate },
            { "paraAthlete.name": nameCandidate },
            { "coach.name": nameCandidate },
            { "influencer.name": nameCandidate },
            { "team.teamClubName": nameCandidate },
            { "team.name": nameCandidate },
            // Regex matches for whitespace flexibility
            { "athlete.name": nameRegex },
            { "exAthlete.name": nameRegex },
            { "paraAthlete.name": nameRegex },
            { "coach.name": nameRegex },
            { "influencer.name": nameRegex },
            { "team.teamClubName": nameRegex },
            { "team.name": nameRegex },
          ]),
    ];

    const users = await User.find({
      role: "sports-ambassador",
      $or: orConditions,
    })
      .collation({ locale: "en", strength: 1 })
      .sort({ createdAt: 1 })
      .select(
        [
          // core
          "supabaseId subRole",
          // names + tracking
          "athlete.name athlete.tracking_key",
          "exAthlete.name exAthlete.tracking_key",
          "paraAthlete.name paraAthlete.tracking_key",
          "coach.name coach.tracking_key",
          "influencer.name influencer.tracking_key",
          "team.teamClubName team.name team.tracking_key",
          // images for avatar derivation
          "athlete.images.url",
          "exAthlete.images.url",
          "paraAthlete.images.url",
          "coach.images.url",
          "influencer.images.url",
          "team.images.url",
        ].join(" "),
      );

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, error: "Ambassador not found" },
        { status: 404 },
      );
    }

    // Select Nth user based on numeric disambiguation (default 1st)
    const idx = Math.min(Math.max(ordinalIndex, 1), users.length) - 1;
    const user = users[idx];

    // Derive display name and avatar from subRole document
    const sr = String(user.subRole || "").toLowerCase();
    let name = null;
    let avatar = null;
    if (sr === "athlete") {
      name = user?.athlete?.name || null;
      avatar = user?.athlete?.images?.[0]?.url || null;
    } else if (sr === "ex-athlete") {
      name = user?.exAthlete?.name || null;
      avatar = user?.exAthlete?.images?.[0]?.url || null;
    } else if (sr === "para-athlete") {
      name = user?.paraAthlete?.name || null;
      avatar = user?.paraAthlete?.images?.[0]?.url || null;
    } else if (sr === "coach") {
      name = user?.coach?.name || null;
      avatar = user?.coach?.images?.[0]?.url || null;
    } else if (sr === "influencer") {
      name = user?.influencer?.name || null;
      avatar = user?.influencer?.images?.[0]?.url || null;
    } else if (sr === "team") {
      name = user?.team?.name || user?.team?.teamClubName || null;
      avatar = user?.team?.images?.[0]?.url || null;
    }

    return NextResponse.json({
      success: true,
      data: {
        supabaseId: user.supabaseId,
        subRole: normalizeSubRole(user.subRole),
        name: name,
        avatar: avatar,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
