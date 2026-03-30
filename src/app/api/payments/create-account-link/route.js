import { connectDB } from "@/lib/db";
import { toCamelCase } from "@/lib/helper";
import stripe from "@/lib/stripe";
import User from "@/models/User";
import { NextResponse } from "next/server";

/**
 * POST handler to create a Stripe account onboarding link for a sports ambassador.
 *
 * This endpoint:
 * - Connects to the database
 * - Validates the incoming request body (`userId` and `stripeAccountId`)
 * - Ensures the user exists and has the 'sports-ambassador' role with a valid subRole
 * - Confirms the Stripe account ID matches the one saved under the user's subRole
 * - Retrieves the Stripe account and associated bank account info
 * - Generates a Stripe account onboarding link for editing or completing verification
 *
 * @param {Request} request - The incoming request object containing JSON body with `userId` and `stripeAccountId`
 * @returns {Promise<NextResponse>} JSON response with onboarding link, verification status, requirements, and bank info
 *
 * @example
 * // Request body:
 * {
 *   "userId": "60d0fe4f5311236168a109ca",
 *   "stripeAccountId": "acct_1ExampleABC123"
 * }
 *
 * // Response:
 * {
 *   "data": {
 *     "success": true,
 *     "url": "https://connect.stripe.com/...",
 *     "verificationStatus": "verified", // or "action_required", "pending"
 *     "requirements": [],
 *     "accountDetails": {
 *       "bankName": "Wells Fargo",
 *       "last4": "4321",
 *       "accountHolderName": "Jane Doe"
 *     }
 *   }
 * }
 */
export async function POST(request) {
  await connectDB();
  const { userId, stripeAccountId } = await request.json();

  try {
    // Validate request body
    if (!userId || !stripeAccountId) {
      return NextResponse.json(
        { error: "Missing userId or stripeAccountId" },
        { status: 400 }
      );
    }

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Restrict to 'sports-ambassador' role
    if (user.role !== "sports-ambassador") {
      return NextResponse.json(
        { error: "Only sports ambassadors can edit a Stripe account" },
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

    // Verify stripeAccountId matches the user's subRole
    if (user[subRole]?.stripeAccountId !== stripeAccountId) {
      return NextResponse.json(
        { error: "Invalid Stripe account ID for this user" },
        { status: 403 }
      );
    }

    // Retrieve account and external accounts
    const account = await stripe.accounts.retrieve(stripeAccountId);
    const externalAccounts = await stripe.accounts.listExternalAccounts(
      stripeAccountId,
      { limit: 1 }
    );
    const bankAccount = externalAccounts.data[0] || null;

    const accountDetails = bankAccount
      ? {
          bankName: bankAccount.bank_name || "Unknown",
          last4: bankAccount.last4 || "N/A",
          accountHolderName: bankAccount.account_holder_name || "N/A",
        }
      : null;

    // Create a Stripe Account Link for editing
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXTAUTH_URL}/sports-ambassador/settings/payments`,
      return_url: `${process.env.NEXTAUTH_URL}/sports-ambassador/settings/payments`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      data: {
        success: true,
        url: accountLink.url,
        verificationStatus:
          account.charges_enabled && !account.requirements.currently_due.length
            ? "verified"
            : account.requirements.currently_due.length
            ? "action_required"
            : "pending",
        requirements: account.requirements.currently_due,
        accountDetails,
      },
    });
  } catch (error) {
    console.error("Create Account Link error:", error);
    return NextResponse.json(
      { error: "Failed to create account link: " + error.message },
      { status: 500 }
    );
  }
}
