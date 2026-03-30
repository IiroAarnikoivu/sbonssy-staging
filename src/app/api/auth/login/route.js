import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import Invite from "@/models/Invite";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Authenticate user with Supabase
    const supabase = await createClient();
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });
    // Build robust base URL for redirect links used in verification emails
    const originFromReq = request.headers.get("origin");
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXTAUTH_URL ||
      originFromReq ||
      "http://localhost:3000";
    // Send users back to our auth callback so we can route them to onboarding
    const redirectUrl = `${baseUrl.replace(/\/$/, "")}/api/auth/callback`;
    if (authError) {
      // Check if the error is due to unconfirmed email
      if (authError.message === "Email not confirmed") {
        try {
          // Connect to MongoDB to find the user's role
          await connectDB();
          const mongoUser = await User.findOne({ email: email.toLowerCase() }).lean();
          const role = mongoUser?.role || "fan"; // Fallback to fan if not found

          // Resend verification OTP (Supabase signup type)
          const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email: email,
          });

          if (resendError) {
            const isRateLimit = resendError.status === 429 || resendError.code === "over_email_send_rate_limit";
            console.error("Failed to resend verification OTP:", resendError);
            return NextResponse.json(
              {
                message: isRateLimit 
                  ? "Too many requests. Please check your inbox for the existing code or try again in a few minutes."
                  : "Email not confirmed. Please check your inbox.",
                error: "email_not_confirmed",
                code: resendError.code,
                email,
                role,
                emailSent: false,
              },
              { status: 400 }
            );
          }

          return NextResponse.json(
            {
              message: "Email not confirmed. A new OTP has been sent to your email.",
              error: "email_not_confirmed",
              emailSent: true,
              email,
              role,
            },
            { status: 400 }
          );
        } catch (resendError) {
          const isRateLimit = resendError.status === 429 || resendError.code === "over_email_send_rate_limit";
          console.error("Error resending verification OTP:", resendError);
          // Still try to get the role even if resend fails
          await connectDB();
          const mongoUser = await User.findOne({ email: email.toLowerCase() }).lean();
          const role = mongoUser?.role || "fan";

          return NextResponse.json(
            {
              message: isRateLimit
                ? "Too many requests. Please check your inbox for the existing code or try again in a few minutes."
                : "Email not confirmed. Please verify your OTP.",
              error: "email_not_confirmed",
              code: resendError.code,
              email,
              role,
              emailSent: false,
            },
            { status: 400 }
          );
        }
      }

      return NextResponse.json({ message: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 400 }
      );
    }

    // Connect to MongoDB and retrieve the user by supabaseId
    await connectDB();
    const mongoUser = await User.findOne({
      supabaseId: authData.user.id,
    }).lean();

    if (!mongoUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if the user is an invited user
    if (mongoUser.invitedBy) {
      const invite = await Invite.findOne({
        inviterId: mongoUser.invitedBy,
        invitedEmail: mongoUser.email,
        status: "accepted",
      }).lean();
      if (!invite) {
        return NextResponse.json(
          { error: "Invalid invitation status" },
          { status: 400 }
        );
      }

      const inviter = await User.findById(mongoUser.invitedBy).lean();
      if (!inviter) {
        return NextResponse.json(
          { error: "Inviter not found" },
          { status: 404 }
        );
      }

      // Return inviter's data with invited user's email
      const userData = {
        id: mongoUser.supabaseId,
        email: mongoUser.email, // Invited user's email
        role: inviter.role,
        name: inviter.name || "",
        isProfileCompleted: inviter.isProfileCompleted,
        permission: invite.permission,
        inviterId: mongoUser.invitedBy.toString(),
        teamMemberId: mongoUser._id.toString(),
        athlete: inviter.athlete,
        team: inviter.team,
        influencer: inviter.influencer,
        brand: inviter.brand,
        exAthlete: inviter.exAthlete,
        paraAthlete: inviter.paraAthlete,
        coach: inviter.coach,
        fan: inviter.fan,
        admin: inviter.admin,
        stateId: inviter.stateId,
      };

      return NextResponse.json({
        data: { user: userData },
        message: "Logged in!",
      });
    }

    // Non-invited user
    const userData = {
      id: authData.user.id,
      email: authData.user.email,
      role: mongoUser.role,
      name: mongoUser.name || authData.user.user_metadata?.name || "",
      isProfileCompleted: mongoUser.isProfileCompleted,
      athlete: mongoUser.athlete,
      team: mongoUser.team,
      influencer: mongoUser.influencer,
      brand: mongoUser.brand,
      exAthlete: mongoUser.exAthlete,
      paraAthlete: mongoUser.paraAthlete,
      coach: mongoUser.coach,
      fan: mongoUser.fan,
      admin: mongoUser.admin,
      stateId: mongoUser.stateId,
    };

    return NextResponse.json({
      data: { user: userData },
      message: "Logged in!",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 }
    );
  }
}
