import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import Script from "next/script";
import crypto from "crypto";
import mongoose from "mongoose";
import { cookies } from "next/headers";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:5200";

/**
 * @description
 * Handles redirects for affiliate links, including pay-per-click, pay-per-sale, and
 * pay-per-lead campaigns.
 *
 * @param {Object} params - Next.js page params. Requires `campaignId`.
 * @param {Object} searchParams - Next.js page query params. Requires `athlete`.
 * @param {string} searchParams.athlete - Athlete ID.
 * @param {string} [searchParams.productId] - Product ID (optional).
 * @param {string} [searchParams.productHandle] - Product handle (optional).
 *
 * @returns {JSX.Element} - Redirects to affiliate link destination with proper
 *   tracking parameters.
 *
 * @example
 * // Redirect to product page with tracking parameters
 * import CampaignLandingPage from 'next/campaign-landing-page';
 *
 * <CampaignLandingPage
 *   params={{ campaignId: 'abc123' }}
 *   searchParams={{ athlete: 'bob', productId: '12345' }}
 * />
 */
export default async function CampaignLandingPage({ params, searchParams }) {
  const { campaignId } = await params;
  const {
    athlete,
    productId: qpProductId,
    productHandle: qpProductHandle,
  } = await searchParams;

  if (!campaignId || !athlete) {
    console.error("Missing campaignId or athlete");
    redirect(BASE_URL);
  }

  try {
    await connectDB();
  } catch (error) {
    console.error("Database connection failed:", error.message);
    redirect(BASE_URL);
  }

  const campaign = await Campaign.findOne({ trackingId: campaignId })
    .populate("brandId")
    .lean();
  if (!campaign) {
    console.error("Campaign not found for trackingId:", campaignId);
    redirect(BASE_URL);
  }

  // Helper to build product page URL (without tracking params)
  const buildProductPageUrl = (productHandle) => {
    if (!productHandle || (typeof productHandle === "string" && productHandle.startsWith("gid://"))) {
      return null;
    }
    try {
      return new URL(
        `https://${campaign.brandId?.brand?.shopifyDetails?.myShopifyDomain
        }/products/${encodeURIComponent(productHandle)}`
      ).toString();
    } catch (error) {
      console.error("Error building product page URL:", error);
      return null;
    }
  };

  // Determine the appropriate destination URL based on campaign type
  let affiliateLinkDestination =
    campaign.compensation?.affiliateLinkDestination;
  // Selected product context for product-level attribution
  let selectedProductId = null;
  let selectedProductHandle = null;
  let selectedProductName = null;
  let selectedProductPrice = null;

  // Track if we generated a server-side transaction (e.g. for PPC)
  let serverTransactionId = null;

  // For Shopify-connected campaigns with products
  if (
    campaign.products?.length > 0 &&
    campaign.products.some((p) => p.shopifyProductId)
  ) {
    // Prefer product from query params if provided
    let chosen = null;
    if (qpProductHandle) {
      chosen = campaign.products.find((p) => p.handle === qpProductHandle);
    }
    if (!chosen && qpProductId) {
      chosen = campaign.products.find(
        (p) => String(p.shopifyProductId) === String(qpProductId)
      );
    }
    if (!chosen) {
      chosen = campaign.products.find((p) => p.shopifyProductId) || null;
    }

    if (chosen) {
      // Ensure handle is a valid slug, not a GID
      const isGid = (val) => typeof val === "string" && val.startsWith("gid://");
      
      selectedProductHandle = chosen.handle && !isGid(chosen.handle) ? chosen.handle : null;
      selectedProductId = chosen.shopifyProductId || null;
      selectedProductName = chosen.name || null;
      selectedProductPrice = chosen.price || null;

      // Logic to resolve slug from Product collection if handle is missing or is a GID
      if (!selectedProductHandle && selectedProductId) {
        try {
          const syncedProduct = await mongoose.connection.db
            .collection("Product")
            .findOne({ 
              $or: [
                { shopifyProductId: String(selectedProductId) },
                { handle: { $exists: true, $not: /^gid:\/\// } } // Fallback to any non-GID handle if needed
              ]
            }, { projection: { handle: 1, onlineStoreUrl: 1 } });
          
          if (syncedProduct?.handle && !isGid(syncedProduct.handle)) {
            selectedProductHandle = syncedProduct.handle;
          }

          // Prioritize onlineStoreUrl from synced Product collection
          if (syncedProduct?.onlineStoreUrl) {
            affiliateLinkDestination = syncedProduct.onlineStoreUrl;
          }
        } catch (e) {
          console.warn("Direct Product lookup failed in CampaignLandingPage:", e.message);
        }
      }
      
      // If we don't have a direct onlineStoreUrl from synced product table yet,
      // fallback to building it from handle
      if ((!affiliateLinkDestination || !isValidUrl(affiliateLinkDestination)) && selectedProductHandle) {
        const productUrl = buildProductPageUrl(selectedProductHandle);
        if (productUrl) {
          affiliateLinkDestination = productUrl;
        }
      }
    }
  }

  if (!affiliateLinkDestination || !isValidUrl(affiliateLinkDestination)) {
    console.error(
      "Invalid or missing affiliateLinkDestination:",
      affiliateLinkDestination
    );
    redirect(BASE_URL);
  }

  const cookieStore = await cookies();
  const visitorId =
    cookieStore.get("sbonssy_visitor_id")?.value ||
    `VIS_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

  // Capture VAT snapshots at event time
  let brandVatCountry = "";
  let brandVatStatus = "not_provided";
  let athleteVatCountry = "";
  let athleteVatStatus = "not_provided";

  try {
    // Brand is already populated
    const brandData = campaign.brandId?.brand || {};
    const brandVatDetails = brandData.vatDetails || {};
    brandVatCountry = (brandVatDetails.vatCountry || brandData.country || "").toString().toUpperCase();
    brandVatStatus = (brandVatDetails.vatStatus || "not_provided").toString().toLowerCase();

    // Fetch ambassador data
    const ambassadorData = await User.findOne({
      $or: [
        { "athlete.tracking_key": athlete },
        { "team.tracking_key": athlete },
        { "influencer.tracking_key": athlete },
        { "coach.tracking_key": athlete },
        { "exAthlete.tracking_key": athlete },
        { "paraAthlete.tracking_key": athlete },
      ],
    });

    if (ambassadorData) {
      const subRole = ambassadorData.subRole || "athlete";
      const subRoleCamel = subRole.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      const athleteProfile = ambassadorData[subRoleCamel];
      const athleteVatDetails = athleteProfile?.vatDetails || {};
      athleteVatCountry = (
        athleteVatDetails.vatCountry ||
        athleteVatDetails.registrationCountry ||
        athleteProfile?.vatCountry ||
        athleteProfile?.registrationCountry ||
        ""
      ).toString().toUpperCase();
      // Derive athleteVatStatus from vatStatus or uiBusinessType
      athleteVatStatus = (
        athleteVatDetails.vatStatus || 
        athleteVatDetails.uiBusinessType || 
        athleteProfile?.vatStatus || 
        athleteProfile?.uiBusinessType || 
        "not_provided"
      ).toString().toLowerCase();
    }
  } catch (vatErr) {
    console.error("Error capturing VAT snapshots in campaign landing page:", vatErr.message);
  }

  // Server-side click tracking
  try {
    const clickResponse = await fetch(`${BASE_URL}/api/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        athleteId: athlete,
        visitorId,
        eventType: "click",
        brandId: campaign.brandId?._id?.toString() || "unknown",
        // Product-level attribution (optional)
        productId: selectedProductId,
        productHandle: selectedProductHandle,
        productName: selectedProductName,
        productPrice: selectedProductPrice,
        // Snapshots
        brandVatCountry,
        brandVatStatus,
        athleteVatCountry,
        athleteVatStatus,
      }),
    });
    const clickData = await clickResponse.json();
  } catch (error) {
    console.error("Server-side click tracking error:", error.message);
  }

  // Server-side conversion tracking for pay-per-click
  if (campaign.compensation.type === "pay-per-click") {
    try {
      serverTransactionId = `TX_${crypto
        .randomBytes(4)
        .toString("hex")}_${Date.now()}`;
      const amount = campaign.compensation.amount || 0.5;
      const conversionResponse = await fetch(`${BASE_URL}/api/postback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "click",
          campaign: campaignId,
          athlete,
          visitorId,
          amount,
          currency: "EUR",
          transactionId: serverTransactionId,
          // Product-level attribution (optional)
          productId: selectedProductId,
          productHandle: selectedProductHandle,
          productName: selectedProductName,
          productPrice: selectedProductPrice,
          // Snapshots
          brandVatCountry,
          brandVatStatus,
          athleteVatCountry,
          athleteVatStatus,
        }),
      });
      // const conversionData = await conversionResponse.json();
      if (!conversionResponse.ok) {
        console.error(
          "Server-side pay-per-click conversion tracking failed:",
          conversionResponse.status
        );
      }
    } catch (error) {
      console.error(
        "Server-side pay-per-click conversion tracking error:",
        error.message
      );
    }
  }

  // Map compensation type to default event for downstream tracking scripts
  const defaultEvent =
    campaign.compensation.type === "pay-per-sale"
      ? "purchase"
      : campaign.compensation.type === "pay-per-lead"
        ? "lead"
        : campaign.compensation.type === "pay-per-click"
          ? "click"
          : "participation";

  const clientScript = `
    (async function () {
      localStorage.setItem('sbonssy_visitor_id', '${visitorId}');

      async function runTracking() {
        try {
          if (!window.sbonssyTrack) {
            console.error('sbonssyTrack not available');
            redirectToAffiliate('${affiliateLinkDestination}');
            return;
          }
          // Auto-redirect for all supported compensation types
          if (['pay-per-click', 'flat-fee', 'pay-per-sale', 'pay-per-lead'].includes('${campaign.compensation.type}')) {
            redirectToAffiliate('${affiliateLinkDestination}');
          }
        } catch (error) {
          console.error('Tracking error:', error.message);
          redirectToAffiliate('${affiliateLinkDestination}');
        }
      }

      function redirectToAffiliate(url) {
        try {
          const redirectUrl = new URL(url);
          redirectUrl.searchParams.append('athlete', '${athlete}');
          redirectUrl.searchParams.append('campaign', '${campaignId}');
          redirectUrl.searchParams.append('visitorId', '${visitorId}');
          redirectUrl.searchParams.append('amount', '${selectedProductPrice || campaign.compensation.amount || 0}');
          redirectUrl.searchParams.append('utm_source', 'sbonssy');
          redirectUrl.searchParams.append('utm_medium', 'affiliate');
          redirectUrl.searchParams.append('utm_campaign', '${campaignId}');
          redirectUrl.searchParams.append('utm_content', '${athlete}');
          // Pass compensation type and default event for correct postback mapping
          redirectUrl.searchParams.append('compType', '${campaign.compensation.type}');
          redirectUrl.searchParams.append('event', '${defaultEvent}');
          
          // Append server-generated transaction info if available (e.g. for PPC clicks)
          if ('${serverTransactionId || ""}') {
            redirectUrl.searchParams.append('transactionId', '${serverTransactionId || ""}');
          }

          // Optional product-level params
          ${selectedProductId ? `redirectUrl.searchParams.append('productId', '${selectedProductId}');` : ""}
          ${selectedProductHandle ? `redirectUrl.searchParams.append('productHandle', '${selectedProductHandle}');` : ""}
          ${selectedProductName ? `redirectUrl.searchParams.append('productName', '${selectedProductName.replace(/'/g, "\\'")}');` : ""}
          ${selectedProductPrice ? `redirectUrl.searchParams.append('productPrice', '${selectedProductPrice}');` : ""}
          
          // Pass VAT snapshots for downstream client-side tracking (script.js)
          redirectUrl.searchParams.append('brandVatCountry', '${brandVatCountry}');
          redirectUrl.searchParams.append('brandVatStatus', '${brandVatStatus}');
          redirectUrl.searchParams.append('athleteVatCountry', '${athleteVatCountry}');
          redirectUrl.searchParams.append('athleteVatStatus', '${athleteVatStatus}');
          
          window.location.href = redirectUrl.toString();
        } catch (error) {
          console.error('Error constructing affiliate redirect URL:', error.message);
          window.location.href = '${BASE_URL}';
        }
      }

      if (window.sbonssyTrack) {
        runTracking();
      } else {
        let attempts = 0;
        const maxAttempts = 20;
        const interval = setInterval(() => {
          attempts++;
          if (window.sbonssyTrack) {
            clearInterval(interval);
            runTracking();
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.error('sbonssyTrack not loaded after 1 second');
            redirectToAffiliate('${affiliateLinkDestination}');
          }
        }, 50);
      }
    })();
  `;

  return (
    <div className="container mx-auto p-4">
      <Script
        src="/tracker.js"
        data-brand={campaign.brandId?.toString() || "unknown"}
        data-campaign={campaignId}
        {...(selectedProductId ? { "data-product-id": selectedProductId } : {})}
        {...(selectedProductHandle
          ? { "data-product-handle": selectedProductHandle }
          : {})}
        {...(selectedProductName
          ? { "data-product-name": selectedProductName }
          : {})}
      />
      <Script id="sbonssy-redirect" strategy="afterInteractive">
        {clientScript}
      </Script>

      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-lg text-gray-600">Redirecting to product page...</p>
      </div>
    </div>
  );
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
