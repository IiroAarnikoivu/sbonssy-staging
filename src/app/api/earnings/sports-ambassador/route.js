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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Resolve ambassador for invited users as well
    let query;
    if (user.user_metadata?.inviter_email) {
      const ambassadorByEmail = await User.findOne({
        email: user.user_metadata.inviter_email,
      });
      if (!ambassadorByEmail) {
        return NextResponse.json(
          { message: "Ambassador not found" },
          { status: 404 },
        );
      }
      query = {
        supabaseId: ambassadorByEmail.supabaseId,
        role: "sports-ambassador",
      };
    } else {
      query = { supabaseId: user.id, role: "sports-ambassador" };
    }

    const mongoUser = await User.findOne(query);
    if (!mongoUser || mongoUser.role !== "sports-ambassador") {
      return NextResponse.json(
        { message: "Forbidden: Only sports ambassadors can view earnings" },
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

    // Prepare profile VAT fallbacks
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

    // Overall counts and conversion earnings (include refunds as negative amounts; exclude only cancelled events)
    const events = await VisitorEvent.aggregate([
      {
        $match: {
          athleteId: mongoUser._id,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: {
            orderId: {
              $ifNull: ["$shopifyOrderId", "$eventData.transactionId"],
            },
            visitorId: "$visitorId",
            eventType: "$eventType",
          },
          amount: { $max: { $ifNull: ["$eventData.amount", 0] } },
          commissionStatus: { $first: "$commissionStatus" },
        },
      },
      {
        $group: {
          _id: "$_id.eventType",
          totalAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_id.eventType", "conversion"] },
                    { $ne: ["$commissionStatus", "cancelled"] },
                  ],
                },
                "$amount",
                0,
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: { eventType: "$_id", count: 1, totalAmount: 1, _id: 0 },
      },
    ]);

    // Per-campaign metrics (include refunds; exclude only cancelled events)
    const campaignEvents = await VisitorEvent.aggregate([
      {
        $match: {
          athleteId: mongoUser._id,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: {
            campaignId: "$campaignId",
            orderId: {
              $ifNull: ["$shopifyOrderId", "$eventData.transactionId"],
            },
            visitorId: "$visitorId",
            eventType: "$eventType",
          },
          amount: { $max: { $ifNull: ["$eventData.amount", 0] } },
          commissionStatus: { $first: "$commissionStatus" },
        },
      },
      {
        $group: {
          _id: {
            campaignId: "$_id.campaignId",
            eventType: "$_id.eventType",
          },
          count: { $sum: 1 },
          totalAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$_id.eventType", "conversion"] },
                    { $ne: ["$commissionStatus", "cancelled"] },
                  ],
                },
                "$amount",
                0,
              ],
            },
          },
        },
      },
    ]);

    const campaignIds = Array.from(
      new Set(campaignEvents.map((e) => e._id.campaignId).filter(Boolean)),
    );

    const campaigns = await Campaign.find(
      { _id: { $in: campaignIds } },
      { basics: 1, compensation: 1, brandId: 1 },
    ).lean();

    // Map brandId -> companyName
    const brandIds = Array.from(
      new Set(
        campaigns
          .map((c) => c?.brandId)
          .filter(Boolean)
          .map((id) => id.toString()),
      ),
    );

    const brandUsers = brandIds.length
      ? await User.find(
          { _id: { $in: brandIds } },
          { "brand.companyName": 1 },
        ).lean()
      : [];

    const brandInfo = new Map(
      brandUsers.map((u) => [
        u._id.toString(),
        u.brand?.companyName || "Unknown Brand",
      ]),
    );

    const campaignInfo = new Map(
      campaigns.map((c) => [
        c._id.toString(),
        {
          title: c.basics?.title || "Untitled Campaign",
          compensationType: c.compensation?.type || "unknown",
          commissionRate:
            c.compensation?.commission || c.compensation?.amount || 0,
          companyName: brandInfo.get(c.brandId?.toString()) || "Unknown Brand",
        },
      ]),
    );

    const campaignsAnalyticsMap = new Map();
    for (const e of campaignEvents) {
      const id = e._id.campaignId?.toString();
      if (!id) continue;
      if (!campaignsAnalyticsMap.has(id)) {
        const meta = campaignInfo.get(id) || {
          title: "Untitled Campaign",
          compensationType: "unknown",
          companyName: "Unknown Brand",
        };
        campaignsAnalyticsMap.set(id, {
          campaignId: id,
          campaignTitle: meta.title,
          brandCompany: meta.companyName,
          compensationType: meta.compensationType,
          totalClicks: 0,
          totalConversions: 0,
          financials: { ambassadorEarnings: 0, brandSpend: 0 },
        });
      }
      const item = campaignsAnalyticsMap.get(id);
      if (
        e._id.eventType === "click" ||
        (e._id.eventType === "conversion" && e._id.eventName === "click")
      ) {
        item.totalClicks += e.count;
        if (item.compensationType === "pay-per-click") {
          item.totalConversions += e.count;
        }
      } else if (e._id.eventType === "conversion") {
        item.totalConversions += e.count;
        // Financials are computed per-event below to respect VAT snapshots
      }
    }

    // Fetch conversion events with deduplication to prevent doubling bug
    const rawEventsAgg = await VisitorEvent.aggregate([
      {
        $match: {
          athleteId: mongoUser._id,
          ...dateFilter,
          eventType: "conversion",
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            orderId: {
              $ifNull: ["$shopifyOrderId", "$eventData.transactionId"],
            },
            athleteId: "$athleteId",
          },
          docId: { $first: "$_id" },
          createdAt: { $first: "$createdAt" },
          campaignId: { $first: "$campaignId" },
          eventData: { $first: "$eventData" },
          commissionStatus: { $first: "$commissionStatus" },
          refundAmount: { $max: { $ifNull: ["$refundAmount", 0] } },
          refundType: { $first: "$refundType" },
          refundedAt: { $first: "$refundedAt" },
          athleteVatCountry: { $first: "$athleteVatCountry" },
          athleteVatStatus: { $first: "$athleteVatStatus" },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    // Map aggregated results back to a usable format
    const rawEvents = rawEventsAgg.map((ev) => ({
      ...ev,
      _id: ev.docId,
    }));

    // Recompute financials per event using VAT snapshots
    for (const ev of rawEvents) {
      const campaignIdStr = ev.campaignId?.toString();
      if (!campaignIdStr) continue;
      if (!campaignsAnalyticsMap.has(campaignIdStr)) {
        const meta = campaignInfo.get(campaignIdStr) || {
          title: "Untitled Campaign",
          compensationType: "unknown",
          companyName: "Unknown Brand",
        };
        campaignsAnalyticsMap.set(campaignIdStr, {
          campaignId: campaignIdStr,
          campaignTitle: meta.title,
          brandCompany: meta.companyName,
          compensationType: meta.compensationType,
          totalClicks: 0,
          totalConversions: 0,
          financials: { ambassadorEarnings: 0, brandSpend: 0 },
        });
      }
      const item = campaignsAnalyticsMap.get(campaignIdStr);
      if (ev.commissionStatus === "cancelled") continue;
      const base = Number(ev?.eventData?.amount || 0);
      const multiplier = eventVatMultiplier(ev);
      const withVat = base * multiplier;
      item.financials.ambassadorEarnings += withVat;
      item.financials.brandSpend += withVat;
    }

    const campaignsAnalytics = Array.from(campaignsAnalyticsMap.values());

    const campaignsAnalyticsFormatted = campaignsAnalytics.map((c) => ({
      ...c,
      financials: {
        ...c.financials,
        ambassadorEarnings: Number(c.financials.ambassadorEarnings).toFixed(2),
        brandSpend: Number(c.financials.brandSpend).toFixed(2),
      },
    }));

    const overallEarnings = campaignsAnalyticsFormatted.reduce(
      (sum, c) => sum + parseFloat(c.financials.ambassadorEarnings),
      0,
    );

    const campaignTitleMap = new Map(
      campaigns.map((c) => [
        c._id.toString(),
        c.basics?.title || "Untitled Campaign",
      ]),
    );

    const records = rawEvents.map((ev) => {
      const amt = Number(ev?.eventData?.amount || 0);
      const withVat = amt * eventVatMultiplier(ev);
      return {
        id: ev._id.toString(),
        date: ev.createdAt,
        campaignId: ev.campaignId,
        campaignTitle:
          campaignTitleMap.get(ev.campaignId?.toString()) ||
          String(ev.campaignId || ""),
        eventName: ev?.eventData?.eventName || "conversion",
        saleAmount: ev.eventData?.originalSaleAmount || 0,
        amount: Number.isFinite(withVat) ? withVat : 0,
        entryType: withVat >= 0 ? "debit" : "credit",
        commissionStatus: ev.commissionStatus || "pending",
        transactionId: ev?.eventData?.transactionId || null,
        commissionRate:
          campaignInfo.get(ev.campaignId?.toString())?.commissionRate || 0,
        refundAmount: ev.refundAmount || 0,
        refundType: ev.refundType || null,
        refundedAt: ev.refundedAt || null,
      };
    });

    // Debit/Credit totals for ambassador
    const debitTotal = records
      .filter((r) => r.amount > 0 && r.commissionStatus !== "cancelled")
      .reduce((sum, r) => sum + r.amount, 0);
    const creditTotal = records
      .filter((r) => r.amount < 0 && r.commissionStatus !== "cancelled")
      .reduce((sum, r) => sum + Math.abs(r.amount), 0);

    const overallClicks = campaignsAnalytics.reduce(
      (sum, c) => sum + (c.totalClicks || 0),
      0,
    );
    const overallConversions = campaignsAnalytics.reduce(
      (sum, c) => sum + (c.totalConversions || 0),
      0,
    );

    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    const totalRecords = rawEvents.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const paginatedRecords = records.slice(skip, skip + limit);

    const payload = {
      clicks: overallClicks,
      conversions: overallConversions,
      earnings: Number(overallEarnings).toFixed(2),
      shares,
      campaigns: campaignsAnalyticsFormatted,
      debitTotal: Number(debitTotal).toFixed(2),
      creditTotal: Number(creditTotal).toFixed(2),
      records: paginatedRecords,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
      },
    };

    return NextResponse.json({ data: payload, success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in /api/earnings/sports-ambassador:", error.message);
    return NextResponse.json(
      { message: error.message || "Error fetching earnings" },
      { status: 500 },
    );
  }
}
