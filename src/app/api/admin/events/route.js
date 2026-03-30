import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import VisitorEvent from "@/models/VisitorEvent";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import CampaignShare from "@/models/CampaignShare";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Authentication
    const supabase = await createClient();
    const { data: userData, error: authError } = await supabase.auth.getUser();

    if (authError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // 1. Total platform metrics
    const totalMetrics = await getTotalMetrics();

    // 2. Ambassador-level metrics
    const ambassadorMetrics = await getAmbassadorMetrics();

    // 3. Brand-level metrics
    const brandMetrics = await getBrandMetrics();

    // 4. Campaign-level metrics
    const campaignMetrics = await getCampaignMetrics();

    return NextResponse.json({
      totals: totalMetrics,
      ambassadors: ambassadorMetrics,
      brands: brandMetrics,
      campaigns: campaignMetrics,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper functions

async function getTotalMetrics() {
  const [
    totalRevenueResult,
    clickRevenueResult,
    conversionRevenueResult,
    eventCounts,
    // Flat-fee shares aggregated with campaign to compute platform/ambassador amounts
    flatFeeSharesAgg,
    // Breakdown by compensation type from VisitorEvent joined to Campaign
    compBreakdown,
  ] = await Promise.all([
    // Total platform revenue
    VisitorEvent.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$eventData.platformFee" },
        },
      },
    ]),
    // Revenue from clicks
    VisitorEvent.aggregate([
      {
        $match: { eventType: "click" },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$eventData.platformFee" },
        },
      },
    ]),
    // Revenue from conversions
    VisitorEvent.aggregate([
      {
        $match: { eventType: "conversion" },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$eventData.platformFee" },
        },
      },
    ]),
    // Event type counts
    VisitorEvent.aggregate([
      {
        $group: {
          _id: {
            eventType: "$eventType",
            eventName: "$eventData.eventName",
          },
          count: { $sum: 1 },
        },
      },
    ]),
    // Flat-fee shares: count and compute earnings and platform fee from campaign.amount
    CampaignShare.aggregate([
      {
        $lookup: {
          from: "campaigns",
          localField: "campaignId",
          foreignField: "_id",
          as: "campaign",
        },
      },
      { $unwind: "$campaign" },
      { $match: { "campaign.compensation.type": "flat-fee" } },
      {
        $group: {
          _id: null,
          shareCount: { $sum: 1 },
          ambassadorEarnings: { $sum: { $ifNull: ["$campaign.compensation.amount", 0] } },
        },
      },
    ]),
    // VisitorEvent by compensation type (via campaign lookup)
    VisitorEvent.aggregate([
      {
        $lookup: {
          from: "campaigns",
          localField: "campaignId",
          foreignField: "_id",
          as: "campaign",
        },
      },
      { $unwind: "$campaign" },
      {
        $group: {
          _id: "$campaign.compensation.type",
          platformRevenue: { $sum: "$eventData.platformFee" },
          ambassadorPayout: { $sum: "$eventData.amount" },
          clicks: {
            $sum: {
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
          conversions: {
            $sum: {
              $cond: [
                {
                  $or: [
                    {
                      $and: [
                        { $eq: ["$campaign.compensation.type", "pay-per-click"] },
                        {
                          $or: [
                            { $eq: ["$eventType", "click"] },
                            { $eq: ["$eventData.eventName", "click"] },
                          ],
                        },
                      ],
                    },
                    {
                      $and: [
                        { $eq: ["$eventType", "conversion"] },
                        { $ne: ["$eventData.eventName", "click"] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  const eventCountMap = eventCounts.reduce((acc, curr) => {
    const type = curr._id.eventType;
    const name = curr._id.eventName;
    if (type === "click" || (type === "conversion" && name === "click")) {
      acc.click = (acc.click || 0) + curr.count;
    } else {
      acc[type] = (acc[type] || 0) + curr.count;
    }
    return acc;
  }, {});

  const flatFeeShareCount = flatFeeSharesAgg[0]?.shareCount || 0;
  const flatFeeAmbEarnings = flatFeeSharesAgg[0]?.ambassadorEarnings || 0;
  const flatFeePlatform = flatFeeAmbEarnings * 0.2;

  // Build per-type map from VisitorEvent and merge flat-fee shares
  const compMap = compBreakdown.reduce((acc, r) => {
    acc[r._id] = {
      platformRevenue: r.platformRevenue || 0,
      ambassadorPayout: r.ambassadorPayout || 0,
      clicks: r.clicks || 0,
      conversions: r.conversions || 0,
    };
    return acc;
  }, {});
  // Ensure keys exist
  for (const key of ["flat-fee", "pay-per-click", "pay-per-sale", "pay-per-lead"]) {
    if (!compMap[key]) compMap[key] = { platformRevenue: 0, ambassadorPayout: 0, clicks: 0, conversions: 0 };
  }
  // Merge flat-fee shares into flat-fee bucket
  compMap["flat-fee"].platformRevenue += flatFeePlatform;
  compMap["flat-fee"].ambassadorPayout += flatFeeAmbEarnings;
  compMap["flat-fee"].conversions += flatFeeShareCount;

  const totalConversionsFromEvents = Object.values(compMap).reduce(
    (sum, m) => sum + m.conversions,
    0
  );

  return {
    totalRevenue: (totalRevenueResult[0]?.totalRevenue || 0) + flatFeePlatform,
    clickRevenue: clickRevenueResult[0]?.revenue || 0,
    conversionRevenue:
      (conversionRevenueResult[0]?.revenue || 0) + flatFeePlatform,
    totalClicks: eventCountMap.click || 0,
    totalConversions: totalConversionsFromEvents,
    totalsByCompensation: compMap,
  };
}

async function getAmbassadorMetrics() {
  const ambassadorAggregation = await VisitorEvent.aggregate([
    {
      $group: {
        _id: "$athleteId",
        totalRevenue: { $sum: "$eventData.platformFee" },
        totalEarnings: { $sum: "$eventData.amount" },
        clickCount: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "click"] }, 1, 0],
          },
        },
        conversionCount: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "conversion"] }, 1, 0],
          },
        },
        brandsWorkedWith: { $addToSet: "$brandId" },
        campaignsParticipated: { $addToSet: "$campaignId" },
      },
    },
    {
      $sort: { totalRevenue: -1 },
    },
  ]);

  // Flat-fee shares per ambassador (join with campaign to get amount and brand)
  const flatFeeByAmbassador = await CampaignShare.aggregate([
    {
      $lookup: {
        from: "campaigns",
        localField: "campaignId",
        foreignField: "_id",
        as: "campaign",
      },
    },
    { $unwind: "$campaign" },
    { $match: { "campaign.compensation.type": "flat-fee" } },
    {
      $group: {
        _id: "$athleteId",
        shareCount: { $sum: 1 },
        ambassadorEarnings: { $sum: { $ifNull: ["$campaign.compensation.amount", 0] } },
        brandsWorkedWith: { $addToSet: "$campaign.brandId" },
        campaignsParticipated: { $addToSet: "$campaignId" },
      },
    },
  ]);

  const flatFeeMap = new Map(flatFeeByAmbassador.map((d) => [d._id?.toString(), d]));

  // Build map from VisitorEvent aggregation for quick merge
  const ambMap = new Map(ambassadorAggregation.map((a) => [a._id?.toString(), a]));

  // Merge: ensure ambassadors that only have flat-fee shares are included
  for (const [id, flat] of flatFeeMap.entries()) {
    if (!ambMap.has(id)) {
      ambMap.set(id, {
        _id: flat._id,
        totalRevenue: 0,
        totalEarnings: 0,
        clickCount: 0,
        conversionCount: 0,
        brandsWorkedWith: [],
        campaignsParticipated: [],
      });
    }
  }

  // Fetch ambassador details for merged set
  const ambassadorsWithDetails = await Promise.all(
    Array.from(ambMap.values()).map(async (ambassador) => {
      const user = await User.findById(ambassador._id).select(
        "athlete.name team.name influencer.name coach.name exAthlete.name paraAthlete.name"
      );

      const flat = flatFeeMap.get(ambassador._id?.toString());
      const flatEarnings = flat?.ambassadorEarnings || 0;
      const flatRevenue = flatEarnings * 0.2;

      return {
        id: ambassador._id,
        name:
          user?.athlete?.name ||
          user?.team?.name ||
          user?.influencer?.name ||
          user?.coach?.name ||
          user?.exAthlete?.name ||
          user?.paraAthlete?.name ||
          "Unknown",
        totalRevenue: (ambassador.totalRevenue || 0) + flatRevenue,
        totalEarnings: (ambassador.totalEarnings || 0) + flatEarnings,
        clickCount: ambassador.clickCount || 0,
        conversionCount: (ambassador.conversionCount || 0) + (flat?.shareCount || 0),
        brandsWorkedWith: new Set([...(ambassador.brandsWorkedWith || []), ...((flat?.brandsWorkedWith) || [])]).size,
        campaignsParticipated: new Set([...(ambassador.campaignsParticipated || []), ...((flat?.campaignsParticipated) || [])]).size,
      };
    })
  );

  return ambassadorsWithDetails;
}

async function getBrandMetrics() {
  const brandAggregation = await VisitorEvent.aggregate([
    {
      $group: {
        _id: "$brandId",
        totalRevenue: { $sum: "$eventData.platformFee" },
        totalPayout: { $sum: "$eventData.amount" },
        clickCount: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "click"] }, 1, 0],
          },
        },
        conversionCount: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "conversion"] }, 1, 0],
          },
        },
        ambassadorsWorkedWith: { $addToSet: "$athleteId" },
        campaignsRun: { $addToSet: "$campaignId" },
      },
    },
    {
      $sort: { totalRevenue: -1 },
    },
  ]);

  // Flat-fee shares per brand (via campaign)
  const flatFeeByBrand = await CampaignShare.aggregate([
    {
      $lookup: {
        from: "campaigns",
        localField: "campaignId",
        foreignField: "_id",
        as: "campaign",
      },
    },
    { $unwind: "$campaign" },
    { $match: { "campaign.compensation.type": "flat-fee" } },
    {
      $group: {
        _id: "$campaign.brandId",
        shareCount: { $sum: 1 },
        ambassadorEarnings: { $sum: { $ifNull: ["$campaign.compensation.amount", 0] } },
        ambassadorsWorkedWith: { $addToSet: "$athleteId" },
        campaignsRun: { $addToSet: "$campaignId" },
      },
    },
  ]);
  const flatBrandMap = new Map(flatFeeByBrand.map((d) => [d._id?.toString(), d]));

  // Build map and merge in brands that only have flat-fee shares
  const brandMap = new Map(brandAggregation.map((b) => [b._id?.toString(), b]));
  for (const [id, flat] of flatBrandMap.entries()) {
    if (!brandMap.has(id)) {
      brandMap.set(id, {
        _id: flat._id,
        totalRevenue: 0,
        totalPayout: 0,
        clickCount: 0,
        conversionCount: 0,
        ambassadorsWorkedWith: [],
        campaignsRun: [],
      });
    }
  }

  // Fetch brand details for merged set
  const brandsWithDetails = await Promise.all(
    Array.from(brandMap.values()).map(async (brand) => {
      const user = await User.findById(brand._id).select("brand.companyName");
      const flat = flatBrandMap.get(brand._id?.toString());
      const flatEarnings = flat?.ambassadorEarnings || 0;
      const flatPlatform = flatEarnings * 0.2;

      return {
        id: brand._id,
        name: user?.brand?.companyName || "Unknown",
        totalRevenue: (brand.totalRevenue || 0) + flatPlatform,
        totalPayout: (brand.totalPayout || 0) + flatEarnings,
        clickCount: brand.clickCount || 0,
        conversionCount: (brand.conversionCount || 0) + (flat?.shareCount || 0),
        ambassadorsWorkedWith: new Set([...(brand.ambassadorsWorkedWith || []), ...((flat?.ambassadorsWorkedWith) || [])]).size,
        campaignsRun: new Set([...(brand.campaignsRun || []), ...((flat?.campaignsRun) || [])]).size,
      };
    })
  );

  return brandsWithDetails;
}

