// app/api/get-user-by-code/route.js
import createClient from "@/lib/supabase/server";

import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code"); // Extract code from query params

  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    // Exchange code for session and get user data
    const {
      data: { user },
      error,
    } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Return minimal user data (avoid exposing sensitive fields)
    const safeUserData = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role,
      isProfileCompleted: user.user_metadata?.isProfileCompleted,
    };

    return NextResponse.json({
      user: safeUserData,
      message: "verified",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}
