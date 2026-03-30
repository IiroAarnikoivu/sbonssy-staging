import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import { CollaborationRequest } from "@/models/CollaborationRequest";
import User from "@/models/User";

// api/brand/sports-ambassador/requests/route.js
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

    const brand = await User.findOne({ supabaseId: user.id, role: "brand" });
    if (!brand) {
      return new Response(JSON.stringify({ message: "Brand not found" }), {
        status: 404,
      });
    }

    // Get all requests, not just pending ones
    const requests = await CollaborationRequest.find({
      brandId: brand._id,
    }).populate("ambassadorId");

    // Transform data to include status
    const requestsData = {};
    requests.forEach((request) => {
      requestsData[request.ambassadorId._id.toString()] = {
        id: request._id.toString(),
        status: request.status,
        createdAt: request.createdAt,
      };
    });

    return new Response(JSON.stringify(requestsData), { status: 200 });
  } catch (error) {
    console.error("Error fetching requests:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch requests" }), {
      status: 500,
    });
  }
}
