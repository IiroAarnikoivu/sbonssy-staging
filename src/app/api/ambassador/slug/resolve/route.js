import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

// GET /api/ambassador/slug/resolve?name=John%20Doe&supabaseId=xxx
// Returns { success: true, data: { ordinal: 1, slug: "john-doe" } }
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawName = (searchParams.get("name") || "").trim();
    // Build a flexible name regex that tolerates variable whitespace
    const buildFlexibleNameRegex = (name) => {
      const parts = String(name)
        .split(/\s+/)
        .filter(Boolean)
        .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const flexiblePattern = `^${parts.join("\\s+")}$`;
      return new RegExp(flexiblePattern, "i");
    };
    const name = rawName;
    const supabaseId = (searchParams.get("supabaseId") || "").trim();

    if (!name) {
      return NextResponse.json(
        { success: false, error: "name is required" },
        { status: 400 },
      );
    }

    await connectDB();

    const nameCandidate = name;

    // Build regex for whitespace flexibility
    const nameRegex = buildFlexibleNameRegex(name);

    const orConditions = [
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
    ];

    const users = await User.find({
      role: "sports-ambassador",
      $or: orConditions,
    })
      .collation({ locale: "en", strength: 1 })
      .sort({ createdAt: 1 })
      .select("supabaseId createdAt");

    if (!users || users.length === 0) {
      return NextResponse.json({ success: true, data: { ordinal: 1 } });
    }

    let index = 0;
    if (supabaseId) {
      index = users.findIndex((u) => String(u.supabaseId) === supabaseId);
      if (index < 0) index = 0;
    }

    const ordinal = index + 1;
    return NextResponse.json({ success: true, data: { ordinal } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
