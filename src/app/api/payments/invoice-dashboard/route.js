import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { InvoiceService } from "@/lib/invoiceService";
import Invoice from "@/models/Invoice";
import VisitorEvent from "@/models/VisitorEvent";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    
    const brandId = searchParams.get("brandId");
    const campaignId = searchParams.get("campaignId");
    const athleteId = searchParams.get("athleteId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build filters for the service
    const filters = {};
    if (brandId) filters.brandId = brandId;
    if (campaignId) filters.campaignId = campaignId;
    if (athleteId) filters.athleteId = athleteId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    // Get uninvoiced events summary
    const uninvoicedSummary = await InvoiceService.getInvoicingSummary(filters);

    // Get recent invoices
    const recentInvoices = await Invoice.find({
      ...(brandId && { brandId }),
      ...(campaignId && { campaignId }),
      eventId: { $exists: true }, // Only event-based invoices
      ...(startDate || endDate) && {
        createdAt: {
          ...(startDate && { $gte: new Date(startDate) }),
          ...(endDate && { $lte: new Date(endDate) }),
        },
      },
    })
    .populate({
      path: "eventId",
      populate: [
        { path: "campaignId", select: "name trackingId compensation" },
        { path: "athleteId", select: "firstName lastName email" },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(10);

    // Get invoice status summary
    const invoiceStatusSummary = await Invoice.aggregate([
      {
        $match: {
          ...(brandId && { brandId }),
          ...(campaignId && { campaignId }),
          eventId: { $exists: true },
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
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    // Get failed/problematic events
    const problematicEvents = await VisitorEvent.find({
      ...(brandId && { brandId }),
      ...(campaignId && { campaignId }),
      ...(athleteId && { athleteId }),
      $or: [
        // Events that should be invoiced but aren't
        {
          invoicedAt: { $exists: false },
          "eventData.amount": { $ne: 0 },
          "eventData.eventName": { $ne: "refund" },
          createdAt: { $lt: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // Older than 2 hours
        },
        // Events with cancelled invoices
        {
          invoiceCancelledAt: { $exists: true },
        },
      ],
    })
    .populate("campaignId", "name trackingId")
    .populate("athleteId", "firstName lastName email")
    .sort({ createdAt: -1 })
    .limit(20);

    // Get processing queue status
    const queueStatus = {
      pendingInvoiceGeneration: uninvoicedSummary.totalUninvoiced,
      recentlyProcessed: await Invoice.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
        eventId: { $exists: true },
      }),
      failedInLastHour: problematicEvents.filter(
        event => !event.invoicedAt && 
        event.createdAt < new Date(Date.now() - 60 * 60 * 1000)
      ).length,
    };

    // Get revenue metrics
    const revenueMetrics = await Invoice.aggregate([
      {
        $match: {
          ...(brandId && { brandId }),
          eventId: { $exists: true },
          status: { $in: ["paid", "open"] }, // Only count active invoices
          ...(startDate || endDate) && {
            createdAt: {
              ...(startDate && { $gte: new Date(startDate) }),
              ...(endDate && { $lte: new Date(endDate) }),
            },
          },
        },
      },
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
          totalRevenue: { $sum: "$amount" },
          totalAmbassadorCommissions: { $sum: "$event.eventData.amount" },
          totalPlatformFees: { $sum: "$event.eventData.platformFee" },
          averageInvoiceAmount: { $avg: "$amount" },
          totalInvoices: { $sum: 1 },
        },
      },
    ]);

    const response = {
      summary: {
        uninvoiced: uninvoicedSummary,
        invoiceStatus: invoiceStatusSummary.reduce((acc, item) => {
          acc[item._id] = {
            count: item.count,
            totalAmount: item.totalAmount,
          };
          return acc;
        }, {}),
        queue: queueStatus,
        revenue: revenueMetrics[0] || {
          totalRevenue: 0,
          totalAmbassadorCommissions: 0,
          totalPlatformFees: 0,
          averageInvoiceAmount: 0,
          totalInvoices: 0,
        },
      },
      data: {
        recentInvoices,
        problematicEvents,
      },
      actions: {
        canProcessUninvoiced: uninvoicedSummary.totalUninvoiced > 0,
        suggestedBatchSize: Math.min(uninvoicedSummary.totalUninvoiced, 50),
        nextCronRun: "Every hour", // You can make this dynamic based on your cron schedule
      },
      metadata: {
        filters,
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json({
      success: true,
      data: response,
    });

  } catch (error) {
    console.error("Error in invoice dashboard:", error);
    return NextResponse.json(
      { message: error.message || "Error loading dashboard" },
      { status: 500 }
    );
  }
}

// POST endpoint for dashboard actions
export async function POST(req) {
  try {
    await connectDB();
    const { action, ...params } = await req.json();

    switch (action) {
      case "process_uninvoiced":
        return await processUninvoicedEvents(params);
      
      case "retry_failed":
        return await retryFailedEvents(params);
      
      case "bulk_cancel":
        return await bulkCancelInvoices(params);
      
      default:
        return NextResponse.json(
          { message: "Invalid action" },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error("Error in dashboard action:", error);
    return NextResponse.json(
      { message: error.message || "Error processing action" },
      { status: 500 }
    );
  }
}

async function processUninvoicedEvents({ limit = 50, ...filters }) {
  const uninvoicedEvents = await InvoiceService.getUninvoicedEvents({
    ...filters,
    limit,
  });

  const results = {
    total: uninvoicedEvents.length,
    successful: 0,
    failed: 0,
    errors: [],
  };

  for (const event of uninvoicedEvents) {
    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/payments/generate-event-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event._id.toString(),
        }),
      });

      if (response.ok) {
        results.successful++;
      } else {
        const errorData = await response.json();
        results.failed++;
        results.errors.push({
          eventId: event._id,
          error: errorData.message,
        });
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        eventId: event._id,
        error: error.message,
      });
    }
  }

  return NextResponse.json({
    message: `Processed ${results.total} events: ${results.successful} successful, ${results.failed} failed`,
    results,
  });
}

async function retryFailedEvents({ eventIds }) {
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
          forceRegenerate: true,
        }),
      });

      if (response.ok) {
        results.successful++;
      } else {
        const errorData = await response.json();
        results.failed++;
        results.errors.push({
          eventId,
          error: errorData.message,
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
    message: `Retried ${results.total} events: ${results.successful} successful, ${results.failed} failed`,
    results,
  });
}

async function bulkCancelInvoices({ eventIds, reason = "Bulk cancellation" }) {
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
  };

  for (const eventId of eventIds) {
    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/payments/cancel-event-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          reason,
        }),
      });

      if (response.ok) {
        results.successful++;
      } else {
        const errorData = await response.json();
        results.failed++;
        results.errors.push({
          eventId,
          error: errorData.message,
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
    message: `Cancelled ${results.total} invoices: ${results.successful} successful, ${results.failed} failed`,
    results,
  });
}
