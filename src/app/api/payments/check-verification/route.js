import { connectDB } from "@/lib/db";
import { toCamelCase } from "@/lib/helper";
import stripe from "@/lib/stripe";
import User from "@/models/User";
import { NextResponse } from "next/server";

/**
 * POST handler to check the Stripe account verification status for a sports ambassador.
 *
 * This endpoint:
 * - Connects to the database
 * - Validates the incoming request body (`userId` and `stripeAccountId`)
 * - Verifies the user exists and has the correct role/subRole
 * - Confirms the Stripe account ID matches the user’s stored ID
 * - Retrieves the Stripe account and associated bank account details
 * - Determines verification status based on Stripe account requirements
 *
 * @param {Request} request - The incoming request object containing JSON body with `userId` and `stripeAccountId`
 * @returns {Promise<NextResponse>} A JSON response with Stripe account verification status and details, or an error message
 *
 * @example
 * // Request body:
 * {
 *   "userId": "60d0fe4f5311236168a109ca",
 *   "stripeAccountId": "acct_1ExampleABC123"
 * }
 *
 * // Possible response:
 * {
 *   "data": {
 *     "success": true,
 *     "verificationStatus": "verified", // or "action_required", "pending"
 *     "requirements": [],
 *     "accountDetails": {
 *       "bankName": "Bank of America",
 *       "last4": "1234",
 *       "accountHolderName": "John Doe"
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
        {
          error:
            "Only sports ambassadors can check Stripe account verification",
        },
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

    const currentlyDue = account?.requirements?.currently_due || [];
    const disabledReason = account?.requirements?.disabled_reason || null;
    const enabledForPayoutsOrCharges = !!(account?.payouts_enabled || account?.charges_enabled);

    return NextResponse.json({
      data: {
        success: true,
        verificationStatus:
          enabledForPayoutsOrCharges && !disabledReason
            ? "verified"
            : currentlyDue.length > 0 || !!disabledReason
            ? "action_required"
            : "pending",
        requirements: currentlyDue,
        accountDetails,
        flags: {
          payouts_enabled: !!account?.payouts_enabled,
          charges_enabled: !!account?.charges_enabled,
          disabled_reason: disabledReason,
          details_submitted: !!account?.details_submitted,
        },
      },
    });
  } catch (error) {
    console.error("Check Verification error:", error);
    return NextResponse.json(
      { error: "Failed to check verification status: " + error.message },
      { status: 500 }
    );
  }
}
