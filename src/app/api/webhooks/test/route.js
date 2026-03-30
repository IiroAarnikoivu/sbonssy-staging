import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import VisitorEvent from "@/models/VisitorEvent";
import WebhookEvent from "@/models/WebhookEvent";
import AdminTestEvent from "@/models/AdminTestEvent";
import {
  verifyHmacSignature,
  validateWebhookPayload,
  extractAttribution,
} from "@/lib/webhookUtils";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Webhook-Signature, X-Source",
};

/**
 * POST /api/webhooks/test
 * Test webhook endpoint for brands to verify integration
 * Creates test VisitorEvents that don't affect analytics
 */
export async function POST(req) {
  const startTime = Date.now();

  try {
    await connectDB();

    // Extract headers
    const authHeader = req.headers.get("authorization");
    const signature = req.headers.get("x-webhook-signature");
    const source = req.headers.get("x-source");
    const ipAddress =
      req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    // Parse payload
    const rawBody = await req.text();
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON payload",
          validationErrors: ["Payload is not valid JSON"],
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // Validate Authorization header
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid authorization header",
          hint: "Include 'Authorization: Bearer YOUR_API_KEY' header",
        },
        { status: 401, headers: corsHeaders },
      );
    }

    const apiKey = authHeader.substring(7);

    // Find brand by API key
    const brand = await User.findOne({
      "brand.webhookApiKey": apiKey,
      role: "brand",
    }).select("+brand.webhookApiKey +brand.webhookSecret");

    if (!brand || !brand.brand) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid API key",
          hint: "Check that your API key is correct",
        },
        { status: 401, headers: corsHeaders },
      );
    }

    // Verify signature if provided
    const signatureChecks = {
      signatureProvided: !!signature,
      signatureValid: null,
      signatureMessage: "",
    };

    if (signature && brand.brand.webhookSecret) {
      signatureChecks.signatureValid = verifyHmacSignature(
        rawBody,
        signature,
        brand.brand.webhookSecret,
      );
      signatureChecks.signatureMessage = signatureChecks.signatureValid
        ? "Signature is valid ✓"
        : "Signature verification failed ✗";
    } else if (signature) {
      signatureChecks.signatureMessage =
        "Signature provided but no webhook secret configured";
    } else {
      signatureChecks.signatureMessage =
        "No signature provided (recommended for production)";
    }

    // Validate payload structure
    const validation = validateWebhookPayload(payload);

    // Detailed feedback
    const feedback = {
      authentication: {
        status: "success",
        message: "API key is valid ✓",
      },
      signature: signatureChecks,
      payloadValidation: {
        isValid: validation.isValid,
        errors: validation.errors,
        message: validation.isValid
          ? "Payload structure is valid ✓"
          : "Payload has validation errors",
      },
      attribution: {
        extracted: !!validation.attribution,
        data: validation.attribution,
        message: validation.attribution
          ? "Attribution data extracted successfully ✓"
          : "Could not extract attribution data",
      },
    };

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Test webhook received but validation failed",
          feedback,
          hint: "Fix the validation errors and try again",
        },
        { status: 200, headers: corsHeaders }, // Still return 200 for test endpoint
      );
    }

    const attribution = validation.attribution;

    // Optional: Try to look up campaign and athlete for more detailed feedback
    let campaignLookup = { found: false };
    let athleteLookup = { found: false };

    try {
      const campaign = await Campaign.findOne({
        trackingId: attribution.campaign,
      }).select("_id trackingId basics.title compensation.type");

      if (campaign) {
        campaignLookup = {
          found: true,
          campaignId: campaign._id,
          trackingId: campaign.trackingId,
          title: campaign.basics?.title,
          compensationType: campaign.compensation?.type,
          belongsToBrand: campaign.brandId.toString() === brand._id.toString(),
        };
      }
    } catch (e) {
      console.error("Campaign lookup error:", e);
    }

    try {
      const ambassador = await User.findOne({
        $or: [
          { "athlete.tracking_key": attribution.athlete },
          { "team.tracking_key": attribution.athlete },
          { "influencer.tracking_key": attribution.athlete },
          { "coach.tracking_key": attribution.athlete },
          { "exAthlete.tracking_key": attribution.athlete },
          { "paraAthlete.tracking_key": attribution.athlete },
        ],
      }).select("_id email role subRole");

      if (ambassador) {
        athleteLookup = {
          found: true,
          athleteId: ambassador._id,
          email: ambassador.email,
          role: ambassador.role,
          subRole: ambassador.subRole,
        };
      }
    } catch (e) {
      console.error("Athlete lookup error:", e);
    }

    feedback.campaignLookup = campaignLookup;
    feedback.athleteLookup = athleteLookup;

    // Create test AdminTestEvent for logging
    try {
      await AdminTestEvent.create({
        userId: brand._id,
        campaignId: campaignLookup.campaignId || null,
        athleteId: athleteLookup.athleteId || null,
        visitorId: attribution.visitorId,
        eventName: payload.event || "test",
        metadata: {
          source: "webhook_test",
          payload,
          feedback,
        },
        timestamp: new Date(),
      });
    } catch (e) {
      console.warn("Failed to create AdminTestEvent:", e.message);
    }

    // Mark webhook as configured only if the request is NOT from the Sbonssy dashboard
    // This ensures brands must test from their own code to complete setup
    if (source !== "dashboard") {
      await User.updateMany(
        {
          $or: [{ _id: brand._id }, { invitedBy: brand._id }],
          role: "brand",
        },
        {
          $set: {
            "brand.isWebhookConfigured": true,
            "brand.lastWebhookAt": new Date(),
          },
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Test webhook received and validated successfully! ✓",
        feedback,
        nextSteps: [
          "This was a test request - no real conversion was recorded",
          "Update your webhook URL to /api/webhooks/conversion for production",
          signatureChecks.signatureProvided && !signatureChecks.signatureValid
            ? "Fix signature generation - currently failing verification"
            : null,
          !signatureChecks.signatureProvided
            ? "Add X-Webhook-Signature header for production security"
            : null,
          !campaignLookup.found
            ? `Campaign '${attribution.campaign}' not found - check tracking ID`
            : null,
          !athleteLookup.found
            ? `Athlete '${attribution.athlete}' not found - check tracking key`
            : null,
          campaignLookup.found && !campaignLookup.belongsToBrand
            ? "Campaign does not belong to your brand"
            : null,
        ].filter(Boolean),
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("Test webhook error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        hint: "Check server logs for more details",
      },
      { status: 500, headers: corsHeaders },
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}
