import { connectDB } from "@/lib/db";
import { toCamelCase } from "@/lib/helper";
import stripe from "@/lib/stripe";
import User from "@/models/User";
import { NextResponse } from "next/server";

/**
 * POST handler to create a new Stripe Connect account for a sports ambassador.
 *
 * - Validates user existence, role, and subRole.
 * - If a Stripe account already exists, returns its status and details.
 * - If not, creates a new Stripe Express account with specified business type and onboarding link.
 * - Stores the Stripe account ID and business type inside the user's subRole object.
 *
 * @param {Request} request - Incoming request with JSON body: { userId, email, businessType }
 * @returns {Promise<NextResponse>} JSON with Stripe account onboarding URL or status
 *
 * @example
 * // Request body:
 * {
 *   "userId": "60d0fe4f5311236168a109ca",
 *   "email": "example@email.com",
 *   "businessType": "individual" // or "company"
 * }
 */
export async function POST(request) {
  await connectDB();
  const { userId, email, businessType } = await request.json();

  try {
    // Validate request body
    if (!userId || !email) {
      return NextResponse.json(
        { error: "Missing userId or email" },
        { status: 400 },
      );
    }

    // Validate business type
    const validBusinessTypes = ["individual", "company"];
    const selectedBusinessType = businessType || "individual"; // Default to individual
    if (!validBusinessTypes.includes(selectedBusinessType)) {
      return NextResponse.json(
        { error: "Invalid business type. Must be 'individual' or 'company'" },
        { status: 400 },
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
        { error: "Only sports ambassadors can create a Stripe account" },
        { status: 403 },
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
        { status: 400 },
      );
    }

    // If Stripe account already exists, return its details
    if (user[subRole]?.stripeAccountId) {
      const account = await stripe.accounts.retrieve(
        user[subRole].stripeAccountId,
      );

      const externalAccounts = await stripe.accounts.listExternalAccounts(
        user[subRole].stripeAccountId,
        { limit: 1 },
      );
      const bankAccount = externalAccounts.data[0] || null;

      const accountDetails = bankAccount
        ? {
            bankName: bankAccount.bank_name || "Unknown",
            last4: bankAccount.last4 || "N/A",
            accountHolderName: bankAccount.account_holder_name || "N/A",
          }
        : null;

      // For existing accounts, determine if we need to provide an onboarding URL
      const verificationStatus =
        account.charges_enabled && !account.requirements.currently_due.length
          ? "verified"
          : account.requirements.currently_due.length
            ? "action_required"
            : "pending";

      let onboardingUrl = null;

      // If account needs action or is pending, provide onboarding URL
      if (verificationStatus !== "verified") {
        const accountLink = await stripe.accountLinks.create({
          account: user[subRole].stripeAccountId,
          refresh_url: `${process.env.NEXTAUTH_URL}/sports-ambassador/settings/payments`,
          return_url: `${process.env.NEXTAUTH_URL}/sports-ambassador/settings/payments`,
          type: "account_onboarding",
        });
        onboardingUrl = accountLink.url;
      }

      return NextResponse.json({
        data: {
          success: true,
          stripeAccountId: user[subRole].stripeAccountId,
          businessType: user[subRole].businessType || "individual",
          verificationStatus,
          accountDetails,
          onboardingUrl,
          message: "Stripe account already connected",
        },
      });
    }

    // Initialize subRole object if missing
    if (!user[subRole]) {
      user[subRole] = {};
      await user.save();
    }

    // Create a Stripe Express Connect account with specified business type
    // Pull country from user profile if available, fallback to FI
    const userCountry = user[subRole]?.vatDetails?.registrationCountry || "FI";

    const account = await stripe.accounts.create({
      type: "express",
      email,
      country: userCountry,
      business_type: selectedBusinessType,
      capabilities: {
        transfers: { requested: true },
      },
      metadata: {
        userId,
        businessType: selectedBusinessType,
      },
    });

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXTAUTH_URL}/sports-ambassador/settings/payments`,
      return_url: `${process.env.NEXTAUTH_URL}/sports-ambassador/settings/payments`,
      type: "account_onboarding",
    });

    // Update the user's subRole object with the new stripeAccountId and business type
    const updatePath = `${subRole}.stripeAccountId`;
    const businessTypePath = `${subRole}.businessType`;
    const onboardingStatusPath = `${subRole}.onboardingStatus`;
    const updateResult = await User.updateOne(
      { _id: userId },
      {
        [updatePath]: account.id,
        [businessTypePath]: selectedBusinessType,
        [onboardingStatusPath]: "pending",
      },
    );

    if (updateResult.modifiedCount === 0) {
      console.error(
        `Failed to update stripeAccountId for user ${userId} at path ${updatePath}`,
      );
      return NextResponse.json(
        { error: "Failed to save Stripe account ID" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: {
        success: true,
        stripeAccountId: account.id,
        businessType: selectedBusinessType,
        onboardingUrl: accountLink.url,
        verificationStatus:
          account.charges_enabled && !account.requirements.currently_due.length
            ? "verified"
            : account.requirements.currently_due.length
              ? "action_required"
              : "pending",
        accountDetails: null, // No external account yet
      },
    });
  } catch (error) {
    console.error("Create Connect account error:", error);
    return NextResponse.json(
      { error: "Failed to create Stripe account: " + error.message },
      { status: 500 },
    );
  }
}
