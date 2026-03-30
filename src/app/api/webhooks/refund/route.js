import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import VisitorEvent from "@/models/VisitorEvent";
import WebhookEvent from "@/models/WebhookEvent";
import { verifyHmacSignature, createIdempotencyKey } from "@/lib/webhookUtils";
import {
  processFullRefund,
  processPartialRefund,
  createAudit,
} from "@/lib/payments/refundUtils";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Webhook-Signature",
};

/**
 * POST /api/webhooks/refund
 * Dedicated server-to-server webhook endpoint for processing PPS refunds
 */
export async function POST(req) {
  const startTime = Date.now();
  let webhookEventId = null;

  try {
    await connectDB();

    const authHeader = req.headers.get("authorization");
    const signature = req.headers.get("x-webhook-signature");
    const ipAddress =
      req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    const rawBody = await req.text();
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400, headers: corsHeaders },
      );
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid authorization header" },
        { status: 401, headers: corsHeaders },
      );
    }

    const apiKey = authHeader.substring(7);
    const brand = await User.findOne({
      "brand.webhookApiKey": apiKey,
      role: "brand",
    }).select("+brand.webhookApiKey +brand.webhookSecret");

    if (!brand || !brand.brand) {
      return NextResponse.json(
        { success: false, error: "Invalid API key" },
        { status: 401, headers: corsHeaders },
      );
    }

    if (signature && brand.brand.webhookSecret) {
      if (!verifyHmacSignature(rawBody, signature, brand.brand.webhookSecret)) {
        return NextResponse.json(
          { success: false, error: "Invalid webhook signature" },
          { status: 401, headers: corsHeaders },
        );
      }
    }

    const transactionId = payload.orderId || payload.transactionId;
    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: "Missing orderId or transactionId" },
        { status: 400, headers: corsHeaders },
      );
    }

    const idempotencyKey = createIdempotencyKey(payload, brand._id.toString());
    const existingWebhook = await WebhookEvent.findOne({ idempotencyKey });
    if (existingWebhook) {
      return NextResponse.json(
        {
          success: true,
          message: "Webhook already processed (duplicate)",
          webhookEventId: existingWebhook._id,
        },
        { status: 200, headers: corsHeaders },
      );
    }

    const webhookEvent = await WebhookEvent.create({
      brandId: brand._id,
      eventType: "refund",
      payload,
      headers: {
        authorization: "Bearer ***masked***",
        "x-webhook-signature": signature ? "***provided***" : null,
      },
      status: "processing",
      ipAddress,
      idempotencyKey,
      processingStartedAt: new Date(),
    });
    webhookEventId = webhookEvent._id;

    // Find the original purchase event
    const purchaseEvent = await VisitorEvent.findOne({
      "eventData.transactionId": transactionId,
      "eventData.eventName": "purchase",
      brandId: brand._id,
    });

    if (!purchaseEvent) {
      await WebhookEvent.updateOne(
        { _id: webhookEventId },
        {
          status: "failed",
          errorMessage: `Original purchase event not found for transaction ${transactionId}`,
          processingCompletedAt: new Date(),
          processingDurationMs: Date.now() - startTime,
        },
      );

      return NextResponse.json(
        { success: false, error: "Original purchase event not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    const currentStatus = purchaseEvent.commissionStatus || "pending";
    if (currentStatus === "locked" || currentStatus === "paid") {
      await WebhookEvent.updateOne(
        { _id: webhookEventId },
        {
          status: "success",
          message: `Commission is ${currentStatus}, no reversal applied`,
          processingCompletedAt: new Date(),
          processingDurationMs: Date.now() - startTime,
        },
      );
      return NextResponse.json(
        {
          success: true,
          message: `Commission already ${currentStatus}, no reversal applied`,
        },
        { status: 200, headers: corsHeaders },
      );
    }

    if (currentStatus === "cancelled") {
      return NextResponse.json(
        { success: true, message: "Commission already cancelled" },
        { status: 200, headers: corsHeaders },
      );
    }

    let result;
    if (!payload.amount) {
      // Treat as full refund
      result = await processFullRefund(purchaseEvent, {
        reason: payload.reason || "Full refund via generic webhook",
        webhookId: webhookEventId,
        source: "Refund Webhook",
      });
    } else {
      const orderTotal =
        payload.orderTotal || purchaseEvent.eventData.originalSaleAmount || 0;
      result = await processPartialRefund(purchaseEvent, {
        refundAmount: payload.amount,
        orderTotal,
        reason: payload.reason || "Partial refund via generic webhook",
        webhookId: webhookEventId,
        source: "Refund Webhook",
      });
    }

    await WebhookEvent.updateOne(
      { _id: webhookEventId },
      {
        status: "success",
        visitorEventId: purchaseEvent._id,
        processingCompletedAt: new Date(),
        processingDurationMs: Date.now() - startTime,
      },
    );

    await createAudit(
      purchaseEvent.campaignId,
      purchaseEvent.athleteId,
      {
        source: "generic_refund_webhook",
        transactionId,
        payload,
        result: result.action,
      },
      200,
      result.message,
    );

    return NextResponse.json({
      success: true,
      message: result.message,
      action: result.action,
      visitorEventId: purchaseEvent._id,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Refund webhook error:", error);
    if (webhookEventId) {
      await WebhookEvent.updateOne(
        { _id: webhookEventId },
        {
          status: "failed",
          errorMessage: error.message,
          processingCompletedAt: new Date(),
          processingDurationMs: Date.now() - startTime,
        },
      ).catch((e) => console.error("Failed to update webhook event:", e));
    }
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}
