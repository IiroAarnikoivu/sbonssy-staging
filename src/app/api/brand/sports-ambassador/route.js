import { connectDB } from "@/lib/db";
import { sendEmail } from "@/lib/sendEmail";
import createClient from "@/lib/supabase/server";
import { CollaborationRequest } from "@/models/CollaborationRequest";
import User from "@/models/User";
import { NextResponse } from "next/server";

// Sanitize regex input to prevent injection
const sanitizeRegex = (input) => {
  return input.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

export async function GET(request) {
  try {
    await connectDB();
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json(
        { message: "Unauthorized: Authentication failed" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;
    const searchTerm = sanitizeRegex(searchParams.get("search") || "");
    const mongoUser = await User.findOne({ supabaseId: user.id });

    if (!mongoUser) {
      return NextResponse.json(
        { message: "User not found in MongoDB" },
        { status: 404 },
      );
    }

    const acceptedRequests = await CollaborationRequest.find({
      status: "accepted",
      brandId: mongoUser._id,
    });
    const acceptedAmbassadorIds = acceptedRequests.map((req) =>
      req.ambassadorId.toString(),
    );

    // Build Stripe filter - same logic as marketplace (/api/all-sports)
    // Require connected Stripe account for any of the possible subRoles
    const subRoles = ["athlete", "team", "influencer", "coach", "exAthlete", "paraAthlete"];
    const stripeFilter = {
      $or: subRoles.map((roleKey) => ({
        [`${roleKey}.stripeAccountId`]: { $exists: true, $ne: "" },
      })),
    };

    let query = {
      role: "sports-ambassador",
      isProfileCompleted: true,
      invitedBy: null,
      _id: { $nin: acceptedAmbassadorIds },
      ...stripeFilter,
    };

    if (searchTerm) {
      query.$or = [
        { "athlete.name": { $regex: searchTerm, $options: "i" } },
        { "team.name": { $regex: searchTerm, $options: "i" } },
        { "coach.name": { $regex: searchTerm, $options: "i" } },
        { "paraAthlete.name": { $regex: searchTerm, $options: "i" } },
        { "exAthlete.name": { $regex: searchTerm, $options: "i" } },
        { "influencer.name": { $regex: searchTerm, $options: "i" } },
        { "athlete.sports": { $regex: searchTerm, $options: "i" } },
        { "team.sports": { $regex: searchTerm, $options: "i" } },
        { "coach.sports": { $regex: searchTerm, $options: "i" } },
        { "paraAthlete.sports": { $regex: searchTerm, $options: "i" } },
        { "exAthlete.sports": { $regex: searchTerm, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(query);
    const data = await User.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return NextResponse.json(
      { data, total, totalPages: Math.ceil(total / limit) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching sports ambassadors:", error);
    return NextResponse.json(
      { error: "Failed to fetch sports ambassadors" },
      { status: 500 },
    );
  }
}

// ... (POST, DELETE, PUT endpoints remain unchanged as provided)
export async function POST(request) {
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
        { status: 401 },
      );
    }

    const brand = await User.findOne({ supabaseId: user.id, role: "brand" });
    if (!brand) {
      return new Response(JSON.stringify({ message: "Brand not found" }), {
        status: 404,
      });
    }

    const { ambassadorId } = await request.json();

    if (!ambassadorId) {
      return new Response(
        JSON.stringify({ message: "Ambassador ID is required" }),
        { status: 400 },
      );
    }

    const ambassador = await User.findById(ambassadorId);
    if (!ambassador || ambassador.role !== "sports-ambassador") {
      return new Response(
        JSON.stringify({ message: "Invalid sports ambassador" }),
        { status: 404 },
      );
    }

    // Check if an active (pending or accepted) collaboration request exists
    const existingActiveRequest = await CollaborationRequest.findOne({
      brandId: brand._id,
      ambassadorId: ambassador._id,
      status: { $in: ["pending", "accepted"] },
    });

    if (existingActiveRequest) {
      return new Response(
        JSON.stringify({
          message:
            existingActiveRequest.status === "pending"
              ? "Collaboration request already sent"
              : "Collaboration already exists",
        }),
        { status: 409 },
      );
    }

    // Create a new collaboration request
    const collaborationRequest = new CollaborationRequest({
      brandId: brand._id,
      ambassadorId: ambassador._id,
      status: "pending",
    });

    await collaborationRequest.save();
    const emailResult = await sendEmail({
      to: brand.email,
      subject: "You’ve sent a collaboration request",

      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #fff; background-color: #333; margin: 0; padding: 0;">
          <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
            <img src="https://res.cloudinary.com/dz2506ydg/image/upload/Sbonssy_logo_all_black_cprwob_ymbymj.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto;">
           
            <p style="color: #fff;">Hi ${brand.email || "there"},</p>
            <p style="color: #fff;">You have sent a collaboration request to ${
              ambassador.email
            }</p>
          
            <a href="https://sbonssy.com" style="display: inline-block; padding: 10px 20px; background-color: #f26915; color: #fff; text-decoration: none; border-radius: 50px;">Stay connected</a>
            <p style="color: #fff; margin-top: 20px;">Best,<br>Team Sbonssy</p>
          </div>
        </div>
      `,
    });
    const emailResultAmbassador = await sendEmail({
      to: ambassador.email,
      subject: "You’ve received a collaboration request",

      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #fff; background-color: #333; margin: 0; padding: 0;">
          <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
            <img src="https://res.cloudinary.com/dz2506ydg/image/upload/Sbonssy_logo_all_black_cprwob_ymbymj.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto;">
           
            <p style="color: #fff;">Hi ${ambassador.email || "there"},</p>
            <p style="color: #fff;">You have received a collaboration request from ${
              brand.email
            }.Respond quicky and expand your team.</p>
          
            <a href="https://sbonssy.com" style="display: inline-block; padding: 10px 20px; background-color: #f26915; color: #fff; text-decoration: none; border-radius: 50px;">Stay connected</a>
            <p style="color: #fff; margin-top: 20px;">Best,<br>Team Sbonssy</p>
          </div>
        </div>
      `,
    });
    return new Response(
      JSON.stringify({
        message: "Collaboration request sent successfully",
        data: collaborationRequest,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Error sending collaboration request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send collaboration request" }),
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const supabase = await createClient();

    // Authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json(
        { message: "Unauthorized: Authentication failed" },
        { status: 401 },
      );
    }

    // Verify brand user
    const brand = await User.findOne({ supabaseId: user.id, role: "brand" });
    if (!brand) {
      return NextResponse.json({ message: "Brand not found" }, { status: 404 });
    }

    // Get requestId from request body
    const { requestId } = await request.json();

    if (!requestId) {
      return NextResponse.json(
        { message: "Request ID is required" },
        { status: 400 },
      );
    }

    // Delete the request
    const deletedRequest = await CollaborationRequest.findOneAndDelete({
      _id: requestId,
      brandId: brand._id,
      status: "pending", // Only allow deleting pending requests
    });

    if (!deletedRequest) {
      return NextResponse.json(
        { message: "Request not found or cannot be deleted" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Request deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting request:", error);
    return NextResponse.json(
      { error: "Failed to delete request" },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const supabase = await createClient();

    // Authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json(
        { message: "Unauthorized: Authentication failed" },
        { status: 401 },
      );
    }

    // Verify user is an ambassador
    const ambassador = await User.findOne({
      supabaseId: user.id,
      role: "sports-ambassador",
    });
    if (!ambassador) {
      return NextResponse.json(
        { message: "Ambassador not found" },
        { status: 404 },
      );
    }

    const { requestId, action } = await request.json();

    if (!requestId || !action) {
      return NextResponse.json(
        { message: "Request ID and action are required" },
        { status: 400 },
      );
    }

    // Validate action
    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

    // Find and update the request
    const updatedRequest = await CollaborationRequest.findOneAndUpdate(
      {
        _id: requestId,
        $or: [
          { ambassadorId: ambassador._id },
          { ambassadorId: ambassador.invitedBy },
        ],
        status: "pending", // Only allow updates to pending requests
      },
      {
        status: action === "accept" ? "accepted" : "rejected",
        respondedAt: new Date(),
      },
      { new: true },
    );

    if (!updatedRequest) {
      return NextResponse.json(
        { message: "Request not found or cannot be updated" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        message: `Request ${action}ed successfully`,
        data: updatedRequest,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating request:", error);
    return NextResponse.json(
      { error: "Failed to update request" },
      { status: 500 },
    );
  }
}
