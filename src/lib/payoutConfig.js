/**
 * Payout Configuration
 * Centralized configuration for ambassador payout thresholds and schedules
 */

export const PAYOUT_CONFIG = {
  // Minimum balance required for payout (€50 in cents)
  MIN_PAYOUT_THRESHOLD_CENTS: 5000,

  // Day of month when payouts are processed
  PAYOUT_DAY: 15,

  // Default currency for payouts
  CURRENCY: "eur",

  // Payout schedule description (for display purposes)
  SCHEDULE_DESCRIPTION: "Monthly on the 15th",

  // Fixed Stripe Connect Express transfer fee per payout (in cents)
  TRANSFER_FEE_CENTS: 25,
};

// Helper functions
export function isEligibleForPayout(balanceCents) {
  return balanceCents >= PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS;
}

export function getThresholdInEuros() {
  return PAYOUT_CONFIG.MIN_PAYOUT_THRESHOLD_CENTS / 100;
}

export function formatBalanceForDisplay(balanceCents) {
  return `€${(balanceCents / 100).toFixed(2)}`;
}

export function generatePayoutBatchId(date = new Date(), testMode = false) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  // For test mode, include hour to allow multiple test runs per day
  if (testMode) {
    const hour = String(date.getHours()).padStart(2, "0");
    return `${year}-${month}-${day}-${hour}`;
  }

  return `${year}-${month}-${day}`;
}
