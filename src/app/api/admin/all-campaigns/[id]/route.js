import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import Campaign from "@/models/Campaign";
import { NextResponse } from "next/server";

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const supabase = await createClient();
    const { data: userData, error: authError } = await supabase.auth.getUser();

    if (!userData.user.user_metadata.is_super_admin || authError) {
      return NextResponse.json(
        { message: "Forbidden", error: authError },
        { status: 401 }
      );
    }
    const { id } = params;
    const data = await Campaign.findByIdAndDelete(id);
    return NextResponse.json(
      { message: "Campaign deleted successfully", data },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal Sever Error", error: error.message },
      { status: 400 }
    );
  }
}
