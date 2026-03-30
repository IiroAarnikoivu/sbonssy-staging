import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import createClient from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await connectDB();

    if (!user?.user_metadata?.is_super_admin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 400 });
    }
    const userData = await User.findOne({ supabaseId: user.id });

    return NextResponse.json({ data: userData }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal Sever Error", error: error },
      { status: 500 }
    );
  }
}
