import { connectDB } from "@/lib/db";
import Invite from "@/models/Invite";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { email, inviteToken } = await request.json();
    if (!email || !inviteToken) {
      return NextResponse.json(
        { error: "Missing email or invite token" },
        { status: 400 }
      );
    }

    await connectDB();
    const invite = await Invite.findOne({
      token: inviteToken,
      invitedEmail: email,
      status: "pending",
      expiresAt: { $gte: new Date() },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Invite verified successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/invite/verify] Error:", error);
    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 }
    );
  }
}
