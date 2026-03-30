import { connectDB } from "@/lib/db";
import { sendEmail } from "@/lib/sendEmail";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    await connectDB();
    const { email, password, role, shopify_token } = await request.json();
    if (!email || !password || !role) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["admin", "fan", "sports-ambassador", "brand"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    const supabase = await createClient();
    // Determine a robust base URL for redirects (prod-safe)
    const originFromReq = request.headers.get("origin");
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXTAUTH_URL ||
      originFromReq ||
      "http://localhost:3000";

    // After email verification, route via our auth callback which will redirect to onboarding
    // Include role to help the callback decide onboarding path for brand/ambassador
    const redirectUrl = `${baseUrl.replace(
      /\/$/,
      ""
    )}/api/auth/callback?role=${encodeURIComponent(role)}`;

    // Sign up with Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        // ?role=${encodeURIComponent(role)}
        data: { role, isProfileCompleted: false },
      },
    });

    if (authError) {
      return NextResponse.json(
        { message: "error", error: authError },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { message: "Registration failed" },
        { status: 400 }
      );
    }
    const mongoData = await User.findOne({ email: authData.user.email });

    if (mongoData) {
      return NextResponse.json(
        { message: "Email already registered" },
        { status: 400 }
      );
    }

    // Create user in MongoDB

    const mongoUser = await User.create({
      email,
      supabaseId: authData.user.id,
      authProvider: "email",
      role,
      name: authData.user.user_metadata?.name || "",
      isProfileCompleted: false, // Explicitly set to false for new users
      stateId: 0,
      shopify_token,
    });

    // Don't auto-login — the session is created after the user verifies
    // their OTP. Return email + role so the client redirects to /verify-otp.
    return NextResponse.json(
      {
        data: { email, role },
        message: "OTP sent. Please verify your email.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  }
}