async function getCampaignMetrics() {
  const campaignAggregation = await VisitorEvent.aggregate([
    {
      $group: {
        _id: "$campaignId",
        totalRevenue: { $sum: "$eventData.platformFee" },
        totalPayout: { $sum: "$eventData.amount" },
        clickCount: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "click"] }, 1, 0],
          },
        },
        conversionCount: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "conversion"] }, 1, 0],
          },
        },
        ambassadorsParticipated: { $addToSet: "$athleteId" },
        brandId: { $first: "$brandId" },
      },
    },
    {
      $sort: { totalRevenue: -1 },
    },
  ]);

  // Flat-fee shares per campaign (via campaign)
  const flatFeeByCampaign = await CampaignShare.aggregate([
    {
      $lookup: {
        from: "campaigns",
        localField: "campaignId",
        foreignField: "_id",
        as: "campaign",
      },
    },
    { $unwind: "$campaign" },
    { $match: { "campaign.compensation.type": "flat-fee" } },
    {
      $group: {
        _id: "$campaignId",
        shareCount: { $sum: 1 },
        ambassadorEarnings: { $sum: { $ifNull: ["$campaign.compensation.amount", 0] } },
        ambassadorsParticipated: { $addToSet: "$athleteId" },
        brandId: { $first: "$campaign.brandId" },
      },
    },
  ]);
  const flatCampaignMap = new Map(flatFeeByCampaign.map((d) => [d._id?.toString(), d]));

  // Merge in campaigns that only have flat-fee shares
  const campMap = new Map(campaignAggregation.map((c) => [c._id?.toString(), c]));
  for (const [id, flat] of flatCampaignMap.entries()) {
    if (!campMap.has(id)) {
      campMap.set(id, {
        _id: flat._id,
        totalRevenue: 0,
        totalPayout: 0,
        clickCount: 0,
        conversionCount: 0,
        ambassadorsParticipated: [],
        brandId: flat.brandId,
      });
    }
  }

  // Fetch campaign and brand details for merged set
  const campaignsWithDetails = await Promise.all(
    Array.from(campMap.values()).map(async (campaign) => {
      const [campaignDoc, brandDoc] = await Promise.all([
        Campaign.findById(campaign._id).select(
          "basics.title basics.description compensation.type"
        ),
        User.findById(campaign.brandId).select("brand.companyName"),
      ]);
      const flat = flatCampaignMap.get(campaign._id?.toString());
      const flatEarn = flat?.ambassadorEarnings || 0;
      const flatPlatform = flatEarn * 0.2;

      return {
        id: campaign._id,
        title: campaignDoc?.basics?.title || "Unknown Campaign",
        description: campaignDoc?.basics?.description || "",
        brandId: campaign.brandId,
        brandName: brandDoc?.brand?.companyName || "Unknown",
        totalRevenue: (campaign.totalRevenue || 0) + flatPlatform,
        totalPayout: (campaign.totalPayout || 0) + flatEarn,
        clickCount: campaign.clickCount || 0,
        conversionCount:
          (campaign.conversionCount || 0) + (flat?.shareCount || 0),
        ambassadorsParticipated: new Set([...(campaign.ambassadorsParticipated || []), ...((flat?.ambassadorsParticipated) || [])]).size,
      };
    })
  );

  return campaignsWithDetails;
}
