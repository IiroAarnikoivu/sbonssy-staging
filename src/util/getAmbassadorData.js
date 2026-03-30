import { connectDB } from "@/lib/db";
import User from "@/models/User";

const subRoleMapping = {
  "sports-ambassador": "sports-ambassador",
  athlete: "athlete",
  "ex-athlete": "ex-athlete",
  "para-athlete": "para-athlete",
  coach: "coach",
  influencer: "influencer",
  team: "team",
};

function normalizeSubRole(role) {
  const r = String(role || "").toLowerCase();
  return subRoleMapping[r] || r;
}

function buildFlexibleNameRegex(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  const escaped = parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const flexiblePattern = `^${escaped.join("\\s+")}$`;
  return new RegExp(flexiblePattern, "i");
}

import { cache } from "react";

export const getAmbassadorDataBySlug = cache(async function (slug, full = false) {
  try {
    await connectDB();

    // 1. Deconstruct slug
    let namePart = slug;
    let suffix = null;
    let ordinalIndex = 1;

    // Handle tracking key suffix (8 hex chars)
    if (slug.length > 9 && slug[slug.length - 9] === "-") {
      const potentialSuffix = slug.slice(-8);
      if (/^[0-9a-fA-F]{8}$/.test(potentialSuffix)) {
        suffix = potentialSuffix;
        namePart = slug.slice(0, -9);
      }
    }

    // Handle numeric disambiguation (e.g., name2)
    const numMatch = namePart.match(/^(.*?)(\d+)$/);
    if (numMatch) {
      namePart = numMatch[1];
      ordinalIndex = parseInt(numMatch[2], 10) || 1;
    }

    const nameCandidate = String(namePart)
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!nameCandidate) return null;

    const nameRegex = buildFlexibleNameRegex(nameCandidate);
    const suffixRegex = suffix ? new RegExp(`${suffix}$`, "i") : null;

    // 2. Build Query
    const orConditions = [
      ...(suffixRegex
        ? [
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
            // Fallback tracking key only
            { "athlete.tracking_key": suffixRegex },
            { "exAthlete.tracking_key": suffixRegex },
            { "paraAthlete.tracking_key": suffixRegex },
            { "coach.tracking_key": suffixRegex },
            { "influencer.tracking_key": suffixRegex },
            { "team.tracking_key": suffixRegex },
          ]
        : [
            // Direct matches for diacritic-insensitive lookup (Strength 1)
            { "athlete.name": nameCandidate },
            { "exAthlete.name": nameCandidate },
            { "paraAthlete.name": nameCandidate },
            { "coach.name": nameCandidate },
            { "influencer.name": nameCandidate },
            { "team.teamClubName": nameCandidate },
            { "team.name": nameCandidate },
            // Regex for flexibility
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
        "supabaseId subRole athlete exAthlete paraAthlete coach influencer team",
      )
      .lean();

    if (!users || users.length === 0) return null;

    const idx = Math.min(Math.max(ordinalIndex, 1), users.length) - 1;
    const user = users[idx];

    // 3. Extract Data
    const sr = String(user.subRole || "").toLowerCase();
    let name = null;
    let avatar = null;
    if (sr === "athlete") {
      name = user.athlete?.name;
      avatar = user.athlete?.images?.[0]?.url;
    } else if (sr === "ex-athlete") {
      name = user.exAthlete?.name;
      avatar = user.exAthlete?.images?.[0]?.url;
    } else if (sr === "para-athlete") {
      name = user.paraAthlete?.name;
      avatar = user.paraAthlete?.images?.[0]?.url;
    } else if (sr === "coach") {
      name = user.coach?.name;
      avatar = user.coach?.images?.[0]?.url;
    } else if (sr === "influencer") {
      name = user.influencer?.name;
      avatar = user.influencer?.images?.[0]?.url;
    } else if (sr === "team") {
      name = user.team?.name || user.team?.teamClubName;
      avatar = user.team?.images?.[0]?.url;
    }

    const result = full ? {
      ...user,
      name,
      avatar,
      subRole: normalizeSubRole(user.subRole),
    } : {
      supabaseId: user.supabaseId,
      subRole: normalizeSubRole(user.subRole),
      name,
      avatar,
    };

    // Ensure we return a plain object that can be passed to Client Components
    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.error("Error in getAmbassadorDataBySlug:", error);
    return null;
  }
});
