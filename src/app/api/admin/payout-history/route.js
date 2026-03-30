    import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Payout from "@/models/Payout";
import User from "@/models/User";
import createClient from "@/lib/supabase/server";
import { formatBalanceForDisplay } from "@/lib/payoutConfig";

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
 * GET /api/admin/payout-history
 * Get all payout/transfer history
 */
export async function GET(request) {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: `Unauthorized - ${authResult.error}` },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    // Fetch payouts with ambassador info
    const payouts = await Payout.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "ambassadorId",
          foreignField: "_id",
          as: "ambassador",
          pipeline: [
            {
              $project: {
                email: 1,
                subRole: 1,
                "athlete.name": 1,
                "exAthlete.name": 1,
                "paraAthlete.name": 1,
                "coach.name": 1,
                "team.name": 1,
                "influencer.name": 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$ambassador",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    const total = await Payout.countDocuments();

    // Format the payouts
    const formattedPayouts = payouts.map((p) => {
      const subRole = p.ambassador?.subRole || "";
      const ambassadorName =
        p.ambassador?.[subRole]?.name || p.ambassador?.email || "Unknown";

      return {
        _id: p._id,
        ambassadorId: p.ambassadorId,
        ambassadorName,
        ambassadorEmail: p.ambassador?.email || "Unknown",
        subRole,
        amount: p.amount || p.grossAmount || 0,
        amountFormatted: formatBalanceForDisplay(p.amount || p.grossAmount || 0),
        commissionAmount: p.commissionAmount || 0,
        vatAmount: p.vatAmount || 0,
        grossAmount: p.grossAmount || 0,
        status: p.status || "unknown",
        stripeTransferId: p.stripeTransferId || p.stripePayoutId || null,
        stripePayoutId: p.stripePayoutId || null,
        payoutBatchId: p.payoutBatchId || null,
        payoutType: p.payoutType || "per_invoice",
        period: p.period || null,
        createdAt: p.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      payouts: formattedPayouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching payout history:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch payout history" },
      { status: 500 }
    );
  }
}
