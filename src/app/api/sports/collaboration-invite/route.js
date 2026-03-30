import { connectDB } from "@/lib/db";
import { sendEmail } from "@/lib/sendEmail";
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
        { status: 401 },
      );
    }
    let query2;
    if (user.user_metadata.inviter_email) {
      const ambassadorId = await User.findOne({
        email: user.user_metadata.inviter_email,
      });
      query2 = { supabaseId: ambassadorId.supabaseId };
    } else {
      query2 = { supabaseId: user.id };
    }

    const brand = await User.findOne(query2);
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);

    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const skip = (page - 1) * limit;
    const acceptedRequests = await CollaborationRequest.find({
      status: "accepted",
      brandId: brand._id,
    });

    const acceptedCollaborationIds = acceptedRequests.map((req) =>
      req.ambassadorId.toString(),
    );

    const query = {
      role: "sports-ambassador",
      subRole: { $eq: "team" },
      _id: { $nin: acceptedCollaborationIds },
      // isProfileCompleted: true,
    };
    const total = await User.countDocuments(query);
    const data = await User.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return new Response(JSON.stringify({ data, total }), { status: 200 });
  } catch (error) {
    console.error("Error fetching sports ambassadors:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch sports ambassadors" }),
      { status: 500 },
    );
  }
}
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
    let query;
    if (user.user_metadata.inviter_email) {
      const ambassadorId = await User.findOne({
        email: user.user_metadata.inviter_email,
      });
      query = { supabaseId: ambassadorId.supabaseId };
    } else {
      query = { supabaseId: user.id };
    }
    const sportsAmbassador = await User.findOne(query);
    if (!sportsAmbassador) {
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

    // Check for any existing request
    const existingRequest = await CollaborationRequest.findOne({
      brandId: sportsAmbassador._id,
      ambassadorId: ambassador._id,
    });

    if (existingRequest) {
      // If there's an active request
      if (["pending", "accepted"].includes(existingRequest.status)) {
        return new Response(
          JSON.stringify({
            message:
              existingRequest.status === "pending"
                ? "Collaboration request already sent"
                : "Collaboration already exists",
          }),
          { status: 409 },
        );
      }

      // If request was cancelled or rejected, update it
      if (["rejected", "cancelled"].includes(existingRequest.status)) {
        existingRequest.status = "pending";
        existingRequest.updatedAt = new Date();
        await existingRequest.save();

        return new Response(
          JSON.stringify({
            message: "Collaboration request resent successfully",
            data: existingRequest,
          }),
          { status: 200 },
        );
      }
    }

    // Create new request if none exists
    const collaborationRequest = new CollaborationRequest({
      brandId: sportsAmbassador._id,
      ambassadorId: ambassador._id,
      status: "pending",
    });

    const emailResult = await sendEmail({
      to: sportsAmbassador.email,
      subject: "You’ve sent a collaboration request",

      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #fff; background-color: #333; margin: 0; padding: 0;">
          <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
            <img src="https://res.cloudinary.com/dz2506ydg/image/upload/Sbonssy_logo_all_black_cprwob_ymbymj.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto;">
           
            <p style="color: #fff;">Hi ${sportsAmbassador.email || "there"},</p>
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
              sportsAmbassador.email
            }.Respond quicky and expand your team.</p>
          
            <a href="https://sbonssy.com" style="display: inline-block; padding: 10px 20px; background-color: #f26915; color: #fff; text-decoration: none; border-radius: 50px;">Stay connected</a>
            <p style="color: #fff; margin-top: 20px;">Best,<br>Team Sbonssy</p>
          </div>
        </div>
      `,
    });
    await collaborationRequest.save();

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

export async function PUT(request) {
  try {
    await connectDB();
    const supabase = await createClient();

    // Authenticate user
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
    let query;
    if (user.user_metadata.inviter_email) {
      const ambassadorId = await User.findOne({
        email: user.user_metadata.inviter_email,
      });
      query = {
        supabaseId: ambassadorId.supabaseId,
        role: "sports-ambassador",
      };
    } else {
      query = { supabaseId: user.id, role: "sports-ambassador" };
    }
    // Ensure user is a sports ambassador
    const ambassador = await User.findOne(query);

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

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

    const updatedRequest = await CollaborationRequest.findOneAndUpdate(
      {
        _id: requestId,
        $or: [
          { ambassadorId: ambassador._id },
          { ambassadorId: ambassador.invitedBy },
        ],
        status: "pending", // Only update if still pending
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
      { error: "Failed to update request", details: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const supabase = await createClient();

    // Authenticate user
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
    let query;
    if (user.user_metadata.inviter_email) {
      const ambassadorId = await User.findOne({
        email: user.user_metadata.inviter_email,
      });
      query = { supabaseId: ambassadorId.supabaseId };
    } else {
      query = { supabaseId: user.id };
    }
    const currentUser = await User.findOne(query);

    if (!currentUser) {
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    const { requestId } = await request.json();

    if (!requestId) {
      return new Response(
        JSON.stringify({ message: "Request ID is required" }),
        { status: 400 },
      );
    }

    const collaborationRequest = await CollaborationRequest.findById(requestId);

    if (!collaborationRequest) {
      return new Response(
        JSON.stringify({ message: "Collaboration request not found" }),
        { status: 404 },
      );
    }

    // Only brand or ambassador involved can delete it
    const isBrand = currentUser._id.equals(collaborationRequest.brandId);
    const isAmbassador = currentUser._id.equals(
      collaborationRequest.ambassadorId,
    );

    if (!isBrand && !isAmbassador) {
      return new Response(
        JSON.stringify({ message: "Unauthorized to delete this request" }),
        { status: 403 },
      );
    }
    const deletedRequest = await CollaborationRequest.findOneAndDelete({
      _id: requestId,
      brandId: currentUser._id,
      status: "pending", // Only allow deleting pending requests
    });

    // await CollaborationRequest.findByIdAndDelete(requestId);

    return new Response(
      JSON.stringify({
        message: "Collaboration request deleted successfully",
        status: true,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting collaboration request:", error);
    return new Response(
      JSON.stringify({
        message: "Failed to delete collaboration request",
        error: error.message,
      }),
      { status: 500 },
    );
  }
}
