import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Payout from "@/models/Payout";
import createClient from "@/lib/supabase/server";
import stripe from "@/lib/stripe";
import { toCamelCase } from "@/lib/helper";
import {
  PAYOUT_CONFIG,
  generatePayoutBatchId,
  formatBalanceForDisplay,
} from "@/lib/payoutConfig";
import { generatePayoutPeriod } from "@/lib/vat/vatCalculator";

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
 * POST /api/admin/transfer-to-ambassador
 * Transfer accumulated balance to a single ambassador
 * Only works if balance >= €50 threshold
 */
export async function POST(request) {
  try {
    const authResult = await verifyAdminAccess();
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: `Unauthorized - ${authResult.error}` },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { ambassadorId } = body;

    if (!ambassadorId) {
      return NextResponse.json(
        { error: "ambassadorId is required" },
        { status: 400 }
      );
    }

    // Find the ambassador
    const ambassador = await User.findById(ambassadorId);
    if (!ambassador) {
      return NextResponse.json(
        { error: "Ambassador not found" },
        { status: 404 }
      );
    }

    // Get role type and profile
    const roleType = toCamelCase(ambassador.subRole);
    const profile = ambassador[roleType];

    if (!profile) {
      return NextResponse.json(
        { error: `No profile found for role ${roleType}` },
        { status: 400 }
      );
    }

    const balanceCents = profile.payoutBalanceCents || 0;
    const stripeAccountId = profile.stripeAccountId;

    // Validate balance meets threshold
    if (balanceCents < PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS) {
      return NextResponse.json(
        {
          error: `Balance (${formatBalanceForDisplay(
            balanceCents
          )}) is below minimum threshold (${formatBalanceForDisplay(
            PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS
          )})`,
          balanceCents,
          thresholdCents: PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS,
        },
        { status: 400 }
      );
    }

    // Validate Stripe account
    if (!stripeAccountId) {
      return NextResponse.json(
        { error: "Ambassador has no Stripe connected account" },
        { status: 400 }
      );
    }

    // Verify Stripe account
    let stripeAccount;
    try {
      stripeAccount = await stripe.accounts.retrieve(stripeAccountId);
      if (!stripeAccount || stripeAccount.deleted) {
        return NextResponse.json(
          { error: "Stripe account not found or deleted" },
          { status: 400 }
        );
      }
      if (!stripeAccount.payouts_enabled) {
        return NextResponse.json(
          {
            error:
              "Stripe account cannot receive payouts (payouts_enabled=false)",
          },
          { status: 400 }
        );
      }
    } catch (stripeError) {
      return NextResponse.json(
        { error: `Stripe account verification failed: ${stripeError.message}` },
        { status: 400 }
      );
    }

    // Generate IDs - include timestamp to allow multiple manual transfers per day
    const timestamp = Date.now();
    const batchId = `manual_${generatePayoutBatchId()}_${ambassadorId}_${timestamp}`;
    const period = generatePayoutPeriod();

    // Check for existing payout (idempotency)
    const existingPayout = await Payout.findOne({
      ambassadorId: ambassador._id,
      payoutBatchId: batchId,
    });

    if (existingPayout) {
      return NextResponse.json(
        { error: "Payout already exists for this batch" },
        { status: 400 }
      );
    }

    // Calculate fixed per-payout fee and net payout
    const transferFeeCents = PAYOUT_CONFIG.TRANSFER_FEE_CENTS || 0;
    const netAmountCents = Math.max(0, balanceCents - transferFeeCents);
    if (netAmountCents <= 0) {
      return NextResponse.json(
        { error: "Net amount is not positive after fee deduction" },
        { status: 400 }
      );
    }

    // Step 1: Create Stripe Transfer
    let transfer;
    try {
      transfer = await stripe.transfers.create({
        amount: netAmountCents,
        currency: PAYOUT_CONFIG.CURRENCY,
        destination: stripeAccountId,
        description: `Manual payout - ${period}`,
        metadata: {
          ambassadorId: String(ambassador._id),
          batchId: batchId,
          period: period,
          payoutType: "batched",
          balanceBeforeCents: String(balanceCents),
          transferFeeCents: String(transferFeeCents),
          netAmountCents: String(netAmountCents),
        },
      });
      console.log(
        `📤 Manual transfer created for ${ambassador.email}: ${transfer.id}`
      );
    } catch (transferError) {
      return NextResponse.json(
        { error: `Stripe transfer failed: ${transferError.message}` },
        { status: 500 }
      );
    }

    // Step 2: Create Stripe Payout
    let payout;
    try {
      payout = await stripe.payouts.create(
        {
          amount: netAmountCents,
          currency: PAYOUT_CONFIG.CURRENCY,
          description: `Manual payout - ${period}`,
          metadata: {
            ambassadorId: String(ambassador._id),
            batchId: batchId,
            period: period,
            transferId: transfer.id,
            transferFeeCents: String(transferFeeCents),
            netAmountCents: String(netAmountCents),
          },
        },
        {
          stripeAccount: stripeAccountId,
        }
      );
      console.log(
        `💳 Manual payout created for ${ambassador.email}: ${payout.id}`
      );
    } catch (payoutError) {
      console.warn(
        `⚠️ Payout creation failed for ${ambassador.email}: ${payoutError.message}. Transfer ${transfer.id} succeeded.`
      );
    }

    // Step 3: Reset balance
    const balancePath = `${roleType}.payoutBalanceCents`;
    await User.findByIdAndUpdate(ambassador._id, {
      $inc: { [balancePath]: -balanceCents },
    });

    // Step 4: Create Payout record
    await Payout.create({
      ambassadorId: ambassador._id,
      stripePayoutId: payout?.id || transfer.id,
      stripeTransferId: transfer.id,
      commissionAmount: balanceCents,
      vatAmount: 0,
      grossAmount: balanceCents,
      vatApplied: false,
      vatRate: 0,
      amount: balanceCents,
      transferFeeCents: transferFeeCents,
      netAmountCents: netAmountCents,
      status: payout ? "paid" : "transferred",
      period: period,
      payoutBatchId: batchId,
      payoutType: "batched",
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully transferred ${formatBalanceForDisplay(
        netAmountCents
      )} to ${ambassador.email} (fee: ${formatBalanceForDisplay(
        transferFeeCents
      )})`,
      details: {
        ambassadorId: ambassador._id,
        email: ambassador.email,
        grossAmountCents: balanceCents,
        grossAmountFormatted: formatBalanceForDisplay(balanceCents),
        transferFeeCents,
        transferFeeFormatted: formatBalanceForDisplay(transferFeeCents),
        netAmountCents,
        netAmountFormatted: formatBalanceForDisplay(netAmountCents),
        transferId: transfer.id,
        payoutId: payout?.id || null,
        status: payout ? "paid" : "transferred",
        batchId: batchId,
      },
    });
  } catch (error) {
    console.error("Error in manual transfer:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process transfer" },
      { status: 500 }
    );
  }
}
