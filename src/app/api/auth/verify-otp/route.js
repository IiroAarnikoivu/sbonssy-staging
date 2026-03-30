import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    await connectDB();
    const { email, token, role } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { message: "Email and OTP token are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify the OTP token sent to the user's email
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    if (error) {
      return NextResponse.json(
        { message: error.message || "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    if (!data?.user) {
      return NextResponse.json(
        { message: "Verification failed. Please try again." },
        { status: 400 }
      );
    }

    // Fetch the user from MongoDB and mark as verified (stateId: 1)
    const mongoUser = await User.findOneAndUpdate(
      { supabaseId: data.user.id },
      { $set: { stateId: 1 } },
      { new: true }
    );

    if (!mongoUser) {
      return NextResponse.json(
        { message: "User record not found. Please contact support." },
        { status: 404 }
      );
    }

    const userResponse = {
      id: data.user.id,
      email: mongoUser.email,
      role: mongoUser.role,
      name: mongoUser.name || "",
      isProfileCompleted: mongoUser.isProfileCompleted,
      stateId: mongoUser.stateId || 0,
    };

    return NextResponse.json(
      {
        data: { user: userResponse },
        message: "Email verified successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("verify-otp error:", error);
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  }
}
