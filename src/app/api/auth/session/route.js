import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Initialize Supabase client
    const supabase = await createClient();

    // Fetch authenticated user (server-verified)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ user: null });
    }

    // Fetch MongoDB user profile
    await connectDB();
    const mongoUser = await User.findOne({ supabaseId: user.id }).lean();
    if (!mongoUser) {
      return NextResponse.json({ user: null });
    }

    const userData = {
      id: user.id,
      email: user.email,
      role: mongoUser.role,
      name: mongoUser.name || user.user_metadata?.name || "",
    };

    return NextResponse.json({ data: { user: userData } });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
