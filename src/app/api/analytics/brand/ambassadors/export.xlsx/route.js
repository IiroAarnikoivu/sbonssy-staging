import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import VisitorEvent from "@/models/VisitorEvent";
import Campaign from "@/models/Campaign";
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

    const brandUser = await User.findOne({ supabaseId: user.id, role: "brand" });
    if (!brandUser) {
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
      startDate && endDate ? { createdAt: { $gte: startDate, $lte: endDate } } : {};

    // Pull brand campaigns for title lookup
    const brandCampaigns = await Campaign.find(
      { brandId: brandUser._id },
      { _id: 1, "basics.title": 1, "compensation.type": 1 }
    );
    const campaignMeta = new Map(
      brandCampaigns.map((c) => [
        c._id.toString(),
        {
          title: c.basics?.title || "Untitled Campaign",
          compensationType: c.compensation?.type || "unknown",
        },
      ])
    );

    // Aggregate clicks and conversions per campaign + ambassador
    const rowsAgg = await VisitorEvent.aggregate([
      {
        $match: {
          brandId: new mongoose.Types.ObjectId(brandUser._id),
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: {
            campaignId: "$campaignId",
            athleteId: "$athleteId",
            trackingKey: "$trackingKey",
            eventType: "$eventType",
          },
          convAmount: {
            $sum: {
              $cond: [
                { $eq: ["$eventType", "conversion"] },
                { $ifNull: ["$eventData.amount", 0] },
                0,
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: {
            campaignId: "$_id.campaignId",
            athleteId: "$_id.athleteId",
            trackingKey: "$_id.trackingKey",
          },
          clicks: {
            $sum: { $cond: [{ $eq: ["$_id.eventType", "click"] }, "$count", 0] },
          },
          conversions: {
            $sum: { $cond: [{ $eq: ["$_id.eventType", "conversion"] }, "$count", 0] },
          },
          ambassadorEarnings: {
            $sum: { $cond: [{ $eq: ["$_id.eventType", "conversion"] }, "$convAmount", 0] },
          },
        },
      },
    ]);

    const ambassadorIds = Array.from(
      new Set(rowsAgg.map((r) => r._id.athleteId).filter(Boolean).map((id) => id.toString()))
    );
    const ambassadors = await User.find(
      { _id: { $in: ambassadorIds } },
      { _id: 1, name: 1, firstName: 1, lastName: 1, email: 1 }
    ).lean();
    const ambassadorName = new Map(
      ambassadors.map((a) => [
        a._id.toString(),
        a.name || [a.firstName, a.lastName].filter(Boolean).join(" ") || a.email || "Unknown",
      ])
    );

    const rows = rowsAgg
      .filter((r) => r._id.campaignId && r._id.athleteId)
      .map((r) => {
        const campaignIdStr = r._id.campaignId?.toString();
        const meta = campaignMeta.get(campaignIdStr) || {
          title: "Untitled Campaign",
          compensationType: "unknown",
        };
        const clicks = r.clicks || 0;
        let conversions = r.conversions || 0;

        if (meta.compensationType === "pay-per-click") {
          conversions = clicks;
        }

        return {
          campaignId: campaignIdStr,
          campaignTitle: meta.title,
          ambassadorName:
            ambassadorName.get(r._id.athleteId?.toString()) || "Unknown",
          trackingKey: r._id.trackingKey || "",
          clicks,
          conversions,
          ambassadorEarnings: Number(r.ambassadorEarnings || 0),
        };
      });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Traffic by Ambassador");

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
        "Content-Disposition": `attachment; filename=brand_ambassadors_${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`,
      },
    });
  } catch (error) {
    console.error("Export brand ambassadors XLSX error:", error);
    return NextResponse.json({ message: error.message || "Export error" }, { status: 500 });
  }
}
