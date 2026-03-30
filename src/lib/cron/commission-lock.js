/**
 * Commission Lock CRON Job
 *
 * Runs daily at 2:00 AM UTC.
 * Locks commissions that have passed the 30-day validation window,
 * making them immune to refund reversals and eligible for payout.
 *
 * Logic:
 * - Find all VisitorEvents with commissionStatus === "pending"
 *   and eventData.eventName === "purchase"
 *   and createdAt < (now - 30 days)
 * - Bulk-update commissionStatus → "locked"
 */

require("dotenv").config();
const cron = require("node-cron");
const mongoose = require("mongoose");
const { connectDB } = require("../db");

const VALIDATION_WINDOW_DAYS = 30;

/**
 * Lock all pending commissions past the validation window
 */
async function lockPendingCommissions() {
  const startTime = Date.now();
  console.log("[COMMISSION_LOCK] Starting commission lock run...");

  try {
    await connectDB();

    const VisitorEvent =
      mongoose.models.VisitorEvent ||
      require("../../models/VisitorEvent").default;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - VALIDATION_WINDOW_DAYS);

    const result = await VisitorEvent.updateMany(
      {
        commissionStatus: "pending",
        "eventData.eventName": "purchase",
        createdAt: { $lt: cutoffDate },
        cancelledAt: { $exists: false },
        commissionStatus: { $ne: "cancelled" },
      },
      {
        $set: { commissionStatus: "locked" },
      },
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(
      `[COMMISSION_LOCK] Locked ${result.modifiedCount} commission(s) ` +
        `(matched ${result.matchedCount}) in ${duration}s. ` +
        `Cutoff: ${cutoffDate.toISOString()}`,
    );

    return {
      lockedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
      cutoffDate: cutoffDate.toISOString(),
      durationSeconds: parseFloat(duration),
    };
  } catch (error) {
    console.error("[COMMISSION_LOCK] Error:", error.message, error.stack);
    return { error: error.message };
  }
}

// Schedule: Daily at 2:00 AM UTC
if (process.env.NODE_ENV === "production") {
  cron.schedule(
    "0 2 * * *", // At 02:00 every day
    async () => {
      try {
        await lockPendingCommissions();
      } catch (error) {
        console.error("[COMMISSION_LOCK] Critical error:", error.message);
      }
    },
    { scheduled: true, timezone: "UTC" },
  );
  console.log("[COMMISSION_LOCK] Daily cron scheduled at 02:00 UTC");
}

module.exports = {
  lockPendingCommissions,
  VALIDATION_WINDOW_DAYS,
};
