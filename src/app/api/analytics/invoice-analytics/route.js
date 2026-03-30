import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
import VisitorEvent from "@/models/VisitorEvent";
import Campaign from "@/models/Campaign";
import User from "@/models/User";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    
    const brandId = searchParams.get("brandId");
    const campaignId = searchParams.get("campaignId");
    const athleteId = searchParams.get("athleteId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const groupBy = searchParams.get("groupBy") || "day"; // day, week, month
    const includeEvents = searchParams.get("includeEvents") === "true";

    // Build base query
    const baseQuery = {};
    if (brandId) baseQuery.brandId = brandId;
    if (campaignId) baseQuery.campaignId = campaignId;

    if (startDate || endDate) {
      baseQuery.createdAt = {};
      if (startDate) baseQuery.createdAt.$gte = new Date(startDate);
      if (endDate) baseQuery.createdAt.$lte = new Date(endDate);
    }

    // Only event-based invoices
    baseQuery.eventId = { $exists: true };

    // Get overall statistics
    const overallStats = await Invoice.aggregate([
      { $match: baseQuery },
      {
        $lookup: {
          from: "visitorevents",
          localField: "eventId",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: "$event" },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          avgAmount: { $avg: "$amount" },
          minAmount: { $min: "$amount" },
          maxAmount: { $max: "$amount" },
          totalClicks: { $sum: "$metrics.clicks" },
          totalConversions: { $sum: "$metrics.conversions" },
          statusBreakdown: {
            $push: {
              status: "$status",
              amount: "$amount",
            },
          },
          eventTypeBreakdown: {
            $push: {
              eventType: "$event.eventData.eventName",
              amount: "$amount",
            },
          },
          compensationTypeBreakdown: {
            $push: {
              compensationType: "$event.eventData.compensationType",
              amount: "$amount",
            },
          },
        },
      },
    ]);

    // Process status breakdown
    const statusStats = {};
    const eventTypeStats = {};
    const compensationTypeStats = {};

    if (overallStats.length > 0) {
      const stats = overallStats[0];
      
      // Group by status
      stats.statusBreakdown.forEach(item => {
        if (!statusStats[item.status]) {
          statusStats[item.status] = { count: 0, amount: 0 };
        }
        statusStats[item.status].count++;
        statusStats[item.status].amount += item.amount;
      });

      // Group by event type
      stats.eventTypeBreakdown.forEach(item => {
        if (!eventTypeStats[item.eventType]) {
          eventTypeStats[item.eventType] = { count: 0, amount: 0 };
        }
        eventTypeStats[item.eventType].count++;
        eventTypeStats[item.eventType].amount += item.amount;
      });

      // Group by compensation type
      stats.compensationTypeBreakdown.forEach(item => {
        if (item.compensationType) {
          if (!compensationTypeStats[item.compensationType]) {
            compensationTypeStats[item.compensationType] = { count: 0, amount: 0 };
          }
          compensationTypeStats[item.compensationType].count++;
          compensationTypeStats[item.compensationType].amount += item.amount;
        }
      });
    }

    // Get time-series data
    const dateGroupFormat = {
      day: {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
      },
      week: {
        $dateToString: { format: "%Y-W%V", date: "$createdAt" }
      },
      month: {
        $dateToString: { format: "%Y-%m", date: "$createdAt" }
      },
    };

    const timeSeriesData = await Invoice.aggregate([
      { $match: baseQuery },
      {
        $lookup: {
          from: "visitorevents",
          localField: "eventId",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: "$event" },
      {
        $group: {
          _id: dateGroupFormat[groupBy],
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
          clicks: { $sum: "$metrics.clicks" },
          conversions: { $sum: "$metrics.conversions" },
          eventTypes: {
            $push: "$event.eventData.eventName",
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get top performers
    const topCampaigns = await Invoice.aggregate([
      { $match: baseQuery },
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
          _id: "$campaignId",
          campaignName: { $first: "$campaign.name" },
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          avgAmount: { $avg: "$amount" },
        },
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 },
    ]);

    const topAmbassadors = await Invoice.aggregate([
      { $match: baseQuery },
      {
        $lookup: {
          from: "visitorevents",
          localField: "eventId",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: "$event" },
      {
        $lookup: {
          from: "users",
          localField: "event.athleteId",
          foreignField: "_id",
          as: "ambassador",
        },
      },
      { $unwind: "$ambassador" },
      {
        $group: {
          _id: "$event.athleteId",
          ambassadorName: {
            $first: {
              $concat: ["$ambassador.firstName", " ", "$ambassador.lastName"],
            },
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          avgAmount: { $avg: "$amount" },
        },
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 },
    ]);

    // Get recent invoices if requested
    let recentInvoices = [];
    if (includeEvents) {
      recentInvoices = await Invoice.find(baseQuery)
        .populate({
          path: "eventId",
          populate: [
            { path: "campaignId", select: "name trackingId" },
            { path: "athleteId", select: "firstName lastName email" },
          ],
        })
        .sort({ createdAt: -1 })
        .limit(20);
    }

    // Calculate conversion rates
    const conversionMetrics = await VisitorEvent.aggregate([
      {
        $match: {
          ...(brandId && { brandId }),
          ...(campaignId && { campaignId }),
          ...(startDate || endDate) && {
            createdAt: {
              ...(startDate && { $gte: new Date(startDate) }),
              ...(endDate && { $lte: new Date(endDate) }),
            },
          },
        },
      },
      {
        $group: {
          _id: "$eventData.eventName",
          totalEvents: { $sum: 1 },
          invoicedEvents: {
            $sum: {
              $cond: [{ $ifNull: ["$invoicedAt", false] }, 1, 0],
            },
          },
          totalAmount: { $sum: "$eventData.amount" },
          totalPlatformFee: { $sum: "$eventData.platformFee" },
        },
      },
    ]);

    const response = {
      summary: overallStats[0] || {
        totalInvoices: 0,
        totalAmount: 0,
        avgAmount: 0,
        minAmount: 0,
        maxAmount: 0,
        totalClicks: 0,
        totalConversions: 0,
      },
      breakdowns: {
        byStatus: statusStats,
        byEventType: eventTypeStats,
        byCompensationType: compensationTypeStats,
      },
      timeSeries: timeSeriesData,
      topPerformers: {
        campaigns: topCampaigns,
        ambassadors: topAmbassadors,
      },
      conversionMetrics,
      ...(includeEvents && { recentInvoices }),
      metadata: {
        query: baseQuery,
        groupBy,
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json({
      success: true,
      data: response,
    });

  } catch (error) {
    console.error("Error in invoice analytics:", error);
    return NextResponse.json(
      { message: error.message || "Error generating analytics" },
      { status: 500 }
    );
  }
}
