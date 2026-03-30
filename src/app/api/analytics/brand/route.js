import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  FINNISH_VAT_RATE,
  calculateStripeProcessingFeeCents,
} from "@/lib/vat/vatCalculator";
import { getBrandInvoiceVATTreatment } from "@/lib/vat/viesValidator";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import VisitorEvent from "@/models/VisitorEvent";
import Campaign from "@/models/Campaign";
import CampaignShare from "@/models/CampaignShare";
import Invoice from "@/models/Invoice";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    await connectDB();
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      console.error("Auth error:", authError?.message);
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let query;
    if (user.user_metadata.inviter_email) {
      const ambassadorId = await User.findOne({
        email: user.user_metadata.inviter_email,
      });
      if (!ambassadorId) {
        return NextResponse.json(
          { message: "Ambassador not found" },
          { status: 404 },
        );
      }
      query = { supabaseId: ambassadorId.supabaseId };
    } else {
      query = { supabaseId: user.id, role: "brand" };
    }

    const mongoUser = await User.findOne(query);
    if (!mongoUser || mongoUser.role !== "brand") {
      console.error("Forbidden: User is not a brand", { supabaseId: user.id });
      return NextResponse.json(
        { message: "Forbidden: Only brands can view analytics" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate"))
      : null;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate"))
      : null;
    const includeTests = searchParams.get("includeTests") === "true";
    const dateFilter =
      startDate && endDate
        ? { createdAt: { $gte: startDate, $lte: endDate } }
        : {};

    // First get all athlete IDs that have events
    const athleteIdsWithEvents = await VisitorEvent.distinct("athleteId", {
      brandId: mongoUser._id,
      ...dateFilter,
    });

    // Then fetch all these athletes at once
    const athletes = await User.find({
      _id: { $in: athleteIdsWithEvents.filter((id) => id) }, // Filter out null/undefined
    });

    // Create a map of athleteId to athlete details for quick lookup
    const athleteMap = new Map();
    athletes.forEach((athlete) => {
      const name =
        athlete.athlete?.name ||
        athlete.team?.name ||
        athlete.influencer?.name ||
        athlete.coach?.name ||
        athlete.exAthlete?.name ||
        athlete.paraAthlete?.name ||
        "Unknown";
      const trackingKey =
        athlete.athlete?.tracking_key ||
        athlete.team?.tracking_key ||
        athlete.influencer?.tracking_key ||
        athlete.coach?.tracking_key ||
        athlete.exAthlete?.tracking_key ||
        athlete.paraAthlete?.tracking_key ||
        null;
      athleteMap.set(athlete._id.toString(), { name, trackingKey });
    });

    // Discovery: Get all campaign IDs that have events for this brand in the period
    const campaignIdsWithEvents = await VisitorEvent.distinct("campaignId", {
      brandId: mongoUser._id,
      ...dateFilter,
    });

    // Also include all campaigns owned by the brand
    const ownedCampaigns = await Campaign.find({
      brandId: mongoUser._id,
    }).distinct("_id");

    const allRelevantCampaignIds = [
      ...new Set([
        ...campaignIdsWithEvents.filter((id) => id),
        ...ownedCampaigns.filter((id) => id),
      ]),
    ];

    const campaignsWithCompensation = await Campaign.find(
      { _id: { $in: allRelevantCampaignIds } },
      { _id: 1, "compensation.type": 1, "basics.title": 1, brandId: 1 },
    );

    const campaignCompensationMap = new Map(
      campaignsWithCompensation.map((camp) => [
        camp._id.toString(),
        {
          type: camp.compensation?.type || "unknown",
          title: camp.basics?.title || "Untitled Campaign",
        },
      ]),
    );

    const campaigns = campaignsWithCompensation;

    // Only include events for campaigns with valid compensation types
    const validCompensationTypes = [
      "pay-per-sale",
      "pay-per-click",
      "pay-per-lead",
      "flat-fee",
    ];
    const validCampaignIds = Array.from(campaignCompensationMap.entries())
      .filter(([_, { type }]) => validCompensationTypes.includes(type))
      .map(([id]) => new mongoose.Types.ObjectId(id));

    // Stripe fees must match what's shown on invoice listings.
    // Some older invoices/events may not have Stripe fee line items saved, so we sum from Invoice.lineItems.
    const invoiceDateFilter =
      startDate && endDate
        ? { createdAt: { $gte: startDate, $lte: endDate } }
        : {};

    const invoicesForStripe = await Invoice.find(
      {
        brandId: new mongoose.Types.ObjectId(mongoUser._id),
        campaignId: { $in: validCampaignIds.map((id) => id.toString()) },
        ...invoiceDateFilter,
      },
      { campaignId: 1, lineItems: 1 },
    )
      .lean()
      .catch(() => []);

    const stripeFeeByCampaignCents = new Map();
    for (const inv of invoicesForStripe) {
      const campaignId = inv?.campaignId ? String(inv.campaignId) : null;
      if (!campaignId) continue;
      const items = Array.isArray(inv.lineItems) ? inv.lineItems : [];
      for (const li of items) {
        const meta =
          li?.metadata instanceof Map
            ? Object.fromEntries(li.metadata)
            : li?.metadata || {};
        const type = (meta?.type || meta?.Type || "").toString().toLowerCase();
        if (type !== "stripe_processing_fee") continue;
        const cents = Number(li?.amount) || 0;
        if (!Number.isFinite(cents) || cents <= 0) continue;
        stripeFeeByCampaignCents.set(
          campaignId,
          (stripeFeeByCampaignCents.get(campaignId) || 0) + cents,
        );
      }
    }

    const events = await VisitorEvent.aggregate([
      {
        $match: {
          brandId: new mongoose.Types.ObjectId(mongoUser._id),
          campaignId: { $in: validCampaignIds },
          ...dateFilter,
          ...(includeTests ? {} : { isTest: { $ne: true } }),
        },
      },
      {
        $group: {
          _id: {
            campaignId: "$campaignId",
            athleteId: { $ifNull: ["$athleteId", null] },
            eventType: "$eventType",
            eventName: "$eventData.eventName",
          },
          count: { $sum: 1 },
          totalAmount: {
            $sum: {
              $cond: [
                { $eq: ["$eventType", "conversion"] },
                { $ifNull: ["$eventData.amount", 0] },
                0,
              ],
            },
          },
          totalPlatformFee: {
            $sum: {
              $cond: [
                { $eq: ["$eventType", "conversion"] },
                { $ifNull: ["$eventData.platformFee", 0] },
                0,
              ],
            },
          },
          totalAmountOfOriginalSale: {
            $sum: {
              $cond: [
                { $eq: ["$eventType", "conversion"] },
                { $ifNull: ["$eventData.originalSaleAmount", 0] },
                0,
              ],
            },
          },
          clickConvAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$eventType", "conversion"] },
                    { $eq: ["$eventData.eventName", "click"] },
                  ],
                },
                { $ifNull: ["$eventData.amount", 0] },
                0,
              ],
            },
          },
          clickConvPlatformFee: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$eventType", "conversion"] },
                    { $eq: ["$eventData.eventName", "click"] },
                  ],
                },
                { $ifNull: ["$eventData.platformFee", 0] },
                0,
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: { campaignId: "$_id.campaignId", athleteId: "$_id.athleteId" },
          totalClicks: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$_id.eventType", "click"] },
                    {
                      $and: [
                        { $eq: ["$_id.eventType", "conversion"] },
                        { $eq: ["$_id.eventName", "click"] },
                      ],
                    },
                  ],
                },
                "$count",
                0,
              ],
            },
          },
          totalConversions: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_id.eventType", "conversion"] },
                    { $ne: ["$_id.eventName", "click"] },
                  ],
                },
                "$count",
                0,
              ],
            },
          },
          totalAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_id.eventType", "conversion"] },
                    { $ne: ["$_id.eventName", "click"] },
                  ],
                },
                "$totalAmount",
                0,
              ],
            },
          },
          totalPlatformFee: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_id.eventType", "conversion"] },
                    { $ne: ["$_id.eventName", "click"] },
                  ],
                },
                "$totalPlatformFee",
                0,
              ],
            },
          },
          totalAmountOfOriginalSale: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_id.eventType", "conversion"] },
                    { $ne: ["$_id.eventName", "click"] },
                  ],
                },
                "$totalAmountOfOriginalSale",
                0,
              ],
            },
          },
          totalPpcAmount: { $sum: "$clickConvAmount" },
          totalPpcPlatformFee: { $sum: "$clickConvPlatformFee" },
        },
      },
      {
        $project: {
          _id: {
            campaignId: "$_id.campaignId",
            athleteId: "$_id.athleteId",
          },
          totalClicks: 1,
          totalConversions: 1,
          totalAmount: 1,
          totalPlatformFee: 1,
          totalAmountOfOriginalSale: 1,
          totalPpcAmount: 1,
          totalPpcPlatformFee: 1,
        },
      },
    ]);

    // Aggregate shares for flat-fee campaigns within the same date range
    const sharesAgg = await CampaignShare.aggregate([
      {
        $match: {
          campaignId: { $in: validCampaignIds },
          ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
        },
      },
      {
        $group: {
          _id: { campaignId: "$campaignId", athleteId: "$athleteId" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Brand VAT fallback (used when event snapshots missing)
    const brandVatDetails = mongoUser?.brand?.vatDetails || {};
    const fallbackBrandCountry = (
      brandVatDetails.vatCountry ||
      mongoUser?.brand?.country ||
      ""
    )
      .toString()
      .toUpperCase();
    const fallbackBrandStatus = (brandVatDetails.vatStatus || "not_provided")
      .toString()
      .toLowerCase();

    const normalizeCountry = (v) => {
      const val = (v || "").toString().trim();
      return val ? val.toUpperCase() : null;
    };
    const normalizeStatus = (v) => {
      const val = (v || "not_provided").toString().trim();
      return val ? val.toLowerCase() : "not_provided";
    };

    const analytics = await Promise.all(
      campaigns
        .filter((campaign) =>
          validCompensationTypes.includes(campaign.compensation?.type),
        )
        .map(async (campaign) => {
          const campaignEvents = events.filter(
            (e) => e._id.campaignId?.toString() === campaign._id.toString(),
          );

          const totalClicks = campaignEvents.reduce(
            (sum, e) => sum + (e.totalClicks || 0),
            0,
          );

          let totalConversions = campaignEvents.reduce((sum, e) => {
            if (campaign.compensation?.type === "pay-per-click") {
              return sum + (e.totalClicks || 0);
            }
            return sum + (e.totalConversions || 0);
          }, 0);

          // Revenue: Sum of original sale amounts
          let grossRevenue = campaignEvents.reduce((sum, e) => {
            return sum + (e.totalAmountOfOriginalSale || 0);
          }, 0);

          // Per-event VAT-aware financial aggregation
          const rawEvents = await VisitorEvent.find({
            brandId: mongoUser._id,
            campaignId: campaign._id,
            eventType: "conversion",
            ...dateFilter,
            ...(includeTests ? {} : { isTest: { $ne: true } }),
          })
            .lean()
            .catch(() => []);

          let commissionCents = 0;
          let platformCents = 0;
          let stripeFeeCents = 0;
          let vatCents = 0;

          const perAmbassadorCost = new Map(); // key: athleteId

          for (const ev of rawEvents) {
            const baseCents = Math.round((ev?.eventData?.amount || 0) * 100);
            const platCents = Math.round(
              (ev?.eventData?.platformFee || 0) * 100,
            );
            const stripeCents = calculateStripeProcessingFeeCents(
              baseCents + platCents,
            );

            const evCountry =
              normalizeCountry(ev?.brandVatCountry) || fallbackBrandCountry;
            const evStatus = normalizeStatus(
              ev?.brandVatStatus || fallbackBrandStatus,
            );
            // Use VIES invoice treatment so EU w/o valid VAT gets Finnish VAT (25.5%)
            const treatment = getBrandInvoiceVATTreatment(
              evCountry || "",
              evStatus || "not_provided",
            );
            const evVatRate = treatment.chargeVat ? treatment.vatRate : 0;
            const evVatCents = treatment.chargeVat
              ? Math.round((baseCents + platCents + stripeCents) * evVatRate)
              : 0;

            commissionCents += baseCents;
            platformCents += platCents;
            stripeFeeCents += stripeCents;
            vatCents += evVatCents;

            const athleteIdStr = ev.athleteId
              ? ev.athleteId.toString()
              : "unknown";
            if (!perAmbassadorCost.has(athleteIdStr)) {
              perAmbassadorCost.set(athleteIdStr, {
                commissionCents: 0,
                platformCents: 0,
                stripeCents: 0,
                vatCents: 0,
              });
            }
            const bucket = perAmbassadorCost.get(athleteIdStr);
            bucket.commissionCents += baseCents;
            bucket.platformCents += platCents;
            bucket.stripeCents += stripeCents;
            bucket.vatCents += evVatCents;
          }

          // Stripe fees: prefer persisted from invoices if available for the period
          const persistedStripeFeeCents =
            stripeFeeByCampaignCents.get(campaign._id.toString()) || 0;
          if (persistedStripeFeeCents > 0) {
            // Replace stripe fee with persisted value to stay consistent with invoices
            stripeFeeCents = persistedStripeFeeCents;
          }

          const subtotalBaseCents =
            commissionCents + platformCents + stripeFeeCents;
          const totalCostCents = subtotalBaseCents + vatCents;
          const totalCostMajor = totalCostCents / 100;
          const stripeFeesMajor = stripeFeeCents / 100;
          const vatMajor = vatCents / 100;

          // Metrics
          const revenue = grossRevenue;
          const totalCost = totalCostMajor;
          const clicks = totalClicks;
          const conversions = totalConversions;
          const conversionRate = clicks > 0 ? conversions / clicks : 0;
          const aov = conversions > 0 ? revenue / conversions : 0;
          const epc = clicks > 0 ? revenue / clicks : 0;
          const cpa = conversions > 0 ? totalCost / conversions : 0;
          const roas = totalCost > 0 ? revenue / totalCost : 0;

          const trafficByAmbassador = [];
          const ambassadorDataMap = new Map();

          // Build traffic by ambassador
          campaignEvents.forEach((e) => {
            const athleteId = e._id.athleteId?.toString();
            if (!athleteId) return;

            if (!ambassadorDataMap.has(athleteId)) {
              const athleteInfo = athleteMap.get(athleteId) || {
                name: "Unknown",
                trackingKey: null,
              };
              ambassadorDataMap.set(athleteId, {
                athleteId,
                ambassadorName: athleteInfo.name,
                trackingKey: athleteInfo.trackingKey,
                clicks: 0,
                conversions: 0,
                ambassadorEarnings: 0,
                brandCost: 0,
              });
            }

            const ambData = ambassadorDataMap.get(athleteId);
            ambData.clicks += e.totalClicks || 0;
            if (campaign.compensation?.type === "pay-per-click") {
              ambData.conversions += e.totalClicks || 0;
            } else {
              ambData.conversions += e.totalConversions || 0;
            }

            const costBucket = perAmbassadorCost.get(athleteId) || {
              commissionCents: 0,
              platformCents: 0,
              stripeCents: 0,
              vatCents: 0,
            };

            ambData.ambassadorEarnings += costBucket.commissionCents / 100; // athlete payout
            ambData.brandCost +=
              (costBucket.commissionCents +
                costBucket.platformCents +
                costBucket.stripeCents +
                costBucket.vatCents) /
              100;
          });

          ambassadorDataMap.forEach((value) => {
            trafficByAmbassador.push({
              ...value,
              ambassadorEarnings: value.ambassadorEarnings.toFixed(2),
              brandCost: value.brandCost.toFixed(2),
            });
          });

          return {
            campaignId: campaign._id.toString(),
            campaignTitle: campaign.basics?.title || "Untitled Campaign",
            compensationType: campaign.compensation?.type || "unknown",
            totalClicks,
            totalConversions,
            earnings: (
              (commissionCents + platformCents) / 100 +
              vatMajor
            ).toFixed(2), // subtotal + VAT
            financials: {
              brandSpend: totalCost.toFixed(2),
              platformEarnings: (platformCents / 100).toFixed(2),
              ambassadorEarnings: (commissionCents / 100).toFixed(2),
              vatAmount: vatMajor.toFixed(2),
            },
            roi:
              campaign.goals?.budgetCap && totalCost
                ? (((revenue - totalCost) / totalCost) * 100).toFixed(2)
                : "0.00",
            trafficByAmbassador,
            revenue: revenue.toFixed(2),
            totalCost: totalCost.toFixed(2),
            conversionRate: Number(conversionRate.toFixed(4)),
            aov: aov.toFixed(2),
            epc: epc.toFixed(4),
            cpa: cpa.toFixed(2),
            roas: Number(roas.toFixed(4)),
            stripeFees: stripeFeesMajor.toFixed(2),
          };
        }),
    );

    // Overview totals
    const totals = analytics.reduce(
      (acc, c) => {
        acc.revenue += parseFloat(c.revenue);
        acc.totalCost += parseFloat(c.totalCost);
        acc.clicks += c.totalClicks;
        acc.conversions += c.totalConversions;
        acc.platformEarnings += parseFloat(c.financials.platformEarnings);
        acc.ambassadorEarnings += parseFloat(c.financials.ambassadorEarnings);
        acc.brandSpend += parseFloat(c.financials.brandSpend);
        acc.stripeFees += parseFloat(c.stripeFees || 0);
        return acc;
      },
      {
        revenue: 0,
        totalCost: 0,
        clicks: 0,
        conversions: 0,
        platformEarnings: 0,
        ambassadorEarnings: 0,
        brandSpend: 0,
        stripeFees: 0,
      },
    );
    const overview = {
      revenue: totals.revenue.toFixed(2),
      totalCost: totals.totalCost.toFixed(2),
      clicks: totals.clicks,
      conversions: totals.conversions,
      conversionRate:
        totals.clicks > 0
          ? Number((totals.conversions / totals.clicks).toFixed(4))
          : 0,
      aov:
        totals.conversions > 0
          ? (totals.revenue / totals.conversions).toFixed(2)
          : "0.00",
      epc:
        totals.clicks > 0
          ? Number((totals.revenue / totals.clicks).toFixed(4))
          : 0,
      cpa:
        totals.conversions > 0
          ? (totals.totalCost / totals.conversions).toFixed(2)
          : "0.00",
      roas:
        totals.totalCost > 0
          ? Number((totals.revenue / totals.totalCost).toFixed(4))
          : 0,
      platformEarnings: totals.platformEarnings.toFixed(2),
      ambassadorEarnings: totals.ambassadorEarnings.toFixed(2),
      brandSpend: totals.brandSpend.toFixed(2),
      stripeFees: totals.stripeFees.toFixed(2),
    };

    return NextResponse.json(
      { data: analytics, overview, success: true },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in /api/analytics/brand:", error.message, error.stack);
    return NextResponse.json(
      { message: error.message || "Error fetching analytics" },
      { status: 500 },
    );
  }
}
