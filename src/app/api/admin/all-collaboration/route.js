import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CollaborationRequest } from "@/models/CollaborationRequest";
import createClient from "@/lib/supabase/server";

export async function GET(request) {
  try {
    // Initialize Supabase client and verify user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user?.user_metadata?.is_super_admin) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    await connectDB();

    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;

    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await CollaborationRequest.countDocuments();

    // Fetch collaboration requests with populated brand and ambassador details
    const requests = await CollaborationRequest.find()

      .populate("brandId")
      .populate("ambassadorId")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return NextResponse.json({
      data: {
        requests,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching collaboration requests:", error);
    return NextResponse.json(
      { error: "Internal Server Error", error },
      { status: 500 }
    );
  }
}
