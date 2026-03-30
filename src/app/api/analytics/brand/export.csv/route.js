import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import VisitorEvent from "@/models/VisitorEvent";
import Campaign from "@/models/Campaign";
import CampaignShare from "@/models/CampaignShare";
import mongoose from "mongoose";

function toCSV(rows) {
  if (!rows || !rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => esc(r[h])).join(","));
  }
  return lines.join("\n");
}

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

    const mongoUser = await User.findOne({
      supabaseId: user.id,
      role: "brand",
    });
    if (!mongoUser) {
      return NextResponse.json(
        { message: "Forbidden: Only brands can export" },
        { status: 403 }
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

    // Preload maps
    const campaignsWithCompensation = await Campaign.find(
      { brandId: mongoUser._id },
      { _id: 1, "compensation.type": 1, "basics.title": 1 }
    );
    const campaignCompensationMap = new Map(
      campaignsWithCompensation.map((camp) => [
        camp._id.toString(),
        {
          type: camp.compensation?.type || "unknown",
          title: camp.basics?.title || "Untitled Campaign",
        },
      ])
    );
    const validTypes = [
      "pay-per-sale",
      "pay-per-click",
      "pay-per-lead",
      "flat-fee",
    ];
    const validCampaignIds = Array.from(campaignCompensationMap.entries())
      .filter(([_, { type }]) => validTypes.includes(type))
      .map(([id]) => new mongoose.Types.ObjectId(id));

    const events = await VisitorEvent.aggregate([
      {
        $match: {
          brandId: new mongoose.Types.ObjectId(mongoUser._id),
          campaignId: { $in: validCampaignIds },
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: {
            campaignId: "$campaignId",
            visitorId: "$visitorId",
            eventType: "$eventType",
          },
          totalAmount: {
            $sum: {
              $cond: [
                { $eq: ["$eventType", "conversion"] },
                { $ifNull: ["$eventData.amount", 0] },
                0,
              ],
            },
          },
          platformFee: {
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
          _id: { campaignId: "$_id.campaignId", eventType: "$_id.eventType" },
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
          totalPlatformFee: { $sum: "$platformFee" },
        },
      },
    ]);

    const sharesAgg = await CampaignShare.aggregate([
      {
        $match: {
          campaignId: { $in: validCampaignIds },
          ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
        },
      },
      { $group: { _id: { campaignId: "$campaignId" }, count: { $sum: 1 } } },
    ]);

    const campaigns = await Campaign.find({ brandId: mongoUser._id }).sort({
      updatedAt: -1,
    });

    const rows = campaigns
      .filter((c) => validTypes.includes(c.compensation?.type))
      .map((campaign) => {
        const campaignEvents = events.filter(
          (e) => e._id.campaignId?.toString() === campaign._id.toString()
        );
        const totalClicks = campaignEvents
          .filter((e) => e._id.eventType === "click")
          .reduce((s, e) => s + e.count, 0);
        let totalConversions = campaignEvents
          .filter((e) => e._id.eventType === "conversion")
          .reduce((s, e) => s + e.count, 0);

        if (campaign.compensation?.type === "pay-per-click") {
          totalConversions = totalClicks;
        }

        let conversionAmbassadorEarnings = campaignEvents
          .filter((e) => e._id.eventType === "conversion")
          .reduce((s, e) => s + e.totalAmount, 0);
        let conversionPlatformEarnings = campaignEvents
          .filter((e) => e._id.eventType === "conversion")
          .reduce((s, e) => s + e.totalPlatformFee, 0);

        if (campaign.compensation?.type === "flat-fee") {
          const sharesForCampaign = sharesAgg.filter(
            (s) => s._id.campaignId?.toString() === campaign._id.toString()
          );
          const sharesTotal = sharesForCampaign.reduce(
            (sum, s) => sum + s.count,
            0
          );
          totalConversions = sharesTotal;
          conversionAmbassadorEarnings =
            sharesTotal * (parseFloat(campaign.compensation?.amount) || 0);
          conversionPlatformEarnings = conversionAmbassadorEarnings * 0.2; // 20% for flat-fee
        }

        let ambassadorEarningsTotal = conversionAmbassadorEarnings;
        let platformEarnings = conversionPlatformEarnings;

        if (campaign.compensation?.type === "pay-per-click") {
          const perClick = parseFloat(campaign.compensation?.amount) || 0;
          const ppcEarnings = totalClicks * perClick;
          const ppcPlatform = ppcEarnings * 0.2; // 20% for pay-per-click
          ambassadorEarningsTotal += ppcEarnings;
          platformEarnings += ppcPlatform;
        }

        const brandSpend = ambassadorEarningsTotal + platformEarnings;
        const stripeFees =
          conversionAmbassadorEarnings * 0.029 +
          conversionPlatformEarnings * 0.029 +
          totalConversions * 0.3;

        const revenue = ambassadorEarningsTotal;
        const totalCost =
          ambassadorEarningsTotal + platformEarnings + stripeFees;
        const clicks = totalClicks;
        const conversions = totalConversions;
        const conversionRate = clicks > 0 ? conversions / clicks : 0;
        const aov = conversions > 0 ? revenue / conversions : 0;
        const epc = clicks > 0 ? revenue / clicks : 0;
        const cpa = conversions > 0 ? totalCost / conversions : 0;
        const roas = totalCost > 0 ? revenue / totalCost : 0;

        return {
          campaignId: campaign._id.toString(),
          campaignTitle: campaign.basics?.title || "Untitled Campaign",
          compensationType: campaign.compensation?.type || "unknown",
          clicks,
          conversions,
          revenue: revenue.toFixed(2),
          totalCost: totalCost.toFixed(2),
          aov: aov.toFixed(2),
          epc: epc.toFixed(4),
          cpa: cpa.toFixed(2),
          roas: Number(roas.toFixed(4)),
          platformEarnings: platformEarnings.toFixed(2),
          ambassadorEarnings: ambassadorEarningsTotal.toFixed(2),
          brandSpend: brandSpend.toFixed(2),
          stripeFees: stripeFees.toFixed(2),
        };
      });

    const csv = toCSV(rows);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=brand_campaigns_${new Date()
          .toISOString()
          .slice(0, 10)}.csv`,
      },
    });
  } catch (error) {
    console.error("Export brand CSV error:", error);
    return NextResponse.json(
      { message: error.message || "Export error" },
      { status: 500 }
    );
  }
}
