import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import AmbassadorBalanceCredit from "@/models/AmbassadorBalanceCredit";
import { toCamelCase } from "@/lib/helper";
import {
  PAYOUT_CONFIG,
  isEligibleForPayout,
  formatBalanceForDisplay,
  getThresholdInEuros,
} from "@/lib/payoutConfig";

/**
 * GET /api/payments/ambassador-balance
 * Get current payout balance for an ambassador
 *
 * Query params:
 * - ambassadorId: (optional) MongoDB user ID, defaults to current user
 */
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const ambassadorId = searchParams.get("ambassadorId");

    if (!ambassadorId) {
      return NextResponse.json(
        { error: "ambassadorId is required" },
        { status: 400 }
      );
    }

    const ambassador = await User.findById(ambassadorId);

    if (!ambassador) {
      return NextResponse.json(
        { error: "Ambassador not found" },
        { status: 404 }
      );
    }

    // Determine ambassador role type
    const subRole = toCamelCase(ambassador?.subRole) || "";
    const profile = ambassador?.[subRole];

    if (!profile) {
      return NextResponse.json(
        { error: "Ambassador profile not found" },
        { status: 404 }
      );
    }

    const balanceCents = profile.payoutBalanceCents || 0;
    const thresholdCents = PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS;
    const eligible = isEligibleForPayout(balanceCents);

    // Get recent credits (last 10)
    const recentCredits = await AmbassadorBalanceCredit.find({
      ambassadorId: ambassadorId,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Calculate remaining until threshold
    const remainingUntilThreshold = eligible
      ? 0
      : thresholdCents - balanceCents;

    return NextResponse.json({
      success: true,
      balance: {
        cents: balanceCents,
        formatted: formatBalanceForDisplay(balanceCents),
        currency: PAYOUT_CONFIG.CURRENCY.toUpperCase(),
      },
      threshold: {
        cents: thresholdCents,
        formatted: formatBalanceForDisplay(thresholdCents),
        euros: getThresholdInEuros(),
      },
      eligibleForPayout: eligible,
      remainingUntilThreshold: {
        cents: remainingUntilThreshold,
        formatted: formatBalanceForDisplay(remainingUntilThreshold),
      },
      payoutSchedule: PAYOUT_CONFIG.SCHEDULE_DESCRIPTION,
      payoutDay: PAYOUT_CONFIG.PAYOUT_DAY,
      recentCredits: recentCredits.map((credit) => ({
        id: credit._id,
        date: credit.createdAt,
        amountCents: credit.grossAmountCents,
        amountFormatted: formatBalanceForDisplay(credit.grossAmountCents),
        campaignId: credit.campaignId,
        period: credit.period,
        description: credit.description,
      })),
      hasStripeAccount: !!profile.stripeAccountId,
      stripeOnboardingStatus: profile.onboardingStatus,
    });
  } catch (error) {
    console.error("Error fetching ambassador balance:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch balance" },
      { status: 500 }
    );
  }
}
