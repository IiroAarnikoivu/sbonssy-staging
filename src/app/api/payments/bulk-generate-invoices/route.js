import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VisitorEvent from "@/models/VisitorEvent";

export async function POST(req) {
  try {
    await connectDB();
    const { 
      campaignId, 
      brandId, 
      athleteId, 
      eventType, 
      startDate, 
      endDate,
      limit = 100,
      skipZeroAmount = true 
    } = await req.json();

    // Build query for uninvoiced events
    const query = {
      invoicedAt: { $exists: false },
    };

    if (campaignId) query.campaignId = campaignId;
    if (brandId) query.brandId = brandId;
    if (athleteId) query.athleteId = athleteId;
    if (eventType) query.eventType = eventType;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Skip zero-amount events if requested
    if (skipZeroAmount) {
      query.$or = [
        { "eventData.amount": { $gt: 0 } },
        { "eventData.platformFee": { $gt: 0 } }
      ];
    }

    const uninvoicedEvents = await VisitorEvent.find(query)
      .limit(limit)
      .sort({ createdAt: 1 });

    const results = {
      total: uninvoicedEvents.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      invoices: [],
    };

    // Process each event
    for (const event of uninvoicedEvents) {
      results.processed++;
      
      try {
        // Call the individual invoice generation endpoint
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
          const invoiceData = await response.json();
          results.successful++;
          results.invoices.push({
            eventId: event._id,
            invoiceId: invoiceData.invoice?.id,
            stripeInvoiceId: invoiceData.invoice?.stripeInvoiceId,
            amount: invoiceData.invoice?.amount,
          });
        } else {
          const errorData = await response.json();
          results.failed++;
          results.errors.push({
            eventId: event._id,
            error: errorData.message || 'Unknown error',
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
      message: `Bulk invoice generation completed. ${results.successful} successful, ${results.failed} failed.`,
      results,
    });

  } catch (error) {
    console.error("Error in bulk invoice generation:", error);
    return NextResponse.json(
      { message: error.message || "Error in bulk invoice generation" },
      { status: 500 }
    );
  }
}

// GET endpoint to get uninvoiced events count
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");
    const brandId = searchParams.get("brandId");
    const athleteId = searchParams.get("athleteId");
    const eventType = searchParams.get("eventType");
    const skipZeroAmount = searchParams.get("skipZeroAmount") !== "false";

    const query = {
      invoicedAt: { $exists: false },
    };

    if (campaignId) query.campaignId = campaignId;
    if (brandId) query.brandId = brandId;
    if (athleteId) query.athleteId = athleteId;
    if (eventType) query.eventType = eventType;

    if (skipZeroAmount) {
      query.$or = [
        { "eventData.amount": { $gt: 0 } },
        { "eventData.platformFee": { $gt: 0 } }
      ];
    }

    const count = await VisitorEvent.countDocuments(query);
    
    // Get summary by event type
    const summary = await VisitorEvent.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$eventData.eventName",
          count: { $sum: 1 },
          totalAmount: { $sum: "$eventData.amount" },
          totalPlatformFee: { $sum: "$eventData.platformFee" },
        },
      },
    ]);

    return NextResponse.json({
      totalUninvoiced: count,
      summary,
    });

  } catch (error) {
    console.error("Error getting uninvoiced events:", error);
    return NextResponse.json(
      { message: error.message || "Error getting uninvoiced events" },
      { status: 500 }
    );
  }
}
