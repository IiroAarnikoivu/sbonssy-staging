import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import VisitorEvent from "@/models/VisitorEvent";
import AdminTestEvent from "@/models/AdminTestEvent";
import crypto from "crypto";


export async function POST(req) {
  try {
    await connectDB();
    const {
      campaignId,
      athleteId,
      visitorId,
      eventType,
      brandId,
      productId,
      productHandle,
      productName,
      testToken,
      // Snapshots passed from landing page
      brandVatCountry: reqBrandVatCountry,
      brandVatStatus: reqBrandVatStatus,
      athleteVatCountry: reqAthleteVatCountry,
      athleteVatStatus: reqAthleteVatStatus,
    } = await req.json();

    if (!campaignId || !athleteId || !visitorId || !eventType || !brandId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 },
        { headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }

    const campaign = await Campaign.findOne({ trackingId: campaignId });
    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 },
        { headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }
    const ambassador = await User.findOne({
      $or: [
        { "athlete.tracking_key": athleteId },
        { "team.tracking_key": athleteId },
        { "influencer.tracking_key": athleteId },
        { "coach.tracking_key": athleteId },
        { "exAthlete.tracking_key": athleteId },
        { "paraAthlete.tracking_key": athleteId },
      ],
    });

    if (!ambassador) {
      return NextResponse.json(
        { message: "Ambassador not found" },
        { status: 404 },
        { headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }

    // Handle brandId being passed as object or string
    let brandIdStr = brandId;

    if (typeof brandId === "object" && brandId !== null) {
      brandIdStr = brandId._id || brandId.uuid || brandId.id;
      // If still object, try to see if it's a string wrapped in object (rare but possible) or just fallback to string check
      if (!brandIdStr && brandId.toString() !== "[object Object]") {
        brandIdStr = brandId.toString();
      }
    } else if (typeof brandId === "string" && brandId === "[object Object]") {
      // Critical error: it came in as the string "[object Object]"
      console.error(
        "Critical: brandId came in as literal '[object Object]' string",
      );
      return NextResponse.json(
        { message: "Invalid Brand ID format: received '[object Object]'" },
        { status: 400 },
      );
    }

    if (!brandIdStr) {
      return NextResponse.json(
        { message: "Invalid Brand ID format" },
        { status: 400 },
      );
    }

    const brand = await User.findById(brandIdStr);
    if (!brand) {
      return NextResponse.json(
        { message: "Brand not found" },
        { status: 404 },
        { headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }

    // Capture/Verify VAT snapshots
    let brandVatCountry = reqBrandVatCountry;
    let brandVatStatus = reqBrandVatStatus;
    let athleteVatCountry = reqAthleteVatCountry;
    let athleteVatStatus = reqAthleteVatStatus;

    try {
      if (!brandVatCountry || !brandVatStatus) {
        const brandVatDetails = brand.brand?.vatDetails || {};
        brandVatCountry = (brandVatDetails.vatCountry || brand.brand?.country || "").toString().toUpperCase();
        brandVatStatus = (brandVatDetails.vatStatus || "not_provided").toString().toLowerCase();
      }

      if (!athleteVatCountry || !athleteVatStatus) {
        const subRole = ambassador.subRole || "athlete";
        const subRoleCamel = subRole.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        const athleteProfile = ambassador[subRoleCamel];
        const athleteVatDetails = athleteProfile?.vatDetails || {};
        athleteVatCountry = (
          athleteVatDetails.vatCountry ||
          athleteVatDetails.registrationCountry ||
          athleteProfile?.vatCountry ||
          athleteProfile?.registrationCountry ||
          ""
        ).toString().toUpperCase();
        athleteVatStatus = (athleteVatDetails.vatStatus || athleteProfile?.vatStatus || "not_provided").toString().toLowerCase();
      }
    } catch (vatErr) {
      console.error("Error capturing VAT snapshots in click API:", vatErr.message);
    }

    const transactionId = `TX_${crypto
      .randomBytes(4)
      .toString("hex")}_${Date.now()}`;

    // Calculate amount based on campaign compensation type
    let amount = 0;
    let platformFee = 0;

    if (campaign.compensation.type === "pay-per-click") {
      amount = campaign.compensation.amount || 0.5;
      platformFee = amount * 0.2;
    } else {
      // For PPL, PPS, and Flat-fee, clicks are for tracking only (0 earnings)
      amount = 0;
      platformFee = 0;
    }

    const isTest = Boolean(
      testToken &&
      campaign.verification?.testToken &&
      testToken === campaign.verification.testToken,
    );

    // Deduplication logic: Check for existing click from same visitor and campaign in the last 24 hours
    if (!isTest) {
      const existingClick = await VisitorEvent.findOne({
        campaignId: campaign._id,
        visitorId,
        $or: [
          { eventType: "click" },
          { eventType: "conversion", "eventData.eventName": "click" },
        ],
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });

      if (existingClick) {
        return NextResponse.json(
          {
            message: "Click already tracked recently",
            redirectUrl: campaign.compensation.affiliateLinkDestination,
          },
          { status: 200, headers: { "Access-Control-Allow-Origin": "*" } },
        );
      }
    }

    // For non-PPC flows, clicks are tracking-only (amount/platformFee are 0). Skip DB write to avoid zero-amount entries.
    let newEvent = null;
    if (amount === 0 && platformFee === 0 && !isTest) {
      // no-op: keep redirect behavior below
    } else {
      const EventModel = isTest ? AdminTestEvent : VisitorEvent;
      newEvent = await EventModel.create({
        campaignId: campaign._id,
        athleteId: ambassador._id,
        brandId: campaign.brandId,
        visitorId,
        eventType: "conversion",
        eventData: {
          eventName: "click",
          transactionId,
          redirectUrl: campaign.compensation.affiliateLinkDestination,
          amount,
          platformFee,
          currency: "EUR",
          // Product-level attribution (optional for Shopify-connected campaigns)
          productId: productId || undefined,
          productHandle: productHandle || undefined,
          productName: productName || undefined,
        },
        isTest,
        // Snapshots
        brandVatCountry,
        brandVatStatus,
        athleteVatCountry,
        athleteVatStatus,
      });
    }

    // If this is a test click, mark verification as verified and skip invoicing
    if (isTest) {
      try {
        const verifyResult = await Campaign.updateOne(
          { _id: campaign._id, "verification.status": { $ne: "verified" } },
          {
            $set: {
              "verification.status": "verified",
              "verification.testClickEventId": newEvent._id,
            },
          },
        );
      } catch (e) {
        console.warn(
          "Failed to update campaign verification on test click:",
          e?.message || e,
        );
      }
    }

    // Trigger automatic invoice generation for pay-per-click campaigns (skip in test)
    if (
      !isTest &&
      campaign.compensation.type === "pay-per-click" &&
      (amount > 0 || platformFee > 0)
    ) {
      // Use setTimeout to avoid blocking the response
      setTimeout(async () => {
        try {
            const host = req.headers.get("host") || "localhost:3000";
            const proto = req.headers.get("x-forwarded-proto") || "http";
            const invoiceApiUrl = `${proto}://${host}/api/payments/generate-event-invoice`;
            await fetch(
              invoiceApiUrl,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                eventId: newEvent._id.toString(),
              }),
            },
          );
        } catch (error) {
          console.error("Auto-invoice generation failed (click):", error);
        }
      }, 1000); // 1 second delay
    }

    // Construct redirect URL
    let redirectUrl = campaign.compensation.affiliateLinkDestination || "/";

    // Check if we should redirect to a Shopify product page (PDP)
    if (brand?.brand?.shopifyDetails?.myShopifyDomain) {
      const shopDomain = brand.brand.shopifyDetails.myShopifyDomain;
      
      // Discard any productHandle that is actually a Shopify GID (e.g. "gid://shopify/Product/123").
      const isGid = typeof productHandle === "string" && productHandle.startsWith("gid://");
      const cleanHandle = isGid ? null : productHandle;

      if (cleanHandle) {
        const url = new URL(`https://${shopDomain}/products/${cleanHandle}`);
        // Add existing tracking params
        url.searchParams.set("transactionId", transactionId);
        url.searchParams.set("utm_source", "sbonssy");
        url.searchParams.set("utm_medium", "affiliate");
        if (campaignId) url.searchParams.set("utm_campaign", campaignId);
        if (athleteId) url.searchParams.set("utm_content", athleteId);

        // Add variant if known
        if (productId && productId.includes("/")) {
          // Shopify GID format often used
          const variantId = productId.split("/").pop();
          if (variantId && !isNaN(variantId)) {
            url.searchParams.set("variant", variantId);
          }
        } else if (productId && !isNaN(productId)) {
          url.searchParams.set("variant", productId);
        }

        redirectUrl = url.toString();
      } else {
        // Fallback: add transactionId to whatever the destination is
        try {
          const url = new URL(redirectUrl);
          url.searchParams.set("transactionId", transactionId);
          redirectUrl = url.toString();
        } catch (e) {
          // If not a valid URL, append as string
          redirectUrl +=
            (redirectUrl.includes("?") ? "&" : "?") +
            `transactionId=${transactionId}`;
        }
      }
    } else {
      // Non-Shopify fallback: still try to pass transactionId
      try {
        const url = new URL(redirectUrl);
        url.searchParams.set("transactionId", transactionId);
        redirectUrl = url.toString();
      } catch (e) {
        redirectUrl +=
          (redirectUrl.includes("?") ? "&" : "?") +
          `transactionId=${transactionId}`;
      }
    }

    return NextResponse.json(
      {
        message: "Click tracked",
        redirectUrl,
        transactionId,
      },
      { status: 200, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  } catch (error) {
    console.error("Error in /api/click:", error.message);
    return NextResponse.json(
      { message: error.message || "Error tracking click" },
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
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  );
}

// GET handler for shareable test link: /api/click?campaign=...&athlete=...&visitorId=...&testToken=...
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const campaignTrackingId = searchParams.get("campaign");
    const ambassadorTrackingKey = searchParams.get("athlete");
    const visitorId =
      searchParams.get("visitorId") ||
      `test_${crypto.randomBytes(6).toString("hex")}`;
    const testToken = searchParams.get("testToken");
    const returnUrl = searchParams.get("returnUrl");
    
    // Snapshots passed from landing page (useful for test links)
    const reqBrandVatCountry = searchParams.get("brandVatCountry");
    const reqBrandVatStatus = searchParams.get("brandVatStatus");
    const reqAthleteVatCountry = searchParams.get("athleteVatCountry");
    const reqAthleteVatStatus = searchParams.get("athleteVatStatus");

    if (!campaignTrackingId || !ambassadorTrackingKey || !testToken) {
      return NextResponse.json(
        { message: "Missing required params" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }

    const campaign = await Campaign.findOne({ trackingId: campaignTrackingId });
    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }

    if (
      !campaign.verification?.testToken ||
      campaign.verification.testToken !== testToken
    ) {
      return NextResponse.json(
        { message: "Invalid test token" },
        { status: 403, headers: { "Access-Control-Allow-Origin": "*" } },
      );
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
      return NextResponse.json(
        { message: "Ambassador not found" },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }

    const transactionId = `TX_${crypto
      .randomBytes(4)
      .toString("hex")}_${Date.now()}`;
    const amount = 0;
    const platformFee = 0;

    // Capture/Verify VAT snapshots (for test data consistency)
    let brandVatCountry = reqBrandVatCountry;
    let brandVatStatus = reqBrandVatStatus;
    let athleteVatCountry = reqAthleteVatCountry;
    let athleteVatStatus = reqAthleteVatStatus;

    try {
      if (!brandVatCountry || !brandVatStatus) {
        const brand = await User.findById(campaign.brandId);
        if (brand) {
          const brandVatDetails = brand.brand?.vatDetails || {};
          brandVatCountry = (brandVatDetails.vatCountry || brand.brand?.country || "").toString().toUpperCase();
          brandVatStatus = (brandVatDetails.vatStatus || "not_provided").toString().toLowerCase();
        }
      }

      if (!athleteVatCountry || !athleteVatStatus) {
        const athlete = ambassador; // already loaded at line 381
        const subRole = athlete.subRole || "athlete";
        const subRoleCamel = subRole.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        const athleteProfile = athlete[subRoleCamel];
        const athleteVatDetails = athleteProfile?.vatDetails || {};
        athleteVatCountry = (
          athleteVatDetails.vatCountry ||
          athleteVatDetails.registrationCountry ||
          athleteProfile?.vatCountry ||
          athleteProfile?.registrationCountry ||
          ""
        ).toString().toUpperCase();
        athleteVatStatus = (athleteVatDetails.vatStatus || athleteProfile?.vatStatus || "not_provided").toString().toLowerCase();
      }
    } catch (vatErr) {
      console.error("Error capturing VAT snapshots in click GET API:", vatErr.message);
    }

    const event = await AdminTestEvent.create({
      campaignId: campaign._id,
      athleteId: ambassador._id,
      brandId: campaign.brandId,
      visitorId,
      eventType: "conversion",
      eventData: {
        eventName: "click",
        transactionId,
        redirectUrl: campaign.compensation.affiliateLinkDestination,
        amount,
        platformFee,
        currency: "EUR",
      },
      isTest: true,
      // Snapshots
      brandVatCountry,
      brandVatStatus,
      athleteVatCountry,
      athleteVatStatus,
    });

    try {
      const verifyResult = await Campaign.updateOne(
        { _id: campaign._id, "verification.status": { $ne: "verified" } },
        {
          $set: {
            "verification.status": "verified",
            "verification.testClickEventId": event._id,
          },
        },
      );
      if (verifyResult?.modifiedCount === 1) {
        // Verification success - no email sent per spec
      }
    } catch (e) {
      console.warn(
        "Failed to update campaign verification (GET click):",
        e?.message || e,
      );
    }

    // Fetch brand for Shopify details
    const brand = await User.findById(campaign.brandId);

    // Construct redirect URL
    let redirectUrl = campaign.compensation.affiliateLinkDestination || "/";

    // Check if we should redirect to a Shopify product page (PDP)
    // Check if we should redirect to a Shopify product page (PDP)
    if (brand?.brand?.shopifyDetails?.myShopifyDomain) {
      const shopDomain = brand.brand.shopifyDetails.myShopifyDomain;
      
      // Look for handle in query params (passed from product share links)
      const handle = searchParams.get("handle") || searchParams.get("productHandle");
      const isGid = typeof handle === "string" && handle.startsWith("gid://");
      const cleanHandle = isGid ? null : handle;

      if (cleanHandle) {
        const url = new URL(`https://${shopDomain}/products/${cleanHandle}`);
        url.searchParams.set("transactionId", transactionId);
        url.searchParams.set("utm_source", "sbonssy");
        url.searchParams.set("utm_medium", "affiliate");
        url.searchParams.set("utm_campaign", campaignTrackingId);
        url.searchParams.set("utm_content", ambassadorTrackingKey);
        redirectUrl = url.toString();
      } else {
        // Fallback or generic campaign destination
        try {
          const url = new URL(redirectUrl);
          url.searchParams.set("transactionId", transactionId);
          url.searchParams.set("utm_source", "sbonssy");
          url.searchParams.set("utm_medium", "affiliate");
          url.searchParams.set("utm_campaign", campaignTrackingId);
          url.searchParams.set("utm_content", ambassadorTrackingKey);
          redirectUrl = url.toString();
        } catch (e) {
          redirectUrl +=
            (redirectUrl.includes("?") ? "&" : "?") +
            `transactionId=${transactionId}`;
        }
      }
    } else {
      // Non-Shopify fallback
      try {
        const url = new URL(redirectUrl);
        url.searchParams.set("transactionId", transactionId);
        redirectUrl = url.toString();
      } catch (e) {
        redirectUrl +=
          (redirectUrl.includes("?") ? "&" : "?") +
          `transactionId=${transactionId}`;
      }
    }

    // If an admin test returnUrl is provided, prefer redirecting there after verification
    if (returnUrl) {
      try {
        const safeUrl = new URL(returnUrl);
        returnUrl &&
          console.log(
            "Redirecting test verification back to:",
            safeUrl.toString(),
          );
        return NextResponse.redirect(safeUrl.toString(), {
          status: 302,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      } catch (e) {
        // If invalid returnUrl, fall back to normal behavior
        console.warn(
          "Invalid returnUrl provided to /api/click GET:",
          returnUrl,
        );
      }
    }

    return NextResponse.redirect(redirectUrl, {
      status: 302,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("Error in /api/click (GET):", error.message);
    return NextResponse.json(
      { message: error.message || "Error tracking click" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }
}
