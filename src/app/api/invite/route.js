import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import User from "@/models/User";
import Invite from "@/models/Invite";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const inviter = await User.findOne({
      supabaseId: authUser.id,
      role: { $in: ["brand", "sports-ambassador"] },
    });
    if (!inviter) {
      return NextResponse.json(
        { error: "Brand or Sports Ambassador not found" },
        { status: 404 },
      );
    }
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const accepted = await Invite.find({
      inviterId: inviter._id,
      status: "accepted",
    })
      .limit(limit)
      .skip(skip)
      .lean();
    const totalCount = await Invite.countDocuments({
      inviterId: inviter._id,
      status: "accepted",
    });
    const pending = await Invite.find({
      inviterId: inviter._id,
      status: "pending",
      expiresAt: { $gte: new Date() },
    }).lean();

    return NextResponse.json(
      {
        data: { accepted, pending },
        paginationData: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        message: "Invites fetched successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GET /api/invite] Error:", error);
    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const invitedEmail = body?.invitedEmail;
    // Always default to Can Modify; permission is no longer configurable
    const permission = "Can Modify";
    if (!invitedEmail) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(invitedEmail)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    await connectDB();
    const inviter = await User.findOne({
      supabaseId: authUser.id,
      role: { $in: ["brand", "sports-ambassador"] },
    });
    if (!inviter) {
      return NextResponse.json(
        { error: "Brand or Sports Ambassador not found" },
        { status: 404 },
      );
    }

    // Normalize email to lowercase for lookups and storage consistency
    const invitedEmailLower = invitedEmail.toLowerCase();

    // Check for existing invite in MongoDB
    const existingInvite = await Invite.findOne({
      invitedEmail: invitedEmailLower,
      inviterId: inviter._id,
      status: "pending",
    });
    if (existingInvite) {
      return NextResponse.json(
        { error: "Invitation already sent" },
        { status: 400 },
      );
    }

    // If the email is already registered, block the invite
    const existingUser = await User.findOne({ email: invitedEmailLower });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exist" },
        { status: 409 },
      );
    }

    // Check for existing pending invitation in Supabase
    const supabaseAdmin = createAdminClient();

    // check if user already exist in supabase
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("[POST /api/invite] Error listing Supabase users:", listError);
    } else {
      const supabaseUser = users.find(u => u.email?.toLowerCase() === invitedEmailLower);
      if (supabaseUser) {
        return NextResponse.json(
          { error: "user already exist" },
          { status: 409 },
        );
      }
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await Invite.create({
      inviterId: inviter._id,
      invitedEmail: invitedEmailLower,
      permission,
      token,
      expiresAt,
    });

    const { data, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(invitedEmailLower, {
        data: { invite_token: token, inviter_email: inviter.email, permission },
        redirectTo: `${process.env.NEXTAUTH_URL}/accept-invite?token=${token}&email=${invitedEmail}`,
      });

    if (inviteError) {
      console.error("[POST /api/invite] Supabase error:", inviteError);
      await Invite.deleteOne({ _id: invite._id }); // Rollback MongoDB
      if (inviteError.code === "not_admin") {
        return NextResponse.json(
          {
            error:
              "Supabase service role lacks admin privileges. Verify SUPABASE_SERVICE_ROLE_KEY in Supabase Dashboard.",
          },
          { status: 403 },
        );
      }
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    // Store Supabase user ID
    invite.supabaseId = data.user?.id;
    await invite.save();

    return NextResponse.json(
      { message: "Invitation sent successfully!", invite },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/invite] Error:", error);
    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 },
    );
  }
}

