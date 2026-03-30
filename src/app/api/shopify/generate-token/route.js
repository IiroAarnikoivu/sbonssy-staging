import { connectDB } from "@/lib/db";
import { createToken } from "@/lib/helper";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import { NextResponse } from "next/server";

/**
 * GET /api/shopify/generate-token
 *
 * Generates a token for a logged-in brand user to access the Shopify app.
 * Retrieves the user from Supabase Auth, finds the corresponding user in MongoDB,
 * and creates a secure token using their MongoDB ID.
 *
 * @param {Request} req - Incoming HTTP request (unused in this handler).
 * @returns {NextResponse} JSON response with token and status.
 */
export async function GET(req) {
  try {
    await connectDB();

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: authError, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const brandUser = await User.findOne({ supabaseId: user.id });
    if (!brandUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // If this brand user is invited, generate token for the inviter so all Shopify actions
    // are associated with the brand owner's account.
    const ownerId = brandUser.invitedBy ? brandUser.invitedBy : brandUser._id;
    const token = await createToken(ownerId);

    // Flatten response for frontend: response.data.hasToken and response.data.data
    return NextResponse.json({ hasToken: true, data: token }, { status: 200 });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json(
      { error: error.message || error, message: "Something went wrong" },
      { status: 500 },
    );
  }
}
