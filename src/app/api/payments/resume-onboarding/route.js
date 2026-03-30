import { connectDB } from "@/lib/db";
import { toCamelCase } from "@/lib/helper";
import stripe from "@/lib/stripe";
import User from "@/models/User";
import { NextResponse } from "next/server";

/**
 * POST handler to resume Stripe Connect onboarding for a sports ambassador
 * 
 * Creates a new account link for users who didn't complete onboarding
 * or need to update their account information
 *
 * @param {Request} request - Incoming request with JSON body: { userId }
 * @returns {Promise<NextResponse>} JSON with onboarding URL or error
 */
export async function POST(request) {
  await connectDB();
  const { userId } = await request.json();

  try {
    // Validate request body
    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Ensure role is 'sports-ambassador'
    if (user.role !== "sports-ambassador") {
      return NextResponse.json(
        { error: "Only sports ambassadors can resume onboarding" },
        { status: 403 }
      );
    }

    // Validate subRole
    const validSubRoles = [
      "athlete",
      "exAthlete", 
      "paraAthlete",
      "coach",
      "team",
      "influencer",
    ];
    const subRole = toCamelCase(user.subRole);
    if (!validSubRoles.includes(subRole)) {
      return NextResponse.json(
        { error: `Invalid subRole: ${subRole}` },
        { status: 400 }
      );
    }

    // Check if user has a Stripe account
    const stripeAccountId = user[subRole]?.stripeAccountId;
    if (!stripeAccountId) {
      return NextResponse.json(
        { error: "No Stripe account found. Please create a new account." },
        { status: 404 }
      );
    }

    // Verify the account still exists in Stripe
    let account;
    try {
      account = await stripe.accounts.retrieve(stripeAccountId);
    } catch (stripeError) {
      if (stripeError.code === "resource_missing") {
        // Account was deleted, clear it from user record
        const updatePath = `${subRole}.stripeAccountId`;
        const statusPath = `${subRole}.onboardingStatus`;
        await User.updateOne(
          { _id: userId },
          { 
            $unset: { [updatePath]: "" },
            [statusPath]: "pending"
          }
        );
        
        return NextResponse.json(
          { error: "Stripe account no longer exists. Please create a new account." },
          { status: 404 }
        );
      }
      throw stripeError;
    }

    // Create account link for onboarding/re-onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXTAUTH_URL}/sports-ambassador/settings/payments`,
      return_url: `${process.env.NEXTAUTH_URL}/sports-ambassador/settings/payments`,
      type: "account_onboarding",
    });

    // Get current account status
    const verificationStatus = 
      account.charges_enabled && account.payouts_enabled && !account.requirements.currently_due.length
        ? "verified"
        : account.requirements.currently_due.length
        ? "action_required" 
        : "pending";

    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink.url,
      stripeAccountId,
      verificationStatus,
      requirements: account.requirements.currently_due,
      businessType: user[subRole]?.businessType || "individual",
    });

  } catch (error) {
    console.error("Resume onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to resume onboarding: " + error.message },
      { status: 500 }
    );
  }
}
