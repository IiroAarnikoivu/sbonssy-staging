import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import { CollaborationRequest } from "@/models/CollaborationRequest";
import User from "@/models/User";

export async function GET(request) {
  try {
    await connectDB();
    const supabase = await createClient();

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user?.id) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get current user
    const currentUser = await User.findOne({ supabaseId: user.id });
    if (!currentUser || currentUser.subRole !== "team") {
      return new Response(JSON.stringify({ message: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get pagination params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const skip = (page - 1) * limit;

    // Query for invites
    const query = {
      ambassadorId: currentUser._id,
      status: "pending",
      // requestedByRole: "sports-ambassador",
    };
    // const total = await CollaborationRequest.countDocuments(query);
    // const data = await CollaborationRequest.find(query)
    //   .populate("brandId")
    //   .sort({ createdAt: -1 })
    //   .skip(skip)
    //   .limit(limit);
    const rawRequests = await CollaborationRequest.find({
      ambassadorId: currentUser._id,
      status: "pending",
    })
      .populate("brandId")
      .sort({ createdAt: -1 });

    // Filter out requests where brandId.role === "brand"
    const filteredRequests = rawRequests.filter(
      (req) => req.brandId?.role !== "brand"
    );

    // Apply pagination *after* filtering
    const total = filteredRequests.length;
    const paginatedData = filteredRequests.slice(skip, skip + limit);

    return new Response(JSON.stringify({ data: paginatedData, total }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
