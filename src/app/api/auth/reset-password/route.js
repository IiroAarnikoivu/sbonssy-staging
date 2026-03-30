import { NextResponse } from "next/server";
import createClient from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const { email, origin } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const baseUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000"
    ).replace(/\/$/, "");
    const base = `${baseUrl}/reset-password`;
    const redirectTo = origin
      ? `${base}?origin=${encodeURIComponent(origin)}`
      : base;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
