import { NextResponse } from "next/server";

/**
 * DEPRECATED: Legacy per-invoice transfer endpoint
 *
 * This endpoint has been disabled in favor of the new €50 minimum threshold payout system:
 * - Ambassador balances accumulate via invoice payments
 * - Payouts run monthly on the 15th (or manually via /api/admin/trigger-payouts)
 * - Only ambassadors with balance >= €50 receive payouts
 *
 * To trigger payouts, use: POST /api/admin/trigger-payouts
 */
export async function POST(request) {
  return NextResponse.json(
    {
      error: "This endpoint is deprecated",
      message:
        "Per-invoice transfers have been replaced by the €50 minimum threshold payout system. Ambassador commissions now accumulate in their balance and are paid out monthly on the 15th when they reach €50. To manually trigger payouts for eligible ambassadors, use POST /api/admin/trigger-payouts with the admin secret.",
      newEndpoint: "/api/admin/trigger-payouts",
      documentation: {
        balanceCheck: "GET /api/payments/ambassador-balance?ambassadorId=<ID>",
        payoutStats: "GET /api/admin/trigger-payouts (with x-admin-secret header)",
        triggerPayouts: "POST /api/admin/trigger-payouts (with x-admin-secret header)",
      },
    },
    { status: 410 } // 410 Gone - resource no longer available
  );
}
