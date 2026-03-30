import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import { CollaborationRequest } from "@/models/CollaborationRequest";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    await connectDB();
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return new Response(
        JSON.stringify({ message: "Unauthorized: Authentication failed" }),
        { status: 401 }
      );
    }
    const brand = await User.findOne({ supabaseId: user.id });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    const acceptedRequests = await CollaborationRequest.find({
      status: "accepted",
      brandId: brand._id,
    });

    const acceptedCollaborationIds = acceptedRequests.map((req) =>
      req.ambassadorId.toString()
    );

    // Build query for users
    const query = {
      role: "sports-ambassador",
      _id: { $in: acceptedCollaborationIds },
    };

    // Add search criteria if search term is provided
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(query);

    const data = await User.find(query).skip(skip).limit(limit);

    return new Response(JSON.stringify({ data, total }), { status: 200 });
  } catch (error) {
    console.error("Error fetching sports ambassadors:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch sports ambassadors" }),
      { status: 500 }
    );
  }
}
