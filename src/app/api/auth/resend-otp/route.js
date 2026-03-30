import createClient from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Resend the signup OTP to the user's email
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      // Surface the Supabase error clearly (e.g. over_email_send_rate_limit)
      return NextResponse.json(
        { message: error.message || "Failed to resend OTP", code: error.code },
        { status: error.status || 400 }
      );
    }

    return NextResponse.json(
      { message: "OTP resent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("resend-otp error:", error);
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  }
}
