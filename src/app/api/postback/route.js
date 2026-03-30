import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import VisitorEvent from "@/models/VisitorEvent";
import AdminTestEvent from "@/models/AdminTestEvent";
import PostbackAudit from "@/models/PostbackAudit";
import crypto from "crypto";

export async function POST(req) {
  try {
    await connectDB();
    const {
      event: eventName,
      campaign: campaignTrackingId,
      athlete: ambassadorTrackingKey,
      affiliate,
      visitorId,
      amount,
      currency = "EUR",
      transactionId,
      testToken,
      cartTotal,
      cartCurrency,
      lineItems,
      // Optional product-level attribution
      productId,
      productHandle,
      productName,
      productPrice,
      // Shopify order identifier for refund matching
      shopifyOrderId,
      // Snapshots passed from tracking script
      brandVatCountry: reqBrandVatCountry,
      brandVatStatus: reqBrandVatStatus,
      athleteVatCountry: reqAthleteVatCountry,
      athleteVatStatus: reqAthleteVatStatus,
    } = await req.json();

    const ambassadorKey = ambassadorTrackingKey || affiliate;

    if (
      !eventName ||
      !campaignTrackingId ||
      !ambassadorKey ||
      !visitorId ||
      !transactionId
    ) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 },
        { headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }

    const existingSameEvent = await VisitorEvent.findOne({
      "eventData.transactionId": transactionId,
      "eventData.eventName": eventName,
    });
    if (existingSameEvent) {
      return NextResponse.json(
        { message: "Duplicate transaction for this event" },
        { status: 400 },
        { headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }

    const campaign = await Campaign.findOne({ trackingId: campaignTrackingId });
    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 },
        { headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }

    const ambassador = await User.findOne({
      $or: [
        { "athlete.tracking_key": ambassadorKey },
        { "team.tracking_key": ambassadorKey },
        { "influencer.tracking_key": ambassadorKey },
        { "coach.tracking_key": ambassadorKey },
        { "exAthlete.tracking_key": ambassadorKey },
        { "paraAthlete.tracking_key": ambassadorKey },
      ],
    });

    if (!ambassador) {
      return NextResponse.json(
        { message: "Ambassador not found" },
        { status: 404 },
        { headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }

    const validEvents = {
      "pay-per-sale": ["purchase", "refund"],
      "pay-per-lead": ["lead"],
      "pay-per-click": ["click"],
      "flat-fee": ["participation"],
    };

    if (!validEvents[campaign.compensation.type].includes(eventName)) {
      return NextResponse.json(
        { message: `Invalid event type for ${campaign.compensation.type}` },
        { status: 400 },
        { headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }

    let ambassadorEarnings = 0;
    let platformFee = 0;

    if (campaign.compensation.type === "pay-per-sale") {
      if (eventName === "purchase") {
        if (!amount) {
          return NextResponse.json(
            { message: "Sale amount is required for pay-per-sale" },
            { status: 400 },
            { headers: { "Access-Control-Allow-Origin": "*" } },
          );
        }
        ambassadorEarnings = amount * (campaign.compensation.commission / 100);
        platformFee = amount * 0.04; // 4% platform fee of the TOTAL amount for pay-per-sale
      } else if (eventName === "refund") {
        // Find the original purchase
        const original = await VisitorEvent.findOne({
          "eventData.transactionId": transactionId,
          "eventData.eventName": "purchase",
        });
        // If no original, reject
        if (!original) {
          return NextResponse.json(
            { message: "Original purchase not found for refund" },
            { status: 404 },
            { headers: { "Access-Control-Allow-Origin": "*" } },
          );
        }
        // If already invoiced, reject
        const invoicedLine = await (
          await import("@/models/Invoice")
        ).default
          .findOne({ "lineItems.metadata.eventId": String(original._id) })
          .lean()
          .catch(() => null);
        if (original.invoicedAt || invoicedLine) {
          return NextResponse.json(
            {
              message: "Refund not allowed: original purchase already invoiced",
            },
            { status: 400, headers: { "Access-Control-Allow-Origin": "*" } },
          );
        }
        // Mark original purchase as cancelled and stop here (no refund event created)
        await VisitorEvent.updateOne(
          { _id: original._id },
          {
            cancelledAt: new Date(),
            cancellationReason: "Product returned (pre-invoice)",
          },
        );
        return NextResponse.json(
          { message: "Purchase cancelled before invoicing; commission voided" },
          { status: 200 },
          { headers: { "Access-Control-Allow-Origin": "*" } },
        );
      }
    } else if (campaign.compensation.type === "pay-per-lead") {
      // Use product price if available, otherwise campaign amount
      const baseAmount = productPrice
        ? parseFloat(productPrice)
        : campaign.compensation.amount;
      ambassadorEarnings = baseAmount || 5;
      platformFee = ambassadorEarnings * 0.2;
    } else if (campaign.compensation.type === "pay-per-click") {
      // PPC pays on click. Conversion event is for tracking only (0 earnings).
      ambassadorEarnings = 0;
      platformFee = 0;
    } else if (campaign.compensation.type === "flat-fee") {
      // Flat-fee pays on participation. Conversion event is for tracking only (0 earnings).
      ambassadorEarnings = 0;
      platformFee = 0;
    }

    const isTest = Boolean(
      testToken &&
      campaign.verification?.testToken &&
      testToken === campaign.verification.testToken,
    );

    // Deduplication for PPC: if we already tracked a click for this visitor, don't create a conversion event
    if (!isTest && campaign.compensation.type === "pay-per-click") {
      const existingClick = await VisitorEvent.findOne({
        campaignId: campaign._id,
        visitorId,
        $or: [
          { eventType: "click" },
          { eventType: "conversion", "eventData.eventName": "click" },
        ],
      });
      if (existingClick) {
        return NextResponse.json(
          { message: "Earning already tracked via click" },
          { status: 200, headers: { "Access-Control-Allow-Origin": "*" } },
        );
      }
    }

    // Capture/Verify VAT snapshots at event time (server-side fallback ensures fields are populated)
    let brandVatCountry = reqBrandVatCountry;
    let brandVatStatus = reqBrandVatStatus;
    let athleteVatCountry = reqAthleteVatCountry;
    let athleteVatStatus = reqAthleteVatStatus;
    let brandProfile;

    try {
      // Fetch brand profile for fallbacks
      brandProfile = await User.findById(campaign.brandId);

      if (!brandVatCountry || !brandVatStatus) {
        const brandVatDetails = brandProfile?.brand?.vatDetails || {};
        brandVatCountry = (
          brandVatDetails.vatCountry ||
          brandProfile?.brand?.country ||
          ""
        )
          .toString()
          .toUpperCase();
        brandVatStatus = (brandVatDetails.vatStatus || "not_provided")
          .toString()
          .toLowerCase();
      }

      if (!athleteVatCountry || !athleteVatStatus) {
        const athlete = ambassador; // already loaded at line 66
        const subRole = athlete.subRole || "athlete";
        const subRoleCamel = subRole.replace(/-([a-z])/g, (g) =>
          g[1].toUpperCase(),
        );
        const athleteProfile = athlete[subRoleCamel];
        const athleteVatDetails = athleteProfile?.vatDetails || {};
        athleteVatCountry = (
          athleteVatDetails.vatCountry ||
          athleteVatDetails.registrationCountry ||
          athleteProfile?.vatCountry ||
          athleteProfile?.registrationCountry ||
          ""
        )
          .toString()
          .toUpperCase();
        // Derive athleteVatStatus from vatStatus or uiBusinessType
        athleteVatStatus = (
          athleteVatDetails.vatStatus ||
          athleteVatDetails.uiBusinessType ||
          athleteProfile?.vatStatus ||
          athleteProfile?.uiBusinessType ||
          "not_provided"
        )
          .toString()
          .toLowerCase();
      }
    } catch (vatErr) {
      console.error(
        "Error capturing VAT snapshots in postback (POST):",
        vatErr.message,
      );
    }

    // Normalize to null when still empty so fields are stored consistently
    const normalizeCountry = (val) => {
      const v = (val || "").toString().trim();
      return v ? v.toUpperCase() : null;
    };
    const normalizeStatus = (val) => {
      const v = (val || "not_provided").toString().trim();
      return v ? v.toLowerCase() : "not_provided";
    };

    brandVatCountry = normalizeCountry(
      brandVatCountry ||
        brandProfile?.brand?.vatDetails?.vatCountry ||
        brandProfile?.brand?.country,
    );
    brandVatStatus = normalizeStatus(
      brandVatStatus || brandProfile?.brand?.vatDetails?.vatStatus,
    );
    athleteVatCountry = normalizeCountry(athleteVatCountry);
    athleteVatStatus = normalizeStatus(athleteVatStatus);

    const EventModel = isTest ? AdminTestEvent : VisitorEvent;

    const newVisitorEvent = await EventModel.create({
      campaignId: campaign._id,
      athleteId: ambassador._id,
      brandId: campaign.brandId,
      visitorId,
      eventType: "conversion",
      eventData: {
        eventName,
        amount: ambassadorEarnings,
        platformFee,
        currency,
        transactionId,
        originalSaleAmount:
          campaign.compensation.type === "pay-per-sale"
            ? eventName === "purchase"
              ? amount
              : undefined
            : undefined,
        cartTotal: cartTotal ?? amount,
        cartCurrency: cartCurrency || currency,
        lineItems: Array.isArray(lineItems) ? lineItems : [],
        // Product-level attribution (optional)
        productId: productId || undefined,
        productHandle: productHandle || undefined,
        productName: productName || undefined,
      },
      isTest,
      commissionStatus: "pending",
      shopifyOrderId: shopifyOrderId || undefined,
      // Snapshots
      brandVatCountry,
      brandVatStatus,
      athleteVatCountry,
      athleteVatStatus,
    });

    // Handle automatic invoice generation (skip refund auto-cancel; refunds cancel pre-invoice above)
    if (!isTest && (ambassadorEarnings !== 0 || platformFee !== 0)) {
      // Generate invoice for non-zero amount events
      setTimeout(async () => {
        try {
          await fetch(
            `${
              process.env.NEXTAUTH_URL || "http://localhost:3000"
            }/api/payments/generate-event-invoice`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                eventId: newVisitorEvent._id.toString(),
              }),
            },
          );
        } catch (error) {
          console.error("Auto-invoice generation failed:", error);
        }
      }, 1000); // 1 second delay
    }

    // If this is a test conversion (e.g., purchase), mark verification as verified
    if (isTest && eventName !== "refund") {
      try {
        await Campaign.updateOne(
          { _id: campaign._id },
          {
            $set: {
              "verification.status": "verified",
              "verification.testConversionEventId": newVisitorEvent._id,
              "verification.testedAt": new Date(),
              "verification.testedBy": campaign.brandId,
            },
          },
        );
      } catch (e) {
        console.warn(
          "Failed to update campaign verification (POST conversion):",
          e?.message || e,
        );
      }
    }

    // Audit only when we have campaign and ambassador context (schema requires campaignId)
    try {
      await PostbackAudit.create({
        campaignId: campaign._id,
        ambassadorId: ambassador._id,
        visitorId,
        requestData: {
          source: "POST",
          eventName,
          campaignTrackingId,
          ambassadorTrackingKey: ambassadorKey,
          amount,
          currency,
          transactionId,
          cartTotal: cartTotal ?? amount,
          cartCurrency: cartCurrency || currency,
          lineItems: Array.isArray(lineItems) ? lineItems : [],
          productId,
          productHandle,
          productName,
          productPrice,
        },
        responseStatus: 200,
        responseMessage: "Conversion tracked",
        ipAddress: req.headers.get("x-forwarded-for") || req.ip || "",
      });
    } catch (e) {
      // Do not block main flow on audit errors
      console.warn("Postback audit failed (POST):", e?.message || e);
    }

    return NextResponse.json(
      {
        message: "Conversion tracked",
        ambassadorEarnings,
        platformFee,
      },
      { status: 200, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  } catch (error) {
    console.error("Error in /api/postback:", error.message);
    return NextResponse.json(
      { message: error.message || "Error tracking conversion" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  );
}

// Pixel-style GET handler to support <img src=".../api/postback?...
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const eventName = searchParams.get("event");
    const campaignTrackingId = searchParams.get("campaign");
    console.log("campaignTrackingId", campaignTrackingId);
    const ambassadorTrackingKey =
      searchParams.get("affiliate") || searchParams.get("athlete");
    const visitorId = searchParams.get("visitorId");
    const amountStr = searchParams.get("amount");
    const amount = amountStr ? parseFloat(amountStr) : undefined;
    const currency = searchParams.get("currency") || "EUR";
    const transactionId = searchParams.get("transactionId");
    const testToken = searchParams.get("testToken");
    const productId = searchParams.get("productId") || undefined;
    const productHandle = searchParams.get("productHandle") || undefined;
    const productName = searchParams.get("productName") || undefined;
    const productPriceStr = searchParams.get("productPrice");
    const productPrice = productPriceStr
      ? parseFloat(productPriceStr)
      : undefined;

    // Snapshots passed from tracking script
    const reqBrandVatCountry = searchParams.get("brandVatCountry");
    const reqBrandVatStatus = searchParams.get("brandVatStatus");
    const reqAthleteVatCountry = searchParams.get("athleteVatCountry");
    const reqAthleteVatStatus = searchParams.get("athleteVatStatus");

    if (
      !eventName ||
      !campaignTrackingId ||
      !ambassadorTrackingKey ||
      !visitorId ||
      !transactionId
    ) {
      return new NextResponse("Missing required fields", {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/plain",
        },
      });
    }

    const campaign = await Campaign.findOne({ trackingId: campaignTrackingId });
    if (!campaign) {
      return new NextResponse("Campaign not found", {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/plain",
        },
      });
    }

    const ambassador = await User.findOne({
      $or: [
        { "athlete.tracking_key": ambassadorTrackingKey },
        { "team.tracking_key": ambassadorTrackingKey },
        { "influencer.tracking_key": ambassadorTrackingKey },
        { "coach.tracking_key": ambassadorTrackingKey },
        { "exAthlete.tracking_key": ambassadorTrackingKey },
        { "paraAthlete.tracking_key": ambassadorTrackingKey },
      ],
    });

    if (!ambassador) {
      return new NextResponse("Ambassador not found", {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/plain",
        },
      });
    }

    const validEvents = {
      "pay-per-sale": ["purchase", "refund"],
      "pay-per-lead": ["lead"],
      "pay-per-click": ["click"],
      "flat-fee": ["participation"],
    };

    if (!validEvents[campaign.compensation.type].includes(eventName)) {
      return new NextResponse(
        `Invalid event type for ${campaign.compensation.type}`,
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "text/plain",
          },
        },
      );
    }

    let ambassadorEarnings = 0;
    let platformFee = 0;

    if (campaign.compensation.type === "pay-per-sale") {
      if (eventName === "purchase") {
        if (!amount) {
          return new NextResponse("Sale amount is required for pay-per-sale", {
            status: 400,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "text/plain",
            },
          });
        }
        ambassadorEarnings = amount * (campaign.compensation.commission / 100);
        platformFee = amount * 0.04; // 4% platform fee of the TOTAL amount for pay-per-sale
      } else if (eventName === "refund") {
        // Find the original purchase
        const original = await VisitorEvent.findOne({
          "eventData.transactionId": transactionId,
          "eventData.eventName": "purchase",
        });
        if (!original) {
          return new NextResponse("Original purchase not found for refund", {
            status: 404,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "text/plain",
            },
          });
        }
        const invoicedLine = await (
          await import("@/models/Invoice")
        ).default
          .findOne({ "lineItems.metadata.eventId": String(original._id) })
          .lean()
          .catch(() => null);
        if (original.invoicedAt || invoicedLine) {
          return new NextResponse(
            "Refund not allowed: original purchase already invoiced",
            {
              status: 400,
              headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "text/plain",
              },
            },
          );
        }
        // Mark original purchase as cancelled and return success (no refund event created)
        await VisitorEvent.updateOne(
          { _id: original._id },
          {
            cancelledAt: new Date(),
            cancellationReason: "Product returned (pre-invoice)",
          },
        );
        return new NextResponse(
          "Purchase cancelled before invoicing; commission voided",
          {
            status: 200,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "text/plain",
            },
          },
        );
      }
    } else if (campaign.compensation.type === "pay-per-lead") {
      const baseAmount = productPrice ?? campaign.compensation.amount;
      ambassadorEarnings = baseAmount || 5;
      platformFee = ambassadorEarnings * 0.2;
    } else if (campaign.compensation.type === "pay-per-click") {
      // PPC pays on click. Conversion event is for tracking only (0 earnings).
      ambassadorEarnings = 0;
      platformFee = 0;
    } else if (campaign.compensation.type === "flat-fee") {
      // Flat-fee pays on participation. Conversion event is for tracking only (0 earnings).
      ambassadorEarnings = 0;
      platformFee = 0;
    }

    const isTest = Boolean(
      testToken &&
      campaign.verification?.testToken &&
      testToken === campaign.verification.testToken,
    );

    // Deduplication for PPC in GET handler
    if (!isTest && campaign.compensation.type === "pay-per-click") {
      const existingClick = await VisitorEvent.findOne({
        campaignId: campaign._id,
        visitorId,
        $or: [
          { eventType: "click" },
          { eventType: "conversion", "eventData.eventName": "click" },
        ],
      });
      if (existingClick) {
        return new NextResponse("Earning already tracked via click", {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "text/plain",
          },
        });
      }
    }

    // Capture/Verify VAT snapshots at event time (GET)
    let brandVatCountry = reqBrandVatCountry;
    let brandVatStatus = reqBrandVatStatus;
    let athleteVatCountry = reqAthleteVatCountry;
    let athleteVatStatus = reqAthleteVatStatus;

    try {
      if (!brandVatCountry || !brandVatStatus) {
        const brand = await User.findById(campaign.brandId);
        if (brand) {
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
        }
      }

      if (!athleteVatCountry || !athleteVatStatus) {
        const athlete = ambassador; // already loaded at line 380
        const subRole = athlete.subRole || "athlete";
        const subRoleCamel = subRole.replace(/-([a-z])/g, (g) =>
          g[1].toUpperCase(),
        );
        const athleteProfile = athlete[subRoleCamel];
        const athleteVatDetails = athleteProfile?.vatDetails || {};
        athleteVatCountry = (
          athleteVatDetails.vatCountry ||
          athleteVatDetails.registrationCountry ||
          athleteProfile?.vatCountry ||
          athleteProfile?.registrationCountry ||
          ""
        )
          .toString()
          .toUpperCase();
        // Derive athleteVatStatus from vatStatus or uiBusinessType
        athleteVatStatus = (
          athleteVatDetails.vatStatus ||
          athleteVatDetails.uiBusinessType ||
          athleteProfile?.vatStatus ||
          athleteProfile?.uiBusinessType ||
          "not_provided"
        )
          .toString()
          .toLowerCase();
      }
    } catch (vatErr) {
      console.error(
        "Error capturing VAT snapshots in postback (GET):",
        vatErr.message,
      );
    }

    athleteVatCountry = normalizeCountry(athleteVatCountry);
    athleteVatStatus = normalizeStatus(athleteVatStatus);

    const EventModel = isTest ? AdminTestEvent : VisitorEvent;

    const newVisitorEvent = await EventModel.create({
      campaignId: campaign._id,
      athleteId: ambassador._id,
      brandId: campaign.brandId,
      visitorId,
      eventType: "conversion",
      eventData: {
        eventName,
        amount: ambassadorEarnings,
        platformFee,
        currency,
        transactionId,
        originalSaleAmount:
          campaign.compensation.type === "pay-per-sale" &&
          eventName === "purchase"
            ? amount
            : undefined,
        productId,
        productHandle,
        productName,
      },
      isTest,
      // Snapshots
      brandVatCountry,
      brandVatStatus,
      athleteVatCountry,
      athleteVatStatus,
    });

    // Handle automatic invoice generation (refunds are handled pre-invoice above)
    if (!isTest && (ambassadorEarnings !== 0 || platformFee !== 0)) {
      // Generate invoice for non-zero amount events
      setTimeout(async () => {
        try {
          await fetch(
            `${
              process.env.NEXTAUTH_URL || "http://localhost:3000"
            }/api/payments/generate-event-invoice`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                eventId: newVisitorEvent._id.toString(),
              }),
            },
          );
        } catch (error) {
          console.error("Auto-invoice generation failed (GET):", error);
        }
      }, 1000); // 1 second delay
    }

    if (isTest && eventName !== "refund") {
      try {
        await Campaign.updateOne(
          { _id: campaign._id },
          {
            $set: {
              "verification.status": "verified",
              "verification.testConversionEventId": newVisitorEvent._id,
              "verification.testedAt": new Date(),
              "verification.testedBy": campaign.brandId,
            },
          },
        );
      } catch (e) {
        console.warn(
          "Failed to update campaign verification (GET conversion):",
          e?.message || e,
        );
      }
    }

    try {
      await PostbackAudit.create({
        campaignId: campaign._id,
        ambassadorId: ambassador._id,
        visitorId,
        requestData: {
          source: "GET",
          eventName,
          campaignTrackingId,
          ambassadorTrackingKey,
          amount,
          currency,
          transactionId,
          productId,
          productHandle,
          productName,
          productPrice,
        },
        responseStatus: 200,
        responseMessage: "Conversion tracked",
        ipAddress: req.headers.get("x-forwarded-for") || req.ip || "",
      });
    } catch (e) {
      console.warn("Postback audit failed (GET):", e?.message || e);
    }

    // Pixel responses should be tiny, avoid JSON to reduce risk of rendering
    return new NextResponse("OK", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    console.error("Error in /api/postback (GET):", error.message);
    return new NextResponse(error.message || "Error tracking conversion", {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "text/plain",
      },
    });
  }
}
