/**
 * TEST: Monthly Stats Email CRON Job
 * Runs every 2 minutes for testing purposes
 */

require("dotenv").config();
const { sendMonthlyStatsEmails, sendMonthlyBrandEmails } = require("./stats-monthly");
const cron = require("node-cron");

console.log("🧪 Stats Test Cron started. Will run every 2 minutes...");

// Schedule to run every 2 minutes
cron.schedule("*/2 * * * *", async () => {
    console.log(`[${new Date().toISOString()}] 🧪 Running test stats emails for sgs_11@yopmail.com...`);
    try {
        await sendMonthlyStatsEmails("sgs_11@yopmail.com");
        await sendMonthlyBrandEmails("brand_test@yopmail.com");
        console.log("✅ Test run completed.");
    } catch (error) {
        console.error("❌ Test run failed:", error);
    }
});

// Run immediately once on start for instant gratification
(async () => {
    console.log("🚀 Initializing first test run for sgs_11@yopmail.com...");
    await sendMonthlyStatsEmails("sgs_11@yopmail.com");
    await sendMonthlyBrandEmails("brand_test@yopmail.com");
})();
