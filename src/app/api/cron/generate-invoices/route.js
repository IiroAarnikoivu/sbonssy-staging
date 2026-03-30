import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VisitorEvent from "@/models/VisitorEvent";

export async function GET(req) {
  try {
    // Verify cron authorization (you can add your own auth logic here)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "your-cron-secret";

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Find uninvoiced events older than 1 hour (to allow for potential corrections)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const uninvoicedEvents = await VisitorEvent.find({
      invoicedAt: { $exists: false },
      createdAt: { $lte: oneHourAgo },
      $or: [
        { "eventData.amount": { $gt: 0 } },
        { "eventData.platformFee": { $gt: 0 } },
      ],
    })
      .limit(50) // Process in batches
      .sort({ createdAt: 1 });

    const results = {
      total: uninvoicedEvents.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (const event of uninvoicedEvents) {
      results.processed++;

      try {
        const response = await fetch(
          `${
            process.env.NEXTAUTH_URL || "http://localhost:3000"
          }/api/payments/generate-event-invoice`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              eventId: event._id.toString(),
            }),
          }
        );

        if (response.ok) {
          results.successful++;
        } else {
          const errorData = await response.json();
          results.failed++;
          results.errors.push({
            eventId: event._id,
            error: errorData.message || "Unknown error",
          });
          console.error(
            `Failed to generate invoice for event ${event._id}:`,
            errorData.message
          );
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          eventId: event._id,
          error: error.message,
        });
        console.error(`Error processing event ${event._id}:`, error.message);
      }
    }

    return NextResponse.json({
      message: `Cron job completed: ${results.successful} successful, ${results.failed} failed`,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { message: error.message || "Cron job error" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  // Manual trigger for the cron job (for testing)
  return GET(req);
}
