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
    const status = searchParams.get("status");
    const eventType = searchParams.get("eventType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    // Build query for invoices
    const query = {};
    if (brandId) query.brandId = brandId;
    if (campaignId) query.campaignId = campaignId;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // For event-based invoices only
    query.eventId = { $exists: true };

    const invoices = await Invoice.find(query)
      .populate({
        path: "eventId",
        populate: [
          { path: "campaignId", select: "name trackingId compensation" },
          { path: "athleteId", select: "firstName lastName email" },
          { path: "brandId", select: "firstName lastName email businessName" },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Invoice.countDocuments(query);

    // Filter by additional criteria if needed
    let filteredInvoices = invoices;
    if (athleteId || eventType) {
      filteredInvoices = invoices.filter(invoice => {
        if (athleteId && invoice.eventId?.athleteId?._id?.toString() !== athleteId) {
          return false;
        }
        if (eventType && invoice.eventId?.eventData?.eventName !== eventType) {
          return false;
        }
        return true;
      });
    }

    // Calculate summary statistics
    const summary = {
      total: totalCount,
      byStatus: {},
      byEventType: {},
      totalAmount: 0,
      totalPlatformFee: 0,
    };

    // Get summary data
    const summaryData = await Invoice.aggregate([
      { $match: query },
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
          totalAmount: { $sum: "$amount" },
          statusCounts: {
            $push: {
              status: "$status",
              amount: "$amount",
            },
          },
          eventTypeCounts: {
            $push: {
              eventType: "$event.eventData.eventName",
              amount: "$amount",
            },
          },
        },
      },
    ]);

    if (summaryData.length > 0) {
      const data = summaryData[0];
      summary.totalAmount = data.totalAmount;

      // Count by status
      data.statusCounts.forEach(item => {
        if (!summary.byStatus[item.status]) {
          summary.byStatus[item.status] = { count: 0, amount: 0 };
        }
        summary.byStatus[item.status].count++;
        summary.byStatus[item.status].amount += item.amount;
      });

      // Count by event type
      data.eventTypeCounts.forEach(item => {
        if (!summary.byEventType[item.eventType]) {
          summary.byEventType[item.eventType] = { count: 0, amount: 0 };
        }
        summary.byEventType[item.eventType].count++;
        summary.byEventType[item.eventType].amount += item.amount;
      });
    }

    return NextResponse.json({
      success: true,
      data: filteredInvoices,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
      summary,
    });

  } catch (error) {
    console.error("Error fetching event invoices:", error);
    return NextResponse.json(
      { message: error.message || "Error fetching invoices" },
      { status: 500 }
    );
  }
}

// POST endpoint for manual invoice generation
export async function POST(req) {
  try {
    await connectDB();
    const { eventIds, forceRegenerate = false } = await req.json();

    if (!eventIds || !Array.isArray(eventIds)) {
      return NextResponse.json(
        { message: "Event IDs array is required" },
        { status: 400 }
      );
    }

    const results = {
      total: eventIds.length,
      successful: 0,
      failed: 0,
      errors: [],
      invoices: [],
    };

    for (const eventId of eventIds) {
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/payments/generate-event-invoice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId,
            forceRegenerate,
          }),
        });

        if (response.ok) {
          const invoiceData = await response.json();
          results.successful++;
          results.invoices.push({
            eventId,
            invoiceId: invoiceData.invoice?.id,
            stripeInvoiceId: invoiceData.invoice?.stripeInvoiceId,
            amount: invoiceData.invoice?.amount,
          });
        } else {
          const errorData = await response.json();
          results.failed++;
          results.errors.push({
            eventId,
            error: errorData.message || 'Unknown error',
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          eventId,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      message: `Manual invoice generation completed. ${results.successful} successful, ${results.failed} failed.`,
      results,
    });

  } catch (error) {
    console.error("Error in manual invoice generation:", error);
    return NextResponse.json(
      { message: error.message || "Error in manual invoice generation" },
      { status: 500 }
    );
  }
}
