// /pages/api/invite/accept.js
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import User from "@/models/User";
import Invite from "@/models/Invite";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { email, password, inviteToken } = await request.json();

    if (!email || !password || !inviteToken) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectDB();

    const inviteee = await Invite.findOne({
      token: inviteToken,
    });

    // Check if invite exists
    if (!inviteee) {
      console.error(
        "[POST /api/invite/accept] Invite not found for token:",
        inviteToken
      );
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 }
      );
    }

    // Ensure the provided email matches the invited email
    if (inviteee.invitedEmail?.toLowerCase() !== email?.toLowerCase()) {
      return NextResponse.json(
        { error: "Email does not match the invitation" },
        { status: 400 }
      );
    }

    // Check for existing Supabase user and ensure we have a valid UUID
    const supabaseAdmin = createAdminClient();
    const isUuid = (v) =>
      typeof v === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        v
      );

    let targetSupabaseId = inviteee?.supabaseId;

    // If missing or invalid, re-invite to obtain a valid Supabase user and ID
    if (!isUuid(targetSupabaseId)) {
      const redirectBase =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXTAUTH_URL ||
        "http://localhost:3000";
      const redirectTo = `${redirectBase.replace(
        /\/$/,
        ""
      )}/accept-invite?token=${inviteee.token}&email=${encodeURIComponent(
        inviteee.invitedEmail
      )}`;

      const { data: reinviteData, error: reinviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(
          inviteee.invitedEmail,
          {
            data: {
              invite_token: inviteee.token,
              inviter_email: undefined,
              permission: inviteee.permission,
            },
            redirectTo,
          }
        );

      if (reinviteError) {
        console.error(
          "[POST /api/invite/accept] Re-invite error:",
          reinviteError
        );
        return NextResponse.json(
          {
            error: `Failed to reconcile invite user: ${reinviteError.message}`,
          },
          { status: 500 }
        );
      }

      targetSupabaseId = reinviteData?.user?.id;
      if (!isUuid(targetSupabaseId)) {
        return NextResponse.json(
          { error: "Supabase user ID not available for invitee" },
          { status: 500 }
        );
      }

      // Persist the Supabase user id to our Invite document
      inviteee.supabaseId = targetSupabaseId;
      await inviteee.save();
    }

    // Now update the invited user's password; if user doesn't exist, create it
    let finalSupabaseId = targetSupabaseId;
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      targetSupabaseId,
      { password }
    );
    if (updateErr) {
      console.warn(
        "[POST /api/invite/accept] Update password failed, attempting createUser fallback:",
        updateErr
      );
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: inviteee.invitedEmail,
          password,
          email_confirm: true,
          user_metadata: {
            invite_token: inviteee.token,
            permission: inviteee.permission,
          },
        });
      if (createErr) {
        console.error(
          "[POST /api/invite/accept] createUser fallback failed:",
          createErr
        );
        return NextResponse.json(
          { error: `Failed to set password: ${updateErr.message}` },
          { status: 400 }
        );
      }
      if (!isUuid(created?.user?.id)) {
        return NextResponse.json(
          { error: "Failed to create Supabase user for invitee" },
          { status: 500 }
        );
      }
      finalSupabaseId = created.user.id;
      inviteee.supabaseId = finalSupabaseId;
      await inviteee.save();
    }

    // Get inviter details
    const inviter = await User.findById(inviteee.inviterId);
    if (!inviter) {
      return NextResponse.json({ error: "Inviter not found" }, { status: 404 });
    }

    // Create user in MongoDB
    try {
      // If a user already exists with this email, update linkage and accept invite instead of creating duplicate
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        if (!existingUser.supabaseId) existingUser.supabaseId = finalSupabaseId;
        if (!existingUser.invitedBy) existingUser.invitedBy = inviter._id;
        if (!existingUser.permission)
          existingUser.permission = inviteee.permission;
        if (existingUser.role !== inviter.role)
          existingUser.role = inviter.role;
        await existingUser.save();

        inviteee.status = "accepted";
        await inviteee.save();

        return NextResponse.json(
          {
            message: "Invitation accepted. Existing account was linked.",
          },
          { status: 200 }
        );
      }

      const emailLower = email.toLowerCase();
      const upsertDoc = {
        permission: inviteee.permission,
        authProvider: "invite",
        // We intentionally do NOT copy inviter's nested role documents (brand/athlete/team/etc.)
        // to avoid violating unique indexes like tracking_key. The invited member will later
        // complete their own profile as needed.
        isProfileCompleted: true,
        stateId: 1,
        ...(inviter.role === "sports-ambassador" && inviter.subRole
          ? { subRole: inviter.subRole }
          : {}),
      };

      const mongoUser = await User.findOneAndUpdate(
        { email: emailLower },
        {
          $setOnInsert: { email: emailLower, ...upsertDoc },
          $set: {
            // Ensure linkage fields are current in case user existed
            supabaseId: finalSupabaseId,
            role: inviter.role,
            invitedBy: inviter._id,
          },
        },
        { upsert: true, new: true }
      );

      // Update invite status
      inviteee.status = "accepted";
      await inviteee.save();

      return NextResponse.json(
        {
          message:
            "Registration successful! Please check your email to verify your account.",
          // user: {
          //   id: mongoUser._id,
          //   email: mongoUser.email,
          //   role: mongoUser.role,
          //   permission: mongoUser.permission,
          //   isProfileCompleted: mongoUser.isProfileCompleted,
          //   invitedBy: inviter._id,
          // },
        },
        { status: 201 }
      );
    } catch (mongoError) {
      console.error("[POST /api/invite/accept] MongoDB error:", mongoError);
      // Clean up Supabase user
      if (isUuid(finalSupabaseId)) {
        await supabaseAdmin.auth.admin.deleteUser(finalSupabaseId);
      }
      return NextResponse.json(
        {
          error: "Failed to create user in MongoDB",
          details: mongoError?.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[POST /api/invite/accept] Error:", error);
    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 }
    );
  }
}
