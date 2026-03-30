import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import VisitorEvent from "@/models/VisitorEvent";
import Campaign from "@/models/Campaign";
import CampaignShare from "@/models/CampaignShare";
import mongoose from "mongoose";
import ExcelJS from "exceljs";

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

    let query;
    if (user.user_metadata?.inviter_email) {
      const ambassadorId = await User.findOne({ email: user.user_metadata.inviter_email });
      if (!ambassadorId) {
        return NextResponse.json({ message: "Ambassador not found" }, { status: 404 });
      }
      query = { supabaseId: ambassadorId.supabaseId, role: "sports-ambassador" };
    } else {
      query = { supabaseId: user.id, role: "sports-ambassador" };
    }

    const mongoUser = await User.findOne(query);
    if (!mongoUser) {
      return NextResponse.json(
        { message: "Forbidden: Only sports ambassadors can export" },
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
      startDate && endDate ? { createdAt: { $gte: startDate, $lte: endDate } } : {};

    const campaignEvents = await VisitorEvent.aggregate([
      { $match: { athleteId: new mongoose.Types.ObjectId(mongoUser._id), ...dateFilter } },
      {
        $group: {
          _id: { campaignId: "$campaignId", visitorId: "$visitorId", eventType: "$eventType" },
          totalAmount: {
            $sum: {
              $cond: [
                { $eq: ["$eventType", "conversion"] },
                { $ifNull: ["$eventData.amount", 0] },
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
        },
      },
    ]);

    const sharesAgg = await CampaignShare.aggregate([
      {
        $match: {
          athleteId: new mongoose.Types.ObjectId(mongoUser._id),
          ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
        },
      },
      { $group: { _id: { campaignId: "$campaignId" }, count: { $sum: 1 } } },
    ]);

    const campaignIds = Array.from(
      new Set([
        ...campaignEvents.map((e) => e._id.campaignId).filter(Boolean),
        ...sharesAgg.map((s) => s._id.campaignId).filter(Boolean),
      ])
    );
    const campaigns = await Campaign.find(
      { _id: { $in: campaignIds } },
      { basics: 1, compensation: 1 }
    ).lean();

    const info = new Map(
      campaigns.map((c) => [
        c._id.toString(),
        {
          title: c.basics?.title || "Untitled Campaign",
          compensationType: c.compensation?.type || "unknown",
          perClickAmount: parseFloat(c.compensation?.amount) || 0,
        },
      ])
    );

    const map = new Map();
    for (const e of campaignEvents) {
      const id = e._id.campaignId?.toString();
      if (!id) continue;
      if (!map.has(id)) {
        const meta = info.get(id) || { title: "Untitled Campaign", compensationType: "unknown", perClickAmount: 0 };
        map.set(id, {
          campaignId: id,
          campaignTitle: meta.title,
          compensationType: meta.compensationType,
          clicks: 0,
          conversions: 0,
          ambassadorEarnings: 0,
          brandSpend: 0,
        });
      }
      const item = map.get(id);
      if (e._id.eventType === "click") item.clicks += e.count;
      if (e._id.eventType === "conversion") {
        item.conversions += e.count;
        item.ambassadorEarnings += e.totalAmount || 0;
        item.brandSpend += e.totalAmount || 0;
      }
    }

    const sharesByCampaign = new Map(sharesAgg.map((s) => [s._id.campaignId.toString(), s.count]));
    for (const [id, meta] of info.entries()) {
      const isFlat = meta.compensationType === "flat-fee";
      const shareCount = sharesByCampaign.get(id) || 0;
      if (isFlat && shareCount > 0 && !map.has(id)) {
        map.set(id, {
          campaignId: id,
          campaignTitle: meta.title,
          compensationType: meta.compensationType,
          clicks: 0,
          conversions: 0,
          ambassadorEarnings: 0,
          brandSpend: 0,
        });
      }
      if (isFlat && map.has(id)) {
        const item = map.get(id);
        item.conversions = shareCount;
        const perShare = meta.perClickAmount || 0;
        const ambEarn = shareCount * perShare;
        item.ambassadorEarnings = ambEarn;
        item.brandSpend = ambEarn;
      }
    }

    const rows = Array.from(map.values()).map((c) => {
      if (c.compensationType === "pay-per-click") {
        const perClick = info.get(c.campaignId)?.perClickAmount || 0;
        const ppc = (c.clicks || 0) * perClick;
        c.ambassadorEarnings += ppc;
        c.brandSpend += ppc;
        c.conversions = c.clicks;
      }
      return {
        campaignId: c.campaignId,
        campaignTitle: c.campaignTitle,
        compensationType: c.compensationType,
        clicks: c.clicks,
        conversions: c.conversions,
        ambassadorEarnings: Number(c.ambassadorEarnings),
        brandSpend: Number(c.brandSpend),
      };
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Campaigns");

    if (rows.length > 0) {
      worksheet.columns = Object.keys(rows[0]).map((key) => ({
        header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1"),
        key: key,
        width: 20,
      }));
      worksheet.addRows(rows);
    }

    const buf = await workbook.xlsx.writeBuffer();

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=ambassador_campaigns_${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`,
      },
    });
  } catch (error) {
    console.error("Export sports ambassador XLSX error:", error);
    return NextResponse.json({ message: error.message || "Export error" }, { status: 500 });
  }
}
