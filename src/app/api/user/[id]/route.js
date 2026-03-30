import { connectDB } from "@/lib/db";
import { computeIsProfileCompleted } from "@/lib/helper";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { id: supabaseId } = await params;
  try {
    if (!supabaseId) {
      return NextResponse.json(
        { error: "supabaseId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    let user = await User.findOne({ supabaseId }).populate("invitedBy");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Compute isProfileCompleted
    const isProfileCompleted = computeIsProfileCompleted(user);

    // Update isProfileCompleted in the database if it differs
    if (user.isProfileCompleted !== isProfileCompleted) {
      user = await User.findOneAndUpdate(
        { supabaseId },
        { $set: { isProfileCompleted } },
        { new: true }
      );
    }

    return NextResponse.json(
      {
        data: {
          data: { ...user.toObject(), isProfileCompleted },
          success: true,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
