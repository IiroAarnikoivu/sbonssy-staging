/**
 * One-time migration script to backfill commissionStatus on existing VisitorEvents.
 *
 * Logic:
 * - Events with cancelledAt set → commissionStatus: "cancelled"
 * - Purchase events older than 30 days → commissionStatus: "locked"
 * - Purchase events newer than 30 days → commissionStatus: "pending"
 * - Non-purchase events (clicks, etc.) → skip (no commission lifecycle)
 *
 * Usage:
 *   node scripts/migrate-commission-status.js
 *
 * Safe to run multiple times (idempotent — only updates events with null commissionStatus).
 */

require("dotenv").config();
const mongoose = require("mongoose");

const VALIDATION_WINDOW_DAYS = 30;

async function main() {
  const dbUrl = process.env.DATABASE_URL || process.env.MONGODB_URI;
  if (!dbUrl) {
    console.error("ERROR: No DATABASE_URL or MONGODB_URI found in env");
    process.exit(1);
  }

  console.log("[MIGRATION] Connecting to database...");
  await mongoose.connect(dbUrl);
  console.log("[MIGRATION] Connected.");

  // Load VisitorEvent model
  const VisitorEvent =
    mongoose.models.VisitorEvent ||
    (await import("../src/models/VisitorEvent.js")).default;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - VALIDATION_WINDOW_DAYS);

  // 1. Mark cancelled events
  const cancelledResult = await VisitorEvent.updateMany(
    {
      cancelledAt: { $exists: true, $ne: null },
      commissionStatus: { $exists: false },
    },
    { $set: { commissionStatus: "cancelled" } },
  );
  console.log(
    `[MIGRATION] Set ${cancelledResult.modifiedCount} event(s) to "cancelled"`,
  );

  // 2. Lock old purchase events (past validation window)
  const lockedResult = await VisitorEvent.updateMany(
    {
      "eventData.eventName": "purchase",
      createdAt: { $lt: cutoffDate },
      cancelledAt: { $exists: false },
      commissionStatus: { $exists: false },
    },
    { $set: { commissionStatus: "locked" } },
  );
  console.log(
    `[MIGRATION] Set ${lockedResult.modifiedCount} event(s) to "locked" (older than ${VALIDATION_WINDOW_DAYS} days)`,
  );

  // 3. Set pending on recent purchase events
  const pendingResult = await VisitorEvent.updateMany(
    {
      "eventData.eventName": "purchase",
      createdAt: { $gte: cutoffDate },
      cancelledAt: { $exists: false },
      commissionStatus: { $exists: false },
    },
    { $set: { commissionStatus: "pending" } },
  );
  console.log(
    `[MIGRATION] Set ${pendingResult.modifiedCount} event(s) to "pending" (within ${VALIDATION_WINDOW_DAYS} days)`,
  );

  // 4. Set remaining events (non-purchase) to pending as default
  const otherResult = await VisitorEvent.updateMany(
    {
      commissionStatus: { $exists: false },
    },
    { $set: { commissionStatus: "pending" } },
  );
  console.log(
    `[MIGRATION] Set ${otherResult.modifiedCount} remaining event(s) to "pending" (non-purchase)`,
  );

  console.log("[MIGRATION] Done. Summary:");
  console.log(`  Cancelled: ${cancelledResult.modifiedCount}`);
  console.log(`  Locked:    ${lockedResult.modifiedCount}`);
  console.log(
    `  Pending:   ${pendingResult.modifiedCount + otherResult.modifiedCount}`,
  );

  await mongoose.disconnect();
  console.log("[MIGRATION] Disconnected. Migration complete.");
}

main().catch((err) => {
  console.error("[MIGRATION] Fatal error:", err);
  process.exit(1);
});
