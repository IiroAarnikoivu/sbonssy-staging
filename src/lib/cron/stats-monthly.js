/**
 * Monthly Stats Email CRON Job
 * Sends a summary of clicks, sales, and top campaign to ambassadors on the 1st of each month
 *
 * Schedule: 1st of each month at 08:00 AM UTC
 */

require("dotenv").config();
const cron = require("node-cron");
const mongoose = require("mongoose");
const moment = require("moment");

const User = mongoose.models.User || require("../../models/User").default;
const Campaign = mongoose.models.Campaign || require("../../models/Campaign").default;
const VisitorEvent = mongoose.models.VisitorEvent || require("../../models/VisitorEvent").default;
const { connectDB } = require("../db");
const { sendEmail } = require("../sendEmail");

// CRON job for monthly stats
cron.schedule(
  "0 8 1 * *", // At 08:00 AM on the 1st of every month
  async () => {
    // console.log("📊 Starting monthly stats email run...");
    await Promise.all([
      sendMonthlyStatsEmails(),
      sendMonthlyBrandEmails()
    ]);
  },
  { scheduled: true, timezone: "UTC" },
);

/**
 * Aggregates statistics and sends emails to all brands
 */
async function sendMonthlyBrandEmails() {
  try {
    await connectDB();

    // Define last month range
    const lastMonth = moment().subtract(1, "month");
    const start = lastMonth.startOf("month").toDate();
    const end = lastMonth.endOf("month").toDate();
    const monthName = lastMonth.format("MMMM");

    console.log(`[BRAND STATS] Fetching stats for ${monthName}`);

    // 1. Fetch all completed brands
    const query = {
      role: "brand",
      isProfileCompleted: true,
    };
    if (testEmail) {
      query.email = testEmail;
    }

    const brands = await User.find(query).lean();

    if (!brands.length) {
      console.log("[BRAND STATS] No completed brands found.");
      return;
    }

    const brandIds = brands.map(b => b._id);

    // 2. Aggregate counts per brand and campaign
    const stats = await VisitorEvent.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          brandId: { $in: brandIds },
        }
      },
      {
        $group: {
          _id: {
            brandId: "$brandId",
            campaignId: "$campaignId"
          },
          clicks: {
            $sum: { $cond: [{ $eq: ["$eventType", "click"] }, 1, 0] }
          },
          sales: {
            $sum: { $cond: [{ $eq: ["$eventData.eventName", "purchase"] }, 1, 0] }
          }
        }
      }
    ]);

    // 3. Map stats per brand
    const statsByBrand = {};
    for (const stat of stats) {
      const bId = stat._id.brandId.toString();
      if (!statsByBrand[bId]) {
        statsByBrand[bId] = {
          totalClicks: 0,
          totalSales: 0,
          campaigns: []
        };
      }
      statsByBrand[bId].totalClicks += stat.clicks;
      statsByBrand[bId].totalSales += stat.sales;
      statsByBrand[bId].campaigns.push({
        campaignId: stat._id.campaignId,
        clicks: stat.clicks,
        sales: stat.sales
      });
    }

    // 4. Send emails
    for (const brand of brands) {
      const bId = brand._id.toString();
      const userStats = statsByBrand[bId] || { totalClicks: 0, totalSales: 0, campaigns: [] };
      
      let topCampaignName = "N/A";
      if (userStats.campaigns.length > 0) {
        userStats.campaigns.sort((a, b) => (b.sales - a.sales) || (b.clicks - a.clicks));
        const topCampaignId = userStats.campaigns[0].campaignId;
        const campaign = await Campaign.findById(topCampaignId).select("basics.title").lean();
        topCampaignName = campaign?.basics?.title || "Unknown Campaign";
      }

      const brandName = brand.brand?.companyName || brand.brand?.name || "there";
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

      try {
        await sendEmail({
          to: brand.email,
          subject: "Your brand performance summary for this month",
          text: `Hi ${brandName}, Here’s your monthly summary for ${monthName}: Clicks: ${userStats.totalClicks}, Sales: ${userStats.totalSales}, Top Campaign: ${topCampaignName}. See full insights: ${baseUrl}/brand`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 0;">
              <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
                <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;">
                
                <p style="color: #000; margin-bottom: 16px;">Hi ${brandName},</p>
                <p style="color: #000; margin-bottom: 20px;">Here’s your brand performance summary for <strong>${monthName}</strong>:</p>
                
                <ul style="padding-left: 20px; color: #000; margin-bottom: 25px; list-style-type: disc;">
                  <li style="margin-bottom: 8px;">Total Clicks: <strong>${userStats.totalClicks}</strong></li>
                  <li style="margin-bottom: 8px;">Total Sales: <strong>${userStats.totalSales}</strong></li>
                  <li style="margin-bottom: 8px;">Top Campaign: <strong>${topCampaignName}</strong></li>
                </ul>

                <p style="color: #000; margin-bottom: 20px;">See full insights and manage your campaigns:</p>
                <a href="${baseUrl}/brand" 
                   style="background-color: #F26915; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                   View Brand Dashboard
                </a>
                
                <p style="color: #000; margin-top: 30px;">Best,<br>Team Sbonssy</p>
              </div>
            </div>
          `,
        });
        // console.log(`[BRAND STATS] Email sent to ${brand.email}`);
      } catch (err) {
        console.error(`[BRAND STATS] Failed to send email to ${brand.email}:`, err);
      }
    }

    // console.log("[BRAND STATS] Monthly stats email run complete.");
  } catch (error) {
    console.error("[BRAND STATS] Critical error in brand stats cron:", error);
  }
}

/**
 * Aggregates statistics and sends emails to all ambassadors
 */
async function sendMonthlyStatsEmails() {
  try {
    await connectDB();

    // Define last month range
    const lastMonth = moment().subtract(1, "month");
    const start = lastMonth.startOf("month").toDate();
    const end = lastMonth.endOf("month").toDate();
    const monthName = lastMonth.format("MMMM");

    // console.log(`[STATS] Fetching stats for ${monthName} (${start.toISOString()} to ${end.toISOString()})`);

    // 1. Fetch all completed sports-ambassadors
    const query = {
      role: "sports-ambassador",
      isProfileCompleted: true,
    };
    if (testEmail) {
      query.email = testEmail;
    }

    const ambassadors = await User.find(query).lean();

    if (!ambassadors.length) {
    //   console.log("[STATS] No completed ambassadors found.");
      return;
    }

    const ambassadorIds = ambassadors.map(a => a._id);

    // 2. Aggregate counts per ambassador and campaign
    const stats = await VisitorEvent.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          athleteId: { $in: ambassadorIds },
        }
      },
      {
        $group: {
          _id: {
            athleteId: "$athleteId",
            campaignId: "$campaignId"
          },
          clicks: {
            $sum: { $cond: [{ $eq: ["$eventType", "click"] }, 1, 0] }
          },
          sales: {
            $sum: { $cond: [{ $eq: ["$eventData.eventName", "purchase"] }, 1, 0] }
          }
        }
      }
    ]);

    // 3. Map stats per ambassador
    const statsByAmbassador = {};
    for (const stat of stats) {
      const aId = stat._id.athleteId.toString();
      if (!statsByAmbassador[aId]) {
        statsByAmbassador[aId] = {
          totalClicks: 0,
          totalSales: 0,
          campaigns: []
        };
      }
      statsByAmbassador[aId].totalClicks += stat.clicks;
      statsByAmbassador[aId].totalSales += stat.sales;
      statsByAmbassador[aId].campaigns.push({
        campaignId: stat._id.campaignId,
        clicks: stat.clicks,
        sales: stat.sales
      });
    }

    // 4. Send emails
    for (const ambassador of ambassadors) {
      const aId = ambassador._id.toString();
      const userStats = statsByAmbassador[aId] || { totalClicks: 0, totalSales: 0, campaigns: [] };
      
      // Don't send email if they have 0 activity this month? 
      // Requirement says "monthly summary", usually it's better to show progress even if 0, 
      // but if the user didn't request a "quiet month" filter, I'll send it.
      
      let topCampaignName = "N/A";
      if (userStats.campaigns.length > 0) {
        // Sort by sales descending, then clicks descending
        userStats.campaigns.sort((a, b) => (b.sales - a.sales) || (b.clicks - a.clicks));
        const topCampaignId = userStats.campaigns[0].campaignId;
        const campaign = await Campaign.findById(topCampaignId).select("basics.title").lean();
        topCampaignName = campaign?.basics?.title || "Unknown Campaign";
      }

      const profile = ambassador.athlete || ambassador.team || ambassador.influencer || ambassador.exAthlete || ambassador.paraAthlete || ambassador.coach;
      const firstName = profile?.firstName || profile?.name?.split(" ")[0] || "there";
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

      try {
        await sendEmail({
          to: ambassador.email,
          subject: "Your affiliate stats for this month",
          text: `Hi ${firstName}, Here’s your monthly summary for ${monthName}: Clicks: ${userStats.totalClicks}, Sales: ${userStats.totalSales}, Top Campaign: ${topCampaignName}. See full insights: ${baseUrl}/sports-ambassador`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 0;">
              <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
                <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;">
                
                <p style="color: #000; margin-bottom: 16px;">Hi ${firstName},</p>
                <p style="color: #000; margin-bottom: 20px;">Here’s your monthly summary for <strong>${monthName}</strong>:</p>
                
                <ul style="padding-left: 20px; color: #000; margin-bottom: 25px; list-style-type: disc;">
                  <li style="margin-bottom: 8px;">Clicks: <strong>${userStats.totalClicks}</strong></li>
                  <li style="margin-bottom: 8px;">Sales: <strong>${userStats.totalSales}</strong></li>
                  <li style="margin-bottom: 8px;">Top Campaign: <strong>${topCampaignName}</strong></li>
                </ul>

                <p style="color: #000; margin-bottom: 20px;">See full insights and optimize your performance:</p>
                <a href="${baseUrl}/sports-ambassador" 
                   style="background-color: #F26915; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                   View Dashboard
                </a>
                
                <p style="color: #000; margin-top: 30px;">To your success,<br>Team Sbonssy</p>
              </div>
            </div>
          `,
        });
        // console.log(`[STATS] Email sent to ${ambassador.email}`);
      } catch (err) {
        console.error(`[STATS] Failed to send email to ${ambassador.email}:`, err);
      }
    }

    // console.log("[STATS] Monthly stats email run complete.");
  } catch (error) {
    console.error("[STATS] Critical error in stats cron:", error);
  }
}

module.exports = { 
  sendMonthlyStatsEmails,
  sendMonthlyBrandEmails
};
