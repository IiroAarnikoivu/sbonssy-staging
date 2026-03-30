/**
 * Monthly Payout CRON Job
 * Processes threshold-based payouts for ambassadors on the 15th of each month
 *
 * Schedule: 15th of each month at 12:00 noon UTC
 *
 * Logic:
 * - Find all ambassadors with payoutBalanceCents >= €50 (5000 cents)
 * - Step 1: Create Stripe Transfer (Platform → Connected Account's Stripe Balance)
 * - Step 2: Create Stripe Payout (Connected Account's Stripe Balance → Bank Account)
 * - Reset balance to 0
 * - Create Payout record with payoutType: "batched"
 */

require("dotenv").config();
const cron = require("node-cron");
const mongoose = require("mongoose");
const moment = require("moment");

const User = mongoose.models.User || require("../../models/User").default;
const Payout = mongoose.models.Payout || require("../../models/Payout").default;
const stripe = require("../stripe").default;
const { connectDB } = require("../db");
const { toCamelCase } = require("../helper");
const { sendEmail } = require("../sendEmail");
const {
  PAYOUT_CONFIG,
  generatePayoutBatchId,
  formatBalanceForDisplay,
} = require("../payoutConfig");
const { generatePayoutPeriod } = require("../vat/vatCalculator");

// CRON job for monthly threshold-based payouts
// Runs on the 15th of each month at 12:00 noon UTC
if (process.env.NODE_ENV === "production") {
  cron.schedule(
    "0 12 15 * *", // At 12:00 noon on the 15th of every month
    async () => {
      // console.log("🗓️ Starting monthly payout run...");
      await processMonthlyPayouts();
    },
    { scheduled: true, timezone: "UTC" },
  );

  // CRON job for monthly payout email notifications
  // Runs on the 15th of each month at 8:00 AM Europe/Helsinki
  cron.schedule(
    "0 8 15 * *", // At 8:00 AM on the 15th of every month
    async () => {
      // console.log("📧 Sending monthly payout notification emails...");
      await sendMonthlyPayoutEmails();
    },
    { scheduled: true, timezone: "UTC" },
  );
}

// ==================== TESTING CRON (non-production) ====================
// Runs every 2 minutes to trigger a payout test run
// cron.schedule(
//   "*/2 * * * *", // Every 2 minutes
//   async () => {
//     try {
//       console.log(
//         `🧪 TEST: Starting payout test run at ${moment()
//           .utc()
//           .format("YYYY-MM-DD HH:mm:ss")} UTC`,
//       );
//       await processMonthlyPayoutsTest();
//     } catch (error) {
//       console.error(
//         "❌ TEST: Critical error in test payout processing:",
//         error.message,
//         error.stack,
//       );
//     }
//   },
//   { scheduled: true, timezone: "UTC" },
// );

// ==================== END TESTING CRON ====================

/**
 * Process monthly payouts for all eligible ambassadors
 * Can be called manually for testing via API endpoint
 */
