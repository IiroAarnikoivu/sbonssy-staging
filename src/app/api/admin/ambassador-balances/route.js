import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import createClient from "@/lib/supabase/server";
import { PAYOUT_CONFIG, formatBalanceForDisplay } from "@/lib/payoutConfig";

/**
 * Verify admin access - checks session-based auth
 */
async function verifyAdminAccess() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { authorized: false, error: "Not authenticated" };
    }

    if (user?.user_metadata?.is_super_admin) {
      return { authorized: true, userId: user.id };
    }

    await connectDB();
    const dbUser = await User.findOne({ supabaseId: user.id });
    if (dbUser?.role === "admin") {
      return { authorized: true, userId: user.id };
    }

    return { authorized: false, error: "Not an admin" };
  } catch (error) {
    return { authorized: false, error: error.message };
  }
}

/**
 * GET /api/admin/ambassador-balances
 * Get all ambassadors with their payout balances
 */
export async function GET(request) {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: `Unauthorized - ${authResult.error}` },
        { status: 401 },
      );
    }

    await connectDB();

    const ambassadorRoles = [
      "athlete",
      "exAthlete",
      "paraAthlete",
      "coach",
      "team",
      "influencer",
    ];

    const ambassadors = [];

    for (const roleType of ambassadorRoles) {
      const balancePath = `${roleType}.payoutBalanceCents`;
      const stripeAccountPath = `${roleType}.stripeAccountId`;
      const namePath = `${roleType}.name`;

      // Find all with balance > 0
      const usersWithBalance = await User.find({
        [balancePath]: { $gt: 0 },
      }).select(`_id email subRole ${roleType}`);

      for (const user of usersWithBalance) {
        const profile = user[roleType];
        if (!profile) continue;

        const balanceCents = profile.payoutBalanceCents || 0;
        const isEligible =
          balanceCents >= PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS;
        const hasStripeAccount = !!profile.stripeAccountId;

        ambassadors.push({
          _id: user._id,
          email: user.email,
          name: profile.name || user.email,
          roleType: roleType,
          subRole: user.subRole,
          balanceCents: balanceCents,
          balanceFormatted: formatBalanceForDisplay(balanceCents),
          isEligible: isEligible,
          hasStripeAccount: hasStripeAccount,
          stripeAccountId: profile.stripeAccountId || null,
          thresholdCents: PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS,
          thresholdFormatted: formatBalanceForDisplay(
            PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS,
          ),
          remainingToThreshold: isEligible
            ? 0
            : PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS - balanceCents,
          remainingToThresholdFormatted: isEligible
            ? "€0.00"
            : formatBalanceForDisplay(
                PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS - balanceCents,
              ),
        });
      }
    }

    // Sort by balance descending
    ambassadors.sort((a, b) => b.balanceCents - a.balanceCents);

    return NextResponse.json({
      success: true,
      ambassadors,
      total: ambassadors.length,
      eligibleCount: ambassadors.filter((a) => a.isEligible).length,
      threshold: {
        cents: PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS,
        formatted: formatBalanceForDisplay(
          PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS,
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching ambassador balances:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch ambassador balances" },
      { status: 500 },
    );
  }
}
