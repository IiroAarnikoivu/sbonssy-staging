import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import { CollaborationRequest } from "@/models/CollaborationRequest";
import User from "@/models/User";

export async function GET(request) {
  try {
    await connectDB();
    const supabase = await createClient();

    // Verify user is authenticated
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
    const limit = 10;
    const skip = (page - 1) * limit;

    // Find the ambassador
    const ambassador = await User.findOne({ supabaseId: user.id });
    if (!ambassador || ambassador.role !== "sports-ambassador") {
      return new Response(
        JSON.stringify({ message: "User is not a sports ambassador" }),
        { status: 403 }
      );
    }

    // Fetch all matching requests first
    const allRequests = await CollaborationRequest.find({
      $or: [
        { ambassadorId: ambassador._id },
        { ambassadorId: ambassador.invitedBy },
      ],
      status: "pending",
    })
      .populate({
        path: "brandId",
        select: "role brand.companyName brand.companyLogo", // Include role for filtering
      })
      .select("brandId status createdAt");

    // Filter out requests where the sender is a brand
    const filteredRequests = allRequests.filter(
      (req) => req.brandId?.role == "brand"
    );

    const totalItems = filteredRequests.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedRequests = filteredRequests.slice(skip, skip + limit);

    // Format output
    const formattedRequests = paginatedRequests.map((request) => ({
      _id: request._id,
      status: request.status,
      createdAt: request.createdAt,
      brandId: {
        _id: request.brandId._id,
        companyName: request.brandId.brand?.companyName || "",
        companyLogo: request.brandId.brand?.companyLogo,
      },
    }));

    return new Response(
      JSON.stringify({
        data: {
          data: formattedRequests,
          pagination: {
            currentPage: page,
            totalItems,
            totalPages,
          },
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching collaboration requests:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch collaboration requests" }),
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const supabase = await createClient();

    const { id } = params;
    const { status } = await request.json();

    if (!["accepted", "rejected"].includes(status)) {
      return new Response(JSON.stringify({ message: "Invalid status value" }), {
        status: 400,
      });
    }

    // Verify user is authenticated
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

    // Find the request
    const requestDoc = await CollaborationRequest.findById(id);
    if (!requestDoc) {
      return new Response(JSON.stringify({ message: "Request not found" }), {
        status: 404,
      });
    }

    // Verify the authenticated user is the ambassador for this request
    const ambassador = await User.findOne({
      _id: requestDoc.ambassadorId,
      supabaseId: user.id,
    });

    if (!ambassador) {
      return new Response(
        JSON.stringify({
          message: "Unauthorized: You can only update your own requests",
        }),
        { status: 403 }
      );
    }

    // Update the request status
    requestDoc.status = status;
    await requestDoc.save();

    return new Response(
      JSON.stringify({ message: "Request status updated successfully" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating collaboration request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update collaboration request" }),
      { status: 500 }
    );
  }
}
