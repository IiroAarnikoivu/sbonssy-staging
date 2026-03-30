// app/api/users/acceptTerms/route.js
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const updatedUser = await User.findOneAndUpdate(
      { supabaseId: user.id },
      { $set: { termsAccepted: true, termsAcceptedAt: new Date() } },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 }
    );
  }
}
export async function GET(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const updatedUser = await User.findOne({ supabaseId: user.id });

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 }
    );
  }
}
