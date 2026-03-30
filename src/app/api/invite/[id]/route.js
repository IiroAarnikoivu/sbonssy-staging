import { connectDB } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import createClient from "@/lib/supabase/server";
import Invite from "@/models/Invite";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function DELETE(request, { params }) {
  try {
    const { id: inviteId } = await params;
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

    // Removed team member permission gating; all users can modify

    const invite = await Invite.findOne({
      _id: inviteId,
      inviterId: inviter._id,
    });
    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    // 1. Find user in MongoDB
    const invitedEmailLower = invite.invitedEmail.toLowerCase();
    const existingUser = await User.findOne({ email: invitedEmailLower });
    const supabaseAdmin = createAdminClient();

    if (existingUser) {
      // 2. Delete from Supabase if they have an ID
      if (existingUser.supabaseId) {
        const { error: deleteSupabaseError } =
          await supabaseAdmin.auth.admin.deleteUser(existingUser.supabaseId);
        if (deleteSupabaseError) {
          console.error(
            "[DELETE /api/invite/[id]] Error deleting Supabase user:",
            deleteSupabaseError,
          );
        }
      }
      // 3. Delete from MongoDB User collection
      await User.deleteOne({ _id: existingUser._id });
    } else if (invite.supabaseId) {
      // 4. Delete from Supabase if pending and has ID
      const { error: deleteSupabaseError } =
        await supabaseAdmin.auth.admin.deleteUser(invite.supabaseId);
      if (deleteSupabaseError) {
        console.error(
          "[DELETE /api/invite/[id]] Error deleting pending Supabase user:",
          deleteSupabaseError,
        );
      }
    }

    // 5. Delete the Invite record from MongoDB
    await Invite.deleteOne({ _id: invite._id });

    return NextResponse.json(
      { message: "Invitation revoked and user records cleaned up successfully!" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[DELETE /api/invite] Error:", error);
    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 },
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id: inviteId } = await params;

    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Permission level is no longer configurable; always set to Can Modify
    const permission = "Can Modify";

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

    // Removed team member permission gating; all users can modify

    const invite = await Invite.findOne({
      _id: inviteId,
      inviterId: inviter._id,
    });
    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }
    invite.permission = permission;
    await invite.save();

    return NextResponse.json(
      { message: "Permission updated successfully!", invite },
      { status: 200 },
    );
  } catch (error) {
    console.error("[PATCH /api/invite] Error:", error);
    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 },
    );
  }
}
