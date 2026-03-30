import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VisitorEvent from "@/models/VisitorEvent";
import PostbackAudit from "@/models/PostbackAudit";
import {
  processFullRefund,
  processPartialRefund,
  createAudit,
} from "@/lib/payments/refundUtils";

/**
 * POST /api/shopify/refund
 *
 * Called by Shopify webhook handlers (orders/cancelled, refunds/create)
 * to automatically reverse or reduce affiliate commissions.
 */
export async function POST(req) {
  try {
    await connectDB();
    const {
      shopifyOrderId,
      shop,
      eventType, // "cancellation" | "refund"
      refundAmount, // null for full cancellation, number for refunds
      originalTotal,
      currency = "EUR",
      webhookId,
      refundId,
      refundLineItems,
      cancelReason,
      note,
    } = await req.json();

    console.log(
      `[SHOPIFY_REFUND] Received ${eventType} for order ${shopifyOrderId} from ${shop}`,
    );

    // Validate required fields
    if (!shopifyOrderId || !shop || !eventType) {
      return NextResponse.json(
        { message: "Missing required fields: shopifyOrderId, shop, eventType" },
        { status: 400 },
      );
    }

    // Idempotency check: if we already processed this webhookId
    if (webhookId) {
      const existing = await PostbackAudit.findOne({
        "requestData.webhookId": webhookId,
        "requestData.source": "shopify_refund",
      });
      if (existing) {
        console.log(
          `[SHOPIFY_REFUND] Webhook ${webhookId} already processed, skipping`,
        );
        return NextResponse.json(
          { message: "Already processed", webhookId },
          { status: 200 },
        );
      }
    }

    // Find the purchase VisitorEvent by shopifyOrderId
    let purchaseEvent = await VisitorEvent.findOne({
      shopifyOrderId: String(shopifyOrderId),
      "eventData.eventName": "purchase",
    });

    // Fallback: try matching via orderId in transactionId or eventData
    if (!purchaseEvent) {
      const orderId = String(shopifyOrderId);
      purchaseEvent = await VisitorEvent.findOne({
        $or: [
          { "eventData.transactionId": { $regex: orderId } },
          { "eventData.transactionId": orderId },
        ],
        "eventData.eventName": "purchase",
      });
    }

    if (!purchaseEvent) {
      console.log(
        `[SHOPIFY_REFUND] No purchase event found for order ${shopifyOrderId}`,
      );
      // Create audit record even for miss
      await createAudit(
        null,
        null,
        {
          source: "shopify_refund",
          eventType,
          shopifyOrderId,
          shop,
          webhookId,
          refundAmount,
        },
        404,
        "Purchase event not found",
      );

      return NextResponse.json(
        { message: "No matching purchase event found" },
        { status: 200 }, // Return 200 to Shopify so it doesn't retry
      );
    }

    const currentStatus = purchaseEvent.commissionStatus || "pending";
    console.log(
      `[SHOPIFY_REFUND] Found purchase event ${purchaseEvent._id} with status: ${currentStatus}`,
    );

    // If commission is already locked or paid, no changes allowed
    if (currentStatus === "locked" || currentStatus === "paid") {
      console.log(
        `[SHOPIFY_REFUND] Commission is ${currentStatus}, no reversal applied`,
      );
      await createAudit(
        purchaseEvent.campaignId,
        purchaseEvent.athleteId,
        {
          source: "shopify_refund",
          eventType,
          shopifyOrderId,
          shop,
          webhookId,
          refundAmount,
          currentStatus,
        },
        200,
        `Commission already ${currentStatus}, no change`,
      );

      return NextResponse.json(
        { message: `Commission already ${currentStatus}, no reversal applied` },
        { status: 200 },
      );
    }

    // If already cancelled, skip
    if (currentStatus === "cancelled") {
      console.log(`[SHOPIFY_REFUND] Commission already cancelled`);
      return NextResponse.json(
        { message: "Commission already cancelled" },
        { status: 200 },
      );
    }

    // ---- Process the refund ----
    const isFullRefund = eventType === "cancellation" || !refundAmount;
    const orderTotal =
      originalTotal ||
      purchaseEvent.eventData.originalSaleAmount ||
      purchaseEvent.eventData.cartTotal ||
      0;

    let result;
    if (isFullRefund) {
      result = await processFullRefund(purchaseEvent, {
        reason: cancelReason || note || "Order cancelled/fully refunded",
        webhookId,
        source: `Shopify ${eventType}`,
      });
    } else {
      result = await processPartialRefund(purchaseEvent, {
        refundAmount,
        orderTotal,
        reason: note || "Shopify partial refund",
        webhookId,
        source: "Shopify refund",
      });
    }

    // Audit
    await createAudit(
      purchaseEvent.campaignId,
      purchaseEvent.athleteId,
      {
        source: "shopify_refund",
        eventType,
        shopifyOrderId,
        shop,
        webhookId,
        refundId,
        refundAmount,
        orderTotal,
        isFullRefund,
        result: result.action,
      },
      200,
      result.message,
    );

    return NextResponse.json(
      {
        message: result.message,
        action: result.action,
        details: result.details,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[SHOPIFY_REFUND] Error:", error.message, error.stack);
    return NextResponse.json(
      { message: error.message || "Error processing refund" },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  );
}
