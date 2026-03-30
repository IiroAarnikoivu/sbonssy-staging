import { connectDB } from "@/lib/db";
import { CollaborationRequest } from "@/models/CollaborationRequest";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id: supabaseId } = await params;
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 8;
    const skip = (page - 1) * limit;
    const brand = await User.findOne({ supabaseId: supabaseId });

    const acceptedRequests = await CollaborationRequest.find({
      status: "accepted",
      brandId: brand._id,
    });
    const totalItems = await CollaborationRequest.countDocuments({
      status: "accepted",
      brandId: brand._id,
    });
    const totalPages = Math.ceil(totalItems / limit);
    const acceptedCollaborationIds = acceptedRequests.map((req) =>
      req.ambassadorId.toString()
    );

    const data = await User.find({
      role: "sports-ambassador",
      _id: { $in: acceptedCollaborationIds },
      isProfileCompleted: true,
    })
      .skip(skip)
      .limit(limit);

    return NextResponse.json(
      {
        data,
        pagination: {
          currentPage: page,
          totalItems,
          totalPages,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching sports ambassadors:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch sports ambassadors" }),
      { status: 500 }
    );
  }
}
