import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import VisitorEvent from "@/models/VisitorEvent";
import WebhookEvent from "@/models/WebhookEvent";
import Attribution from "@/models/Attribution";
import {
  verifyHmacSignature,
  validateWebhookPayload,
  extractAttribution,
  createIdempotencyKey,
} from "@/lib/webhookUtils";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:5200";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Webhook-Signature",
};

/**
 * POST /api/webhooks/conversion
 * Server-to-server webhook endpoint for conversion tracking
 *
 * Authentication: Bearer token (API key)
 * Signature: X-Webhook-Signature header with HMAC-SHA256
 */
export async function POST(req) {
  const startTime = Date.now();
  let webhookEventId = null;
  let brand = null;

  try {
    await connectDB();

    // Extract headers
    const authHeader = req.headers.get("authorization");
    const signature = req.headers.get("x-webhook-signature");
    const ipAddress =
      req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    // Parse payload
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

    // Validate Authorization header
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid authorization header" },
        { status: 401, headers: corsHeaders },
      );
    }

    const apiKey = authHeader.substring(7); // Remove "Bearer "

    // Find brand by API key
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

    if (!brand.brand.webhookEnabled) {
      return NextResponse.json(
        { success: false, error: "Webhook integration is disabled" },
        { status: 403, headers: corsHeaders },
      );
    }

    // Resolve effective brand ID (handle invited sub-users)
    const effectiveBrandId = brand.invitedBy || brand._id;

    // Verify HMAC signature if provided
    let signatureValid = false;
    let isInternal = false;

    // Check for internal secret bypass
    const internalSecret = req.headers.get("x-sbonssy-secret");
    if (
      internalSecret &&
      internalSecret === process.env.SBONSSY_INTERNAL_SECRET
    ) {
      isInternal = true;
      console.log("[CONVERSION] Internal request verified via secret");
    }

    if (!isInternal) {
      // Validate Authorization header
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json(
          { success: false, error: "Missing or invalid authorization header" },
          { status: 401 },
        );
      }

      const apiKey = authHeader.substring(7); // Remove "Bearer "

      // Find brand by API key
      const brandRecord = await User.findOne({
        "brand.webhookApiKey": apiKey,
        role: "brand",
      }).select("+brand.webhookApiKey +brand.webhookSecret");

      if (!brandRecord || !brandRecord.brand) {
        return NextResponse.json(
          { success: false, error: "Invalid API key" },
          { status: 401 },
        );
      }
      brand = brandRecord;

      if (!brand.brand.webhookEnabled) {
        return NextResponse.json(
          { success: false, error: "Webhook integration is disabled" },
          { status: 403 },
        );
      }

      if (signature && brand.brand.webhookSecret) {
        signatureValid = verifyHmacSignature(
          rawBody,
          signature,
          brand.brand.webhookSecret,
        );

        if (!signatureValid) {
          // Log failed verification attempt
          await WebhookEvent.create({
            brandId: brand._id,
            eventType: "conversion",
            payload,
            signature,
            signatureValid: false,
            status: "failed",
            errorMessage: "Invalid webhook signature",
            ipAddress,
          });

          return NextResponse.json(
            { success: false, error: "Invalid webhook signature" },
            { status: 401 },
          );
        }
      }
    } else {
      // For internal requests, find brand by platform ID or from payload
      const brandIdentifier = payload.brandId || payload.platformBrandId;
      if (brandIdentifier) {
        brand = await User.findOne({
          $or: [
            { _id: brandIdentifier },
            { "brand.platformId": brandIdentifier },
          ],
        });
      }

      if (!brand) {
        // Fallback: try to find brand by Shopify domain if provided
        const shopDomain = payload.shop || payload.shopifyDomain;
        if (shopDomain) {
          brand = await User.findOne({ "brand.shopifyDomain": shopDomain });
        }
      }

      if (!brand) {
        return NextResponse.json(
          { success: false, error: "Internal request: Brand not found" },
          { status: 404 },
        );
      }
    }

    // Create idempotency key to prevent duplicates
    const idempotencyKey = createIdempotencyKey(payload, brand._id.toString());

    // Check for duplicate webhook
    const existingWebhook = await WebhookEvent.findOne({ idempotencyKey });
    if (existingWebhook) {
      return NextResponse.json(
        {
          success: true,
          message: "Webhook already processed (duplicate)",
          webhookEventId: existingWebhook._id,
          visitorEventId: existingWebhook.visitorEventId,
        },
        { status: 200, headers: corsHeaders },
      );
    }

    // Create webhook event log
    const webhookEvent = await WebhookEvent.create({
      brandId: brand._id,
      eventType: "conversion",
      payload,
      headers: {
        authorization: "Bearer ***masked***",
        "x-webhook-signature": signature ? "***provided***" : null,
        "x-forwarded-for": ipAddress,
      },
      signature,
      signatureValid: signature ? signatureValid : null,
      status: "processing",
      ipAddress,
      idempotencyKey,
      processingStartedAt: new Date(),
    });

    webhookEventId = webhookEvent._id;

    // Validate payload structure
    const validation = validateWebhookPayload(payload);
    if (!validation.isValid) {
      await WebhookEvent.updateOne(
        { _id: webhookEventId },
        {
          status: "failed",
          errorMessage: validation.errors.join("; "),
          processingCompletedAt: new Date(),
          processingDurationMs: Date.now() - startTime,
        },
      );

      return NextResponse.json(
        {
          success: false,
          error: "Invalid payload",
          details: validation.errors,
        },
        { status: 400, headers: corsHeaders },
      );
    }

    const attribution = validation.attribution;

    // Look up campaign
    let campaign = await Campaign.findOne({ trackingId: attribution.campaign });
    if (!campaign) {
      // Try ObjectId lookup
      campaign = await Campaign.findById(attribution.campaign).catch(
        () => null,
      );
    }

    if (!campaign) {
      await WebhookEvent.updateOne(
        { _id: webhookEventId },
        {
          status: "failed",
          errorMessage: "Campaign not found",
          processingCompletedAt: new Date(),
          processingDurationMs: Date.now() - startTime,
        },
      );

      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    // Verify campaign belongs to this brand
    if (campaign.brandId.toString() !== effectiveBrandId.toString()) {
      await WebhookEvent.updateOne(
        { _id: webhookEventId },
        {
          status: "failed",
          errorMessage: "Campaign does not belong to this brand",
          processingCompletedAt: new Date(),
          processingDurationMs: Date.now() - startTime,
        },
      );

      return NextResponse.json(
        { success: false, error: "Campaign does not belong to this brand" },
        { status: 403, headers: corsHeaders },
      );
    }

    // Look up ambassador/athlete
    const ambassador = await User.findOne({
      $or: [
        { "athlete.tracking_key": attribution.athlete },
        { "team.tracking_key": attribution.athlete },
        { "influencer.tracking_key": attribution.athlete },
        { "coach.tracking_key": attribution.athlete },
        { "exAthlete.tracking_key": attribution.athlete },
        { "paraAthlete.tracking_key": attribution.athlete },
      ],
    });

    if (!ambassador) {
      await WebhookEvent.updateOne(
        { _id: webhookEventId },
        {
          status: "failed",
          errorMessage: "Ambassador not found",
          processingCompletedAt: new Date(),
          processingDurationMs: Date.now() - startTime,
        },
      );

      return NextResponse.json(
        { success: false, error: "Ambassador not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    // Validate event type matches campaign compensation
    const eventName = payload.event;
    const validEvents = {
      "pay-per-sale": ["purchase"],
      "pay-per-lead": ["lead"],
      "pay-per-click": ["click"],
      "flat-fee": ["participation"],
    };

    if (!validEvents[campaign.compensation.type]?.includes(eventName)) {
      await WebhookEvent.updateOne(
        { _id: webhookEventId },
        {
          status: "failed",
          errorMessage: `Invalid event type '${eventName}' for campaign compensation '${campaign.compensation.type}'`,
          processingCompletedAt: new Date(),
          processingDurationMs: Date.now() - startTime,
        },
      );

      return NextResponse.json(
        {
          success: false,
          error: `Invalid event type for ${campaign.compensation.type}`,
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // Check for duplicate transaction
    const transactionId = payload.orderId || payload.transactionId;
    const existingEvent = await VisitorEvent.findOne({
      "eventData.transactionId": transactionId,
      "eventData.eventName": eventName,
    });

    if (existingEvent) {
      await WebhookEvent.updateOne(
        { _id: webhookEventId },
        {
          status: "success",
          visitorEventId: existingEvent._id,
          processingCompletedAt: new Date(),
          processingDurationMs: Date.now() - startTime,
        },
      );

      await User.updateOne(
        { _id: brand._id },
        {
          $set: {
            "brand.isWebhookConfigured": true,
            "brand.lastWebhookAt": new Date(),
          },
        },
      );

      return NextResponse.json(
        {
          success: true,
          message: "Transaction already recorded",
          visitorEventId: existingEvent._id,
        },
        { status: 200, headers: corsHeaders },
      );
    }

    // Calculate earnings based on compensation type
    let ambassadorEarnings = 0;
    let platformFee = 0;
    let originalSaleAmount = null;

    if (
      campaign.compensation.type === "pay-per-sale" &&
      eventName === "purchase"
    ) {
      if (!payload.amount || payload.amount <= 0) {
        await WebhookEvent.updateOne(
          { _id: webhookEventId },
          {
            status: "failed",
            errorMessage: "Purchase amount is required for pay-per-sale",
            processingCompletedAt: new Date(),
            processingDurationMs: Date.now() - startTime,
          },
        );

        return NextResponse.json(
          { success: false, error: "Purchase amount required" },
          { status: 400, headers: corsHeaders },
        );
      }

      originalSaleAmount = payload.amount;
      ambassadorEarnings =
        payload.amount * (campaign.compensation.commission / 100);
      platformFee = payload.amount * 0.04; // 4% of total sale
    } else if (
      campaign.compensation.type === "pay-per-lead" &&
      eventName === "lead"
    ) {
      ambassadorEarnings = campaign.compensation.amount || 0;
      platformFee = ambassadorEarnings * 0.2; // 20%
    } else if (
      campaign.compensation.type === "pay-per-click" &&
      eventName === "click"
    ) {
      ambassadorEarnings = campaign.compensation.amount || 0.5;
      platformFee = ambassadorEarnings * 0.2; // 20%
    } else if (
      campaign.compensation.type === "flat-fee" &&
      eventName === "participation"
    ) {
      ambassadorEarnings = campaign.compensation.amount || 0;
      platformFee = ambassadorEarnings * 0.2; // 20%
    }

    // Capture VAT snapshots
    let brandVatCountry = "";
    let brandVatStatus = "not_provided";
    let athleteVatCountry = "";
    let athleteVatStatus = "not_provided";

    try {
      const brandVatDetails = brand.brand?.vatDetails || {};
      brandVatCountry = (
        brandVatDetails.vatCountry ||
        brand.brand?.country ||
        ""
      )
        .toString()
        .toUpperCase();
      brandVatStatus = (brandVatDetails.vatStatus || "not_provided")
        .toString()
        .toLowerCase();

      const subRole = ambassador.subRole || "athlete";
      const subRoleCamel = subRole.replace(/-([a-z])/g, (g) =>
        g[1].toUpperCase(),
      );
      const athleteProfile = ambassador[subRoleCamel];
      const athleteVatDetails = athleteProfile?.vatDetails || {};
      athleteVatCountry = (
        athleteVatDetails.vatCountry ||
        athleteVatDetails.registrationCountry ||
        athleteProfile?.vatCountry ||
        ""
      )
        .toString()
        .toUpperCase();
      athleteVatStatus = (
        athleteVatDetails.vatStatus ||
        athleteProfile?.vatStatus ||
        "not_provided"
      )
        .toString()
        .toLowerCase();
    } catch (vatErr) {
      console.error("Error capturing VAT snapshots:", vatErr.message);
    }

    // Create VisitorEvent
    const visitorEvent = await VisitorEvent.create({
      campaignId: campaign._id,
      athleteId: ambassador._id,
      brandId: brand._id,
      visitorId: attribution.visitorId,
      eventType: eventName === "click" ? "click" : "conversion",
      eventData: {
        eventName,
        amount: ambassadorEarnings,
        platformFee,
        currency: payload.currency || "EUR",
        transactionId,
        originalSaleAmount,
        productId: payload.products?.[0]?.id || payload.productId,
        productHandle: payload.products?.[0]?.handle || payload.productHandle,
        productName: payload.products?.[0]?.name || payload.productName,
      },
      brandVatCountry,
      brandVatStatus,
      athleteVatCountry,
      athleteVatStatus,
      isTest: false,
    });

    // Update Attribution record if exists
    try {
      await Attribution.updateOne(
        {
          visitorId: attribution.visitorId,
          campaignId: campaign._id,
        },
        {
          converted: true,
          convertedAt: new Date(),
          conversionEventId: visitorEvent._id,
        },
      );
    } catch (attrErr) {
      console.warn("Failed to update attribution record:", attrErr.message);
    }

    // Update webhook event as successful
    await WebhookEvent.updateOne(
      { _id: webhookEventId },
      {
        status: "success",
        visitorEventId: visitorEvent._id,
        processingCompletedAt: new Date(),
        processingDurationMs: Date.now() - startTime,
      },
    );

    // Update brand's last webhook timestamp
    await User.updateOne(
      { _id: brand._id },
      {
        $set: {
          "brand.isWebhookConfigured": true,
          "brand.lastWebhookAt": new Date(),
        },
      },
    );

    return NextResponse.json(
      {
        success: true,
        message: "Conversion recorded successfully",
        data: {
          visitorEventId: visitorEvent._id,
          webhookEventId: webhookEvent._id,
          ambassadorEarnings,
          platformFee,
          currency: payload.currency || "EUR",
        },
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("Webhook conversion error:", error);

    // Update webhook event as failed
    if (webhookEventId) {
      await WebhookEvent.updateOne(
        { _id: webhookEventId },
        {
          status: "failed",
          errorMessage: error.message,
          errorStack: error.stack,
          processingCompletedAt: new Date(),
          processingDurationMs: Date.now() - startTime,
        },
      ).catch((e) => console.error("Failed to update webhook event:", e));
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500, headers: corsHeaders },
    );
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}
