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
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);

    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const skip = (page - 1) * limit;
    const ambassador = await User.findOne({ supabaseId: user.id });

    const acceptedRequests = await CollaborationRequest.find({
      status: "accepted",
      ambassadorId: ambassador._id,
    }).populate("brandId"); // Populate the brand details directly

    const acceptedBrandIds = acceptedRequests.map((req) =>
      req.brandId._id.toString()
    );
    const totalItems = await User.countDocuments({
      role: "sports-ambassador",
      _id: { $in: acceptedBrandIds },
    });
    const teams = await User.find({
      role: "sports-ambassador",
      _id: { $in: acceptedBrandIds },
    })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return new Response(
      JSON.stringify({
        data: teams,
        total: totalItems,
      }),
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error fetching accepted brands:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch accepted brands" }),
      { status: 500 }
    );
  }
}