async function processMonthlyPayouts(testMode = false) {
  const startTime = Date.now();
  const batchId = generatePayoutBatchId(new Date(), testMode);
  const period = generatePayoutPeriod();

  try {
    await connectDB();

    // Ambassador role types that can have payouts
    const ambassadorRoles = [
      "athlete",
      "exAthlete",
      "paraAthlete",
      "coach",
      "team",
      "influencer",
    ];

    let successfulPayouts = 0;
    let failedPayouts = 0;
    let skippedBelowThreshold = 0;
    let totalPaidOut = 0; // Sum of net payouts (after fee)

    // Process each ambassador role type
    for (const roleType of ambassadorRoles) {
      const balancePath = `${roleType}.payoutBalanceCents`;
      const stripeAccountPath = `${roleType}.stripeAccountId`;

      // Find ambassadors with balance >= threshold
      const eligibleAmbassadors = await User.find({
        [balancePath]: { $gte: PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS },
        [stripeAccountPath]: { $exists: true, $ne: "" },
      });

      for (const ambassador of eligibleAmbassadors) {
        try {
          const result = await processAmbassadorPayout(
            ambassador,
            roleType,
            batchId,
            period,
          );

          if (result.success) {
            successfulPayouts++;
            totalPaidOut += result.netAmountCents;
          } else if (result.skipped) {
            skippedBelowThreshold++;
          } else {
            failedPayouts++;
            console.error(`❌ Failed for ${ambassador.email}: ${result.error}`);
          }
        } catch (ambassadorError) {
          failedPayouts++;
          console.error(
            `❌ Error processing ${ambassador.email}:`,
            ambassadorError.message,
          );
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    return {
      batchId,
      period,
      successfulPayouts,
      failedPayouts,
      skippedBelowThreshold,
      totalPaidOutCents: totalPaidOut,
      durationSeconds: parseFloat(duration),
    };
  } catch (error) {
    console.error("💥 Critical error in monthly payout run:", error);
    throw error;
  }
}

/**
 * Process payout for a single ambassador
 * Creates both a Stripe Transfer (platform → connected account)
 * and a Stripe Payout (connected account → bank account)
 */
async function processAmbassadorPayout(ambassador, roleType, batchId, period) {
  const profile = ambassador[roleType];

  if (!profile) {
    return { success: false, error: "No profile found" };
  }

  const balanceCents = profile.payoutBalanceCents || 0;
  const stripeAccountId = profile.stripeAccountId;

  // console.log(`[PAYOUT DEBUG] Checking ${ambassador.email}:`, {
  //   roleType,
  //   balanceCents,
  //   balanceEuros: (balanceCents / 100).toFixed(2),
  //   threshold: PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS,
  //   thresholdEuros: (PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS / 100).toFixed(2),
  //   meetsThreshold: balanceCents >= PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS,
  //   stripeAccountId,
  // });

  // Double-check threshold (safety)
  if (balanceCents < PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS) {
    // console.log(
    //   `[PAYOUT DEBUG] Skipping ${ambassador.email} - below threshold`,
    // );
    return { success: false, skipped: true };
  }

  // Check for existing payout in this batch (idempotency)
  const existingPayout = await Payout.findOne({
    ambassadorId: ambassador._id,
    payoutBatchId: batchId,
  });

  if (existingPayout) {
    // console.log(
    //   `⚠️ Payout already exists for ${ambassador.email} in batch ${batchId}, skipping`,
    // );
    return { success: false, skipped: true };
  }

  // Verify Stripe account exists and is valid
  let stripeAccount;
  try {
    stripeAccount = await stripe.accounts.retrieve(stripeAccountId);
    if (!stripeAccount || stripeAccount.deleted) {
      return {
        success: false,
        error: "Stripe account not found or deleted",
      };
    }

    // Check if account can receive payouts
    if (!stripeAccount.payouts_enabled) {
      return {
        success: false,
        error: "Stripe account cannot receive payouts (payouts_enabled=false)",
      };
    }
  } catch (stripeError) {
    return {
      success: false,
      error: `Stripe account verification failed: ${stripeError.message}`,
    };
  }

  // Calculate fixed per-payout fee and net payout
  const transferFeeCents = PAYOUT_CONFIG.TRANSFER_FEE_CENTS || 0;
  const netAmountCents = Math.max(0, balanceCents - transferFeeCents);

  // Safety: if net is 0 or negative, skip (should not happen with threshold)
  if (netAmountCents <= 0) {
    return { success: false, skipped: true };
  }

  // Step 1: Create Stripe Transfer (Platform → Connected Account's Stripe Balance)
  let transfer;
  try {
    transfer = await stripe.transfers.create({
      amount: netAmountCents,
      currency: PAYOUT_CONFIG.CURRENCY,
      destination: stripeAccountId,
      description: `Monthly payout - ${period}`,
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
    // console.log(`📤 Transfer created for ${ambassador.email}: ${transfer.id}`);
  } catch (transferError) {
    return {
      success: false,
      error: `Stripe transfer failed: ${transferError.message}`,
    };
  }

  // Step 2: Create Stripe Payout (Connected Account's Stripe Balance → Bank Account)
  let payout;
  try {
    payout = await stripe.payouts.create(
      {
        amount: netAmountCents,
        currency: PAYOUT_CONFIG.CURRENCY,
        description: `Monthly payout - ${period}`,
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
        stripeAccount: stripeAccountId, // Create payout on behalf of connected account
      },
    );
    // console.log(
    //   `💳 Payout created for ${ambassador.email}: ${payout.id} (status: ${payout.status})`,
    // );
  } catch (payoutError) {
    // Transfer succeeded but payout failed
    // Log this but don't fail - funds are in connected account, they'll get auto-payout
    console.warn(
      `⚠️ Payout creation failed for ${ambassador.email}: ${payoutError.message}. Transfer ${transfer.id} succeeded - funds are in connected account.`,
    );
    // payout will be undefined, we'll handle this below
  }

  // Reset balance atomically (using the gross balance; fee is deducted and kept by platform)
  const balancePath = `${roleType}.payoutBalanceCents`;
  await User.findByIdAndUpdate(ambassador._id, {
    $inc: { [balancePath]: -balanceCents },
  });

  // Create Payout record with both transfer and payout IDs
  await Payout.create({
    ambassadorId: ambassador._id,
    stripePayoutId: payout?.id || transfer.id, // Use payout ID if available, else transfer ID
    stripeTransferId: transfer.id,
    commissionAmount: balanceCents, // Full balance is commission (VAT already included in credits)
    vatAmount: 0, // VAT was calculated at credit time
    grossAmount: balanceCents,
    vatApplied: false, // Aggregate payout, VAT tracked in individual credits
    vatRate: 0,
    amount: balanceCents, // Legacy field (gross)
    transferFeeCents: transferFeeCents,
    netAmountCents: netAmountCents,
    status: payout ? "paid" : "transferred", // "paid" if payout created, "transferred" if only transfer
    period: period,
    payoutBatchId: batchId,
    payoutType: "batched",
    createdAt: new Date(),
  });

  return {
    success: true,
    amountCents: balanceCents,
    netAmountCents,
    transferId: transfer.id,
    payoutId: payout?.id,
  };
}

/**
 * Send payout notification emails to all eligible ambassadors
 * Runs at 8 AM on the 15th
 */
async function sendMonthlyPayoutEmails() {
  try {
    await connectDB();

    const ambassadorRoles = [
      "athlete",
      "exAthlete",
      "paraAthlete",
      "coach",
      "team",
      "influencer",
    ];

    for (const roleType of ambassadorRoles) {
      const balancePath = `${roleType}.payoutBalanceCents`;
      const stripeAccountPath = `${roleType}.stripeAccountId`;

      // Find ambassadors with balance >= threshold
      const eligibleAmbassadors = await User.find({
        [balancePath]: { $gte: PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS },
        [stripeAccountPath]: { $exists: true, $ne: "" },
      });

      for (const ambassador of eligibleAmbassadors) {
        try {
          const profile = ambassador[roleType];
          const firstName = profile?.firstName || profile?.name?.split(" ")[0] || "there";
          const amountFormatted = formatBalanceForDisplay(profile.payoutBalanceCents);
          const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
          const paymentMethod = "your connected Stripe account";

          await sendEmail({
            to: ambassador.email,
            subject: "Your commission payment is on the way",
            text: `Hi ${firstName}, Good news! Your latest commission payment of ${amountFormatted} is being processed via ${paymentMethod}. You can expect it to arrive in the next few days. View Payment History: ${baseUrl}/sports-ambassador/settings/payments`,
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 0;">
                <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;">
                  
                  <p style="color: #000; margin-bottom: 16px;">Hi ${firstName},</p>
                  <p style="color: #000; margin-bottom: 12px;">Good news! Your latest commission payment of <strong>${amountFormatted}</strong> is being processed via ${paymentMethod}.</p>
                  <p style="color: #000; margin-bottom: 20px;">You can expect it to arrive in the next few days.</p>
                  
                  <a href="${baseUrl}/sports-ambassador/settings/payments" 
                     style="background-color: #F26915; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                     View Payment History
                  </a>
                  
                  <p style="color: #000; margin-top: 30px;">Thanks for being a valued partner,<br>Team Sbonssy</p>
                </div>
              </div>
            `,
          });
        } catch (emailErr) {
          console.error(`[ERROR] Failed to send payout email to ${ambassador.email}:`, emailErr);
        }
      }
    }
  } catch (error) {
    console.error("Error in sendMonthlyPayoutEmails:", error);
  }
}

/**
 * Manual trigger for testing - processes payouts immediately
 * regardless of the current date
 */
async function triggerManualPayoutRun() {
  console.log("🔧 Manual payout run triggered");
  return await processMonthlyPayouts();
}

async function processMonthlyPayoutsTest() {
  console.log("🧪 TEST: Starting monthly payout run (test mode)");
  await connectDB();
  const result = await processMonthlyPayouts(true); // testMode = true for hourly batch IDs
  console.log("🧪 TEST: Monthly payout run complete", {
    successfulPayouts: result.successfulPayouts,
    failedPayouts: result.failedPayouts,
    skippedBelowThreshold: result.skippedBelowThreshold,
    totalPaidOutCents: result.totalPaidOutCents,
  });
  return result;
}

// Export for use in API routes and testing
module.exports = {
  processMonthlyPayouts,
  processAmbassadorPayout,
  triggerManualPayoutRun,
  processMonthlyPayoutsTest,
  sendMonthlyPayoutEmails,
};
