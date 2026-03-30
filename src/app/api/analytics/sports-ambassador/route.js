import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { FINNISH_VAT_RATE } from "@/lib/vat/vatCalculator";
import { getAmbassadorVATRules } from "@/lib/vat/viesValidator";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import VisitorEvent from "@/models/VisitorEvent";
import CampaignShare from "@/models/CampaignShare";
import Campaign from "@/models/Campaign";

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
      query = {
        supabaseId: ambassadorId.supabaseId,
        role: "sports-ambassador",
      };
    } else {
      query = { supabaseId: user.id, role: "sports-ambassador" };
    }

    const mongoUser = await User.findOne(query);
    if (!mongoUser || mongoUser.role !== "sports-ambassador") {
      console.error("Forbidden: User is not a sports ambassador", {
        supabaseId: user.id,
      });
      return NextResponse.json(
        { message: "Forbidden: Only sports ambassadors can view analytics" },
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
    const dateFilter =
      startDate && endDate
        ? { createdAt: { $gte: startDate, $lte: endDate } }
        : {};

    const shares = await CampaignShare.countDocuments({
      athleteId: mongoUser._id,
      ...dateFilter,
    });

    // Profile VAT fallback (used when event snapshots are missing)
    let profileVatCountry = "";
    let profileVatStatus = "not_provided";
    try {
      const subRoleKey = (mongoUser.subRole || "")
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase())
        .replace(/-/g, "");
      const profile = mongoUser[subRoleKey] || {};
      const vatDetails = profile.vatDetails || {};
      profileVatCountry = (
        vatDetails.vatCountry ||
        vatDetails.registrationCountry ||
        profile.vatCountry ||
        profile.registrationCountry ||
        ""
      )
        .toString()
        .toUpperCase();
      profileVatStatus = (
        vatDetails.vatStatus ||
        vatDetails.uiBusinessType ||
        profile.vatStatus ||
        profile.uiBusinessType ||
        "not_provided"
      )
        .toString()
        .toLowerCase();
    } catch (_) {}

    const eventVatMultiplier = (ev) => {
      const country = (
        ev?.athleteVatCountry || ev?.athleteVatCountry === ""
          ? ev.athleteVatCountry
          : profileVatCountry
      )
        ?.toString()
        .toUpperCase();
      const status = (
        ev?.athleteVatStatus || ev?.athleteVatStatus === ""
          ? ev.athleteVatStatus
          : profileVatStatus
      )
        ?.toString()
        .toLowerCase();

      const rules = getAmbassadorVATRules(
        country || "",
        status || "not_provided",
      );
      return rules.needsVatOnCommission ? 1 + (rules.vatRate || 0) : 1;
    };

    // Aggregate shares per campaign for this ambassador (respecting date range)
    const sharesAgg = await CampaignShare.aggregate([
      {
        $match: {
          athleteId: mongoUser._id,
          ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
        },
      },
      {
        $group: {
          _id: { campaignId: "$campaignId" },
          count: { $sum: 1 },
        },
      },
    ]);

    const events = await VisitorEvent.aggregate([
      {
        $match: {
          athleteId: mongoUser._id,
          commissionStatus: { $ne: "cancelled" },
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: {
            campaignId: "$campaignId",
            visitorId: "$visitorId",
            eventName: "$eventData.eventName",
          },
          amount: { $max: { $ifNull: ["$eventData.amount", 0] } },
          platformFee: { $max: { $ifNull: ["$eventData.platformFee", 0] } },
          hasClick: {
            $max: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$eventType", "click"] },
                    { $eq: ["$eventData.eventName", "click"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          hasSale: {
            $max: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$eventType", "conversion"] },
                    { $ne: ["$eventData.eventName", "click"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalClicks: { $sum: "$hasClick" },
          totalSales: { $sum: "$hasSale" },
          totalAmount: { $sum: "$amount" },
          totalPlatformFee: { $sum: "$platformFee" },
        },
      },
    ]);

    const stats = events[0] || {
      totalClicks: 0,
      totalSales: 0,
      totalAmount: 0,
      totalPlatformFee: 0,
    };
    const totalEventEarnings = stats.totalAmount;
    const totalPlatformEarningsOverview = stats.totalPlatformFee;

    // Build per-campaign metrics while treating conversion events with eventName "click" as clicks
    const campaignEvents = await VisitorEvent.aggregate([
      {
        $match: {
          athleteId: mongoUser._id,
          commissionStatus: { $ne: "cancelled" },
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: {
            campaignId: "$campaignId",
            visitorId: "$visitorId",
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
        },
      },
      {
        $group: {
          _id: {
            campaignId: "$_id.campaignId",
            eventType: "$_id.eventType",
            eventName: "$_id.eventName",
          },
          count: { $sum: "$count" },
          totalAmount: { $sum: "$totalAmount" },
          totalPlatformFee: { $sum: "$totalPlatformFee" },
        },
      },
    ]);

    const campaignIds = Array.from(
      new Set([
        ...campaignEvents.map((e) => e?._id?.campaignId).filter((id) => !!id),
        ...sharesAgg.map((s) => s._id.campaignId).filter((id) => !!id),
      ]),
    );

    const campaigns = await Campaign.find(
      { _id: { $in: campaignIds } },
      { basics: 1, compensation: 1 },
    ).lean();

    const campaignInfo = new Map(
      campaigns.map((c) => [
        c._id.toString(),
        {
          title: c.basics?.title || "Untitled Campaign",
          compensationType: c.compensation?.type || "unknown",
          perClickAmount: parseFloat(c.compensation?.amount) || 0,
        },
      ]),
    );

    const campaignsAnalyticsMap = new Map();
    for (const e of campaignEvents) {
      const id = e._id?.campaignId?.toString();
      if (!id) continue;
      if (!campaignsAnalyticsMap.has(id)) {
        const meta = campaignInfo.get(id) || {
          title: "Untitled Campaign",
          compensationType: "unknown",
        };
        campaignsAnalyticsMap.set(id, {
          campaignId: id,
          campaignTitle: meta.title,
          compensationType: meta.compensationType,
          totalClicks: 0,
          totalConversions: 0,
          financials: {
            ambassadorEarnings: 0,
            brandSpend: 0,
          },
        });
      }
      const item = campaignsAnalyticsMap.get(id);
      if (
        e._id.eventType === "click" ||
        (e._id.eventType === "conversion" && e._id.eventName === "click")
      ) {
        const inc = e.count || 0;
        item.totalClicks += inc;
        if (item.compensationType === "pay-per-click") {
          item.totalConversions += inc;
        }
      } else if (e._id.eventType === "conversion") {
        item.totalConversions += e.count || 0;
        // Financials will be recomputed per event below using snapshots
      }
    }

    // Ensure campaigns with only shares are present, and override flat-fee metrics from shares
    const sharesByCampaign = new Map(
      sharesAgg.map((s) => [s._id.campaignId.toString(), s.count]),
    );
    for (const [id, meta] of campaignInfo.entries()) {
      const isFlatFee = meta.compensationType === "flat-fee";
      const shareCount = sharesByCampaign.get(id) || 0;

      // Include campaign if it has shares even if no events
      if (isFlatFee && shareCount > 0 && !campaignsAnalyticsMap.has(id)) {
        campaignsAnalyticsMap.set(id, {
          campaignId: id,
          campaignTitle: meta.title,
          compensationType: meta.compensationType,
          totalClicks: 0,
          totalConversions: 0,
          financials: {
            ambassadorEarnings: 0,
            platformEarnings: 0,
            brandSpend: 0,
          },
        });
      }

      if (isFlatFee && campaignsAnalyticsMap.has(id)) {
        const item = campaignsAnalyticsMap.get(id);
        item.totalConversions = shareCount;
        const perShare = meta.perClickAmount || 0; // amount field reused
        const ambEarn = shareCount * perShare;
        const platEarn = ambEarn * 0.2;
        const shareMultiplier = (() => {
          const rules = getAmbassadorVATRules(
            profileVatCountry,
            profileVatStatus,
          );
          return rules.needsVatOnCommission ? 1 + (rules.vatRate || 0) : 1;
        })();
        const withVat = ambEarn * shareMultiplier;
        const platWithVat = platEarn * shareMultiplier;
        item.financials.ambassadorEarnings = withVat;
        item.financials.platformEarnings = platWithVat;
        item.financials.brandSpend = withVat + platWithVat;
      }
    }

    // Fetch conversion events for per-event VAT recomputation
    const rawEvents = await VisitorEvent.find({
      athleteId: mongoUser._id,
      ...dateFilter,
      eventType: "conversion",
      commissionStatus: { $ne: "cancelled" },
    })
      .sort({ createdAt: -1 })
      .lean()
      .catch(() => []);

    // Apply per-event VAT to ambassador/platform earnings
    for (const ev of rawEvents) {
      const campaignIdStr = ev.campaignId?.toString();
      if (!campaignIdStr) continue;
      if (!campaignsAnalyticsMap.has(campaignIdStr)) {
        const meta = campaignInfo.get(campaignIdStr) || {
          title: "Untitled Campaign",
          compensationType: "unknown",
        };
        campaignsAnalyticsMap.set(campaignIdStr, {
          campaignId: campaignIdStr,
          campaignTitle: meta.title,
          compensationType: meta.compensationType,
          totalClicks: 0,
          totalConversions: 0,
          financials: {
            ambassadorEarnings: 0,
            brandSpend: 0,
            platformEarnings: 0,
          },
        });
      }
      const item = campaignsAnalyticsMap.get(campaignIdStr);
      const base = Number(ev?.eventData?.amount || 0);
      const basePlatform = Number(ev?.eventData?.platformFee || 0);
      const multiplier = eventVatMultiplier(ev);
      const withVat = base * multiplier;
      const platformWithVat = basePlatform * multiplier;

      item.financials.ambassadorEarnings += withVat;
      item.financials.brandSpend += withVat + platformWithVat;
      item.financials.platformEarnings =
        (item.financials.platformEarnings || 0) + platformWithVat;
    }

    const campaignsAnalytics = Array.from(campaignsAnalyticsMap.values()).map(
      (c) => {
        // Fallback for PPC: if no conversion-click totals were aggregated, compute by perClickAmount * clicks
        if (
          c.compensationType === "pay-per-click" &&
          Number(c.financials.ambassadorEarnings) === 0 &&
          (c.totalClicks || 0) > 0
        ) {
          const meta = campaignInfo.get(c.campaignId) || {};
          const perClick = Number(meta.perClickAmount || 0);
          const base = perClick * (c.totalClicks || 0);
          const plat = base * 0.2;
          const multiplier = (() => {
            // PPC clicks won't have snapshots here; use profile fallback
            const rules = getAmbassadorVATRules(
              profileVatCountry,
              profileVatStatus,
            );
            return rules.needsVatOnCommission ? 1 + (rules.vatRate || 0) : 1;
          })();
          const withVat = base * multiplier;
          const platWithVat = plat * multiplier;
          c.financials.ambassadorEarnings = withVat;
          c.financials.platformEarnings =
            (c.financials.platformEarnings || 0) + platWithVat;
          c.financials.brandSpend = withVat + platWithVat;
        }
        return {
          ...c,
          financials: {
            ...c.financials,
            ambassadorEarnings: Number(c.financials.ambassadorEarnings).toFixed(
              2,
            ),
            platformEarnings: Number(
              c.financials.platformEarnings || 0,
            ).toFixed(2),
            brandSpend: Number(c.financials.brandSpend).toFixed(2),
          },
        };
      },
    );

    // Overall metrics recomputed from per-campaign data (ensures flat-fee shares are included)
    const overallClicks = campaignsAnalytics.reduce(
      (sum, c) => sum + (c.totalClicks || 0),
      0,
    );
    const overallConversions = campaignsAnalytics.reduce(
      (sum, c) => sum + (c.totalConversions || 0),
      0,
    );
    const overallEarnings = campaignsAnalytics.reduce(
      (sum, c) => sum + parseFloat(c.financials.ambassadorEarnings),
      0,
    );
    const overallPlatformEarnings = campaignsAnalytics.reduce(
      (sum, c) => sum + parseFloat(c.financials.platformEarnings),
      0,
    );

    const analytics = {
      clicks: overallClicks,
      conversions: overallConversions,
      earnings: overallEarnings.toFixed(2),
      platformEarnings: overallPlatformEarnings.toFixed(2),
      shares,
      campaigns: campaignsAnalytics,
    };

    return NextResponse.json(
      { data: analytics, success: true },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Error in /api/analytics/sports-ambassador:",
      error.message,
      error.stack,
    );
    return NextResponse.json(
      { message: error.message || "Error fetching analytics" },
      { status: 500 },
    );
  }
}
