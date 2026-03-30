import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { isPromise } from "formik";
import { NextResponse } from "next/server";

export function toCamelCase(str) {
  if (!str) return "";
  return str?.replace(/[-_](\w)/g, (_, c) => c.toUpperCase());
}

export async function GET(request) {
  try {
    await connectDB();
    const query = { role: "sports-ambassador", isProfileCompleted: true }; // Only active users

    const { searchParams } = new URL(request?.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    // Count total documents matching the role
    const total = await User.countDocuments(query);

    // Fetch ambassadors with pagination
    const ambassadors = await User.find(query)
      .select(
        "subRole supabaseId athlete team influencer exAthlete paraAthlete coach images "
      )

      .limit(limit);

    // Transform ambassadors data
    const ambassadorsData = ambassadors.map((ambassador) => {
      const subRole = toCamelCase(ambassador?.subRole);
      return {
        name: ambassador[subRole]?.name,
        image: ambassador[subRole]?.images[0]?.url,
        subRole: ambassador?.subRole,
        supabaseId: ambassador?.supabaseId,
        trackingKey: ambassador?.[subRole]?.tracking_key,
      };
    });

    return NextResponse.json(
      {
        data: ambassadorsData,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching ambassadors:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
