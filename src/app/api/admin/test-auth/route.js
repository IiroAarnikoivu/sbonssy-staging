import { NextResponse } from "next/server";
import createClient from "@/lib/supabase/server";

export async function GET(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ 
        error: "Unauthorized", 
        details: "No user session found" 
      }, { status: 401 });
    }

    const isAdmin = user?.user_metadata?.is_super_admin;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        isAdmin,
        userMetadata: user.user_metadata
      },
      message: isAdmin ? "Admin access confirmed" : "User is not an admin"
    });

  } catch (error) {
    console.error("Admin auth test error:", error);
    return NextResponse.json(
      { error: "Failed to check admin status", details: error.message },
      { status: 500 }
    );
  }
}
