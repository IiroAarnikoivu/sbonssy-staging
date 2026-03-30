import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import createClient from "@/lib/supabase/server";

// Import the payout function (using dynamic import for CommonJS compatibility)
async function getPayoutModule() {
  const payoutModule = await import("@/lib/cron/payout-monthly.js");
  return payoutModule;
}

/**
 * Verify admin access - checks either session-based auth or secret
 */
async function verifyAdminAccess(request) {
  // Check for admin secret first (for cron/API calls)
  const adminSecret = request.headers.get("x-admin-secret");
  if (adminSecret && adminSecret === process.env.ADMIN_PAYOUT_SECRET) {
    return { authorized: true, method: "secret" };
  }

  // Check for session-based auth (for admin UI)
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { authorized: false, error: "Not authenticated" };
    }

    // Check if user is super admin
    if (user?.user_metadata?.is_super_admin) {
      return { authorized: true, method: "session", userId: user.id };
    }

    // Check MongoDB user role
    await connectDB();
    const dbUser = await User.findOne({ supabaseId: user.id });
    if (dbUser?.role === "admin") {
      return { authorized: true, method: "session", userId: user.id };
    }

    return { authorized: false, error: "Not an admin" };
  } catch (error) {
    return { authorized: false, error: error.message };
  }
}

/**
 * POST /api/admin/trigger-payouts
 * Manually trigger the monthly payout run
 * Admin only endpoint - requires admin authentication
 */
export async function POST(request) {
  try {
    const authResult = await verifyAdminAccess(request);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: `Unauthorized - ${authResult.error || "Admin access required"}` },
        { status: 401 }
      );
    }

    await connectDB();

    console.log(`🔧 Admin triggered manual payout run (auth: ${authResult.method})`);

    // Import and run the payout function
    const { triggerManualPayoutRun } = await getPayoutModule();
    const result = await triggerManualPayoutRun();

    return NextResponse.json({
      success: true,
      message: "Payout run completed",
      result: {
        batchId: result.batchId,
        period: result.period,
        successfulPayouts: result.successfulPayouts,
        failedPayouts: result.failedPayouts,
        skippedBelowThreshold: result.skippedBelowThreshold,
        totalPaidOut: `€${(result.totalPaidOutCents / 100).toFixed(2)}`,
        duration: `${result.durationSeconds}s`,
      },
    });
  } catch (error) {
    console.error("Error in admin trigger payouts:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger payouts" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/trigger-payouts
 * Get stats about pending payouts
 */
export async function GET(request) {
  try {
    const authResult = await verifyAdminAccess(request);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: `Unauthorized - ${authResult.error || "Admin access required"}` },
        { status: 401 }
      );
    }

    await connectDB();

    // Get import for threshold
    const { PAYOUT_CONFIG, formatBalanceForDisplay } = await import(
      "@/lib/payoutConfig"
    );

    // Ambassador role types
    const ambassadorRoles = [
      "athlete",
      "exAthlete",
      "paraAthlete",
      "coach",
      "team",
      "influencer",
    ];

    const stats = {
      totalAmbassadorsWithBalance: 0,
      eligibleForPayout: 0,
      belowThreshold: 0,
      totalBalanceCents: 0,
      eligibleBalanceCents: 0,
      byRole: {},
    };

    for (const roleType of ambassadorRoles) {
      const balancePath = `${roleType}.payoutBalanceCents`;

      // Find all with balance > 0
      const withBalance = await User.find({
        [balancePath]: { $gt: 0 },
      }).select(`_id email ${balancePath}`);

      const eligible = withBalance.filter(
        (u) =>
          (u[roleType]?.payoutBalanceCents || 0) >=
          PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS
      );

      const totalBalance = withBalance.reduce(
        (sum, u) => sum + (u[roleType]?.payoutBalanceCents || 0),
        0
      );

      const eligibleBalance = eligible.reduce(
        (sum, u) => sum + (u[roleType]?.payoutBalanceCents || 0),
        0
      );

      stats.byRole[roleType] = {
        withBalance: withBalance.length,
        eligible: eligible.length,
        totalBalanceCents: totalBalance,
        eligibleBalanceCents: eligibleBalance,
      };

      stats.totalAmbassadorsWithBalance += withBalance.length;
      stats.eligibleForPayout += eligible.length;
      stats.belowThreshold += withBalance.length - eligible.length;
      stats.totalBalanceCents += totalBalance;
      stats.eligibleBalanceCents += eligibleBalance;
    }

    return NextResponse.json({
      success: true,
      threshold: {
        cents: PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS,
        formatted: formatBalanceForDisplay(
          PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS
        ),
      },
      payoutDay: PAYOUT_CONFIG.PAYOUT_DAY,
      stats: {
        ...stats,
        totalBalanceFormatted: formatBalanceForDisplay(stats.totalBalanceCents),
        eligibleBalanceFormatted: formatBalanceForDisplay(
          stats.eligibleBalanceCents
        ),
      },
    });
  } catch (error) {
    console.error("Error getting payout stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get payout stats" },
      { status: 500 }
    );
  }
}
