import { NextResponse } from "next/server";
import crypto from "crypto";
import { createShopifyClient } from "@/util/shopifyClient";

const makeId = (prefix) => {
  const core =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : crypto.randomBytes(8).toString("hex");
  return `${prefix}_${core}`;
};

export async function GET(req) {
  const url = new URL(req.url);
  const shopDomain = url.searchParams.get("shop") || url.searchParams.get("shopDomain");
  const handle = url.searchParams.get("handle");
  const productPath = url.searchParams.get("path");
  const campaign = url.searchParams.get("campaign");
  const athlete = url.searchParams.get("athlete") || url.searchParams.get("affiliate");
  const variantId = url.searchParams.get("variantId") || url.searchParams.get("variant");
  const productId = url.searchParams.get("productId");

  let visitorId = url.searchParams.get("visitorId");
  let clickId = url.searchParams.get("clickId") || url.searchParams.get("click_id");

  // Discard any handle that is actually a Shopify GID (e.g. "gid://shopify/Product/123").
  // Using a GID as a URL path segment produces a 404 on the Shopify storefront.
  const isGidHandle = typeof handle === "string" && handle.startsWith("gid://");
  const cleanHandle = isGidHandle ? null : handle;

  if (!shopDomain || (!cleanHandle && !productPath)) {
    return NextResponse.json(
      { message: "shopDomain and handle/path are required" },
      { status: 400 }
    );
  }

  const amount = url.searchParams.get("amount");
  const compType = url.searchParams.get("compType");
  const event = url.searchParams.get("event") || "purchase";
  const productHandle = url.searchParams.get("productHandle");
  const productName = url.searchParams.get("productName");
  const productPrice = url.searchParams.get("productPrice");
  const brandVatCountry = url.searchParams.get("brandVatCountry");
  const brandVatStatus = url.searchParams.get("brandVatStatus");
  const athleteVatCountry = url.searchParams.get("athleteVatCountry");
  const athleteVatStatus = url.searchParams.get("athleteVatStatus");

  if (!visitorId) visitorId = makeId("VIS");
  if (!clickId) clickId = makeId("CLK");

  // Generate transactionId in the requested format
  const transactionId = `TX_${visitorId.split("_").pop()}_${crypto.randomBytes(4).toString("hex")}`;

  // Fetch storefront token for attribution, then proceed to product page redirect
  let storefrontToken = null;
  if (shopDomain && process.env.SHOPIFY_APP_URL) {
    try {
      const shopifyClient = createShopifyClient({
        baseUrl: process.env.SHOPIFY_APP_URL,
      });

      console.log(`[REDIRECT] Fetching storefront token for ${shopDomain}`);
      const tokenData = await shopifyClient.checkout.getStorefrontToken(shopDomain).catch(err => {
        console.log("[REDIRECT] getStorefrontToken failed:", err);
        // console.warn("[REDIRECT] getStorefrontToken failed:", err.message);
        return null;
      });
      if (tokenData?.token) {
        storefrontToken = tokenData.token;
        console.log("[REDIRECT] Storefront token obtained.");
      }
    } catch (err) {
      console.warn("[REDIRECT] Error during token fetching flow:", err.message);
    }
  }

  const targetPath = productPath || `/products/${cleanHandle}`;
  
  // If targetPath is a full URL (e.g. from onlineStoreUrl), use it as the base
  let target;
  if (targetPath.startsWith("http://") || targetPath.startsWith("https://")) {
    try {
      target = new URL(targetPath);
    } catch (e) {
      console.warn("Invalid full URL in path, falling back:", targetPath);
      target = new URL(
        `https://${shopDomain}${targetPath.startsWith("/") ? "" : "/"}${targetPath}`
      );

    }
  } else {
    target = new URL(
      `https://${shopDomain}${targetPath.startsWith("/") ? "" : "/"}${targetPath}`
    );
  }

  if (campaign) {
    target.searchParams.set("campaign", campaign);
    target.searchParams.set("utm_campaign", campaign);
  }
  if (athlete) {
    target.searchParams.set("athlete", athlete);
    target.searchParams.set("utm_content", athlete);
  }
  target.searchParams.set("utm_source", "sbonssy");
  target.searchParams.set("utm_medium", "affiliate");
  target.searchParams.set("visitorId", visitorId);
  target.searchParams.set("click_id", clickId);
  target.searchParams.set("transactionId", transactionId);
  
  // Pass through metadata
  if (productHandle) target.searchParams.set("productHandle", productHandle);
  if (amount) target.searchParams.set("amount", amount);
  if (compType) target.searchParams.set("compType", compType);
  if (event) target.searchParams.set("event", event);
  if (productName) target.searchParams.set("productName", productName);
  if (productPrice) target.searchParams.set("productPrice", productPrice);
  if (brandVatCountry) target.searchParams.set("brandVatCountry", brandVatCountry);
  if (brandVatStatus) target.searchParams.set("brandVatStatus", brandVatStatus);
  if (athleteVatCountry) target.searchParams.set("athleteVatCountry", athleteVatCountry);
  if (athleteVatStatus) target.searchParams.set("athleteVatStatus", athleteVatStatus);

  if (variantId) target.searchParams.set("variant", variantId);
  if (productId) target.searchParams.set("productId", productId);
  if (storefrontToken) target.searchParams.set("access_token", storefrontToken);

  console.log(`[REDIRECT] Redirecting to product page: ${target.toString()}`);
  const resp = NextResponse.redirect(target.toString(), { status: 302 });

  // Set lightweight cookies on our domain for fallback/reference (Shopify won't receive these)
  const cookieOptions = { path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 7 };
  resp.cookies.set("sbonssy_visitorId", visitorId, cookieOptions);
  resp.cookies.set("sbonssy_clickId", clickId, cookieOptions);
  if (campaign) resp.cookies.set("sbonssy_campaign", campaign, cookieOptions);
  if (athlete) resp.cookies.set("sbonssy_athlete", athlete, cookieOptions);

  return resp;
}
