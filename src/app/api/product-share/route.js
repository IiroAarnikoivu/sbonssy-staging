import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import FavoriteProduct from "@/models/FavoriteProduct";
import { toCamelCase } from "@/lib/helper";
import Campaign from "@/models/Campaign";
import ShopifyClient, { createShopifyClient } from "@/util/shopifyClient";
import { createShortLink } from "@/lib/shortLink";

// Fallback constant for development
const DEFAULT_BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:5200";

// POST /api/product-share
// Body: { productId: string, override?: { campaignTrackingId?: string, handle?: string } }
export async function POST(req) {
  const isGid = (val) => typeof val === "string" && val.startsWith("gid://");
  try {
    await connectDB();

    // Authentication removed - allow public access to generate product share links
    // const supabase = await createClient();
    // const {
    //   data: { user },
    //   error: authError,
    // } = await supabase.auth.getUser();

    // if (authError || !user?.id) {
    //   return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    // }

    // const mongoUser = await User.findOne({ supabaseId: user.id });
    // if (!mongoUser || mongoUser.role !== "sports-ambassador") {
    //   return NextResponse.json(
    //     {
    //       message:
    //         "Forbidden: Only ambassadors can generate product share links",
    //     },
    //     { status: 403 }
    //   );
    // }

    const { productId, override, userId } = await req.json();
    if (!productId) {
      return NextResponse.json(
        { message: "productId is required" },
        { status: 400 }
      );
    }

    const host = req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const BASE_URL = host ? `${proto}://${host}` : DEFAULT_BASE_URL;

    // Get user data if userId is provided, otherwise try to find favorite by productId alone
    let mongoUser = null;
    let favorite = null;

    if (userId) {
      mongoUser = await User.findById(userId).lean();
      if (mongoUser) {
        favorite = await FavoriteProduct.findOne({
          userId: mongoUser._id,
          productId,
        }).lean();
      }
    }

    // If no userId provided or favorite not found, try to find any favorite with this productId
    if (!favorite) {
      favorite = await FavoriteProduct.findOne({ productId }).lean();
      if (favorite && favorite.userId) {
        mongoUser = await User.findById(favorite.userId).lean();
      }
    }

    if (!favorite) {
      return NextResponse.json(
        { message: "Favorite product not found in profile" },
        { status: 404 }
      );
    }

    // Get tracking key from user if available
    let trackingKey = null;
    if (mongoUser && mongoUser.subRole) {
      trackingKey = mongoUser[toCamelCase(mongoUser.subRole)]?.tracking_key;
    }

    // If no tracking key, generate a generic one or use product data
    if (!trackingKey) {
      trackingKey = favorite.productData?.trackingKey || "guest";
    }

    // Determine campaign tracking id and product handle for per-product redirect
    let campaignTrackingId =
      override?.campaignTrackingId || favorite.productData?.campaignTrackingId;
    // Raw handle — may be a GID in older data; we'll resolve it after loading the campaign
    let productHandle = override?.handle || favorite.productData?.handle;
    const shopifyProductId = favorite.productData?.shopifyProductId || (isGid(productId) ? productId : null);

    // Fallback 1: If campaignTrackingId is missing, try to infer from brandId (prefer published, then recent)
    if (!campaignTrackingId && favorite.productData?.brandId) {
      const campaignByBrand = await Campaign.findOne({
        brandId: favorite.productData.brandId,
      }).sort({ stateID: -1, updatedAt: -1 }).lean();
      if (campaignByBrand) {
        campaignTrackingId = campaignByBrand.trackingId;
      }
    }

    // Fallback 2: If still missing, try to find a campaign that actually contains this product
    if (!campaignTrackingId && (shopifyProductId || productHandle)) {
      const baseQuery = [];
      if (shopifyProductId)
        baseQuery.push({
          "products.shopifyProductId": String(shopifyProductId),
        });
      if (productHandle)
        baseQuery.push({ "products.handle": String(productHandle) });

      const query = baseQuery.length > 1 ? { $or: baseQuery } : baseQuery[0];
      const scopedQuery = favorite.productData?.brandId
        ? { brandId: favorite.productData.brandId, ...query }
        : query;

      const campaignWithProduct = await Campaign.findOne(scopedQuery).sort({
        stateID: -1,
        updatedAt: -1,
      }).lean();
      if (campaignWithProduct) {
        campaignTrackingId = campaignWithProduct.trackingId;
      }
    }

    if (!campaignTrackingId) {
      return NextResponse.json(
        {
          message:
            "Missing campaignTrackingId for this favorite product. Re-add the product from a campaign or specify override.campaignTrackingId.",
        },
        { status: 400 }
      );
    }

    // Get shopify domain from campaign/brand
    const campaign = await Campaign.findOne({ trackingId: campaignTrackingId })
      .populate("brandId")
      .lean();

    if (
      !campaign ||
      !campaign.brandId?.brand?.shopifyDetails?.myShopifyDomain
    ) {
      return NextResponse.json(
        { message: "Shopify domain not found for this campaign" },
        { status: 400 }
      );
    }

    const shopDomain = campaign.brandId.brand.shopifyDetails.myShopifyDomain;

    // ── Direct Product Collection Lookup ────────────────────────────────────
    // Query the sbonssy-synced Shopify Product table for the most up-to-date data.
    // We try multiple matching strategies to ensure we find the product.
    let syncedProduct = null;
    try {
      if (shopifyProductId) {
        syncedProduct = await mongoose.connection.db
          .collection("Product")
          .findOne({ shopifyProductId: String(shopifyProductId) });
      }
      
      if (!syncedProduct && productHandle) {
        syncedProduct = await mongoose.connection.db
          .collection("Product")
          .findOne({ handle: String(productHandle) });
      }

      if (syncedProduct) {
        console.log("Direct Product found in collection:", syncedProduct.handle, syncedProduct.onlineStoreUrl);
      } else {
        console.warn("Direct Product NOT found in collection for:", shopifyProductId, productHandle);
      }
    } catch (e) {
      console.warn("Direct Product lookup failed:", e.message);
    }
    // ─────────────────────────────────────────────────────────────────────────
    // ── Resolve the real URL-slug handle ──────────────────────────────────────
    // In older campaign data the `handle` field may have been saved as a Shopify
    // GID (e.g. "gid://shopify/Product/8598292726085") instead of the URL-safe
    // slug (e.g. "ball-cap-beige").  The Shopify storefront returns a 404 when
    // the GID is used in the /products/<handle> path, which is the root cause of
    // the production 404.  We fix it here by looking up the matching product
    // inside the campaign document and using its handle when it exists and is a
    // proper slug (i.e. does NOT start with "gid://").

    const campaignProduct = campaign.products?.find((p) => {
      const idMatch =
        shopifyProductId &&
        String(p.shopifyProductId) === String(shopifyProductId);
      const handleMatch =
        productHandle && !isGid(productHandle) && p.handle === productHandle;
      return idMatch || handleMatch;
    });

    // Prefer the handle from the synced Product table first, as it is the source of truth;
    // then fall back to the campaign document; finally use raw productHandle if safe.
    const resolvedHandle =
      (syncedProduct?.handle && !isGid(syncedProduct.handle)
        ? syncedProduct.handle
        : null) ||
      (campaignProduct?.handle && !isGid(campaignProduct.handle)
        ? campaignProduct.handle
        : null) ||
      (!isGid(productHandle) ? productHandle : null) ||
      null;
    // ─────────────────────────────────────────────────────────────────────────

    // Find the product variant ID - prefer from synced product source of truth, then favorite data, fallback to campaign products
    let variantId = syncedProduct?.variantId || favorite.productData?.variantId;

    // If variantId is empty or missing, try to find it from campaign products
    if (!variantId || variantId.trim() === "") {
      const product = campaignProduct || campaign.products?.find((p) => {
        // Match by handle or shopifyProductId
        const handleMatch = resolvedHandle && p.handle === resolvedHandle;
        const idMatch =
          shopifyProductId &&
          String(p.shopifyProductId) === String(shopifyProductId);
        return handleMatch || idMatch;
      });

      variantId = product?.variantId;

      // If still no variant, try to get the first variant ID from the product
      if (
        (!variantId || variantId.trim() === "") &&
        (product?.variants?.[0]?.id || syncedProduct?.variants?.[0]?.id)
      ) {
        variantId = product?.variants?.[0]?.id || syncedProduct?.variants?.[0]?.id;
      }
    }

    // console.log('creating shopiy token')
    // // If no variantId available, create a product page link instead of checkout link
    // const shopify = createShopifyClient({
    //   baseUrl: "https://sbonssystore.icodestaging.in" // e.g. https://<ngrok|domain>
    // });
    // console.log(shopDomain);

    // let token = null;
    // try {
    //   const response = await shopify.checkout.getStorefrontToken(shopDomain);
    //   token = response?.token;
    //   console.log("Token", token);
    // } catch (err) {
    //   console.error(
    //     "Failed to get storefront token, proceeding without it:",
    //     err.message
    //   );
    // }

    // Determine if we can redirect directly to Shopify or if we must use the Sbonssy landing page fallback.
    // We can redirect if we have a variantId, a handle, or an explicit onlineStoreUrl.
    const canRedirectDirectly =
      (variantId && variantId.trim() !== "") ||
      resolvedHandle ||
      syncedProduct?.onlineStoreUrl ||
      favorite.productData?.onlineStoreUrl ||
      campaignProduct?.onlineStoreUrl;

    if (!canRedirectDirectly) {
      // Build Sbonssy campaign landing page URL instead of direct product page
      const landingPageUrl = new URL(`${BASE_URL}/campaign/${campaignTrackingId}`);
      landingPageUrl.searchParams.set("athlete", trackingKey);
      // Only append handle/productHandle if it is a real slug (not a GID)
      if (resolvedHandle) landingPageUrl.searchParams.set("productHandle", resolvedHandle);
      if (shopifyProductId) landingPageUrl.searchParams.set("productId", String(shopifyProductId));

      const shareUrl = landingPageUrl.toString();
      console.log("[product-share] Original long URL (landing page):", shareUrl);
      const shortUrl = await createShortLink(shareUrl, BASE_URL);
      console.log("[product-share] Short URL:", shortUrl);

      return NextResponse.json(
        {
          message: "Product share link generated (Sbonssy tracking)",
          shareUrl: shortUrl,
          success: true,
        },
        { status: 201 }
      );
    }

    // Redirect directly to Shopify product page with attribution params via tracked redirect
    const redirectUrl = new URL(`${BASE_URL}/api/track/shopify-redirect`);
    redirectUrl.searchParams.set("shop", shopDomain);
    redirectUrl.searchParams.set("campaign", campaignTrackingId);
    redirectUrl.searchParams.set("athlete", trackingKey);
    // Only set handle if it is a proper URL slug (not a GID)
    if (resolvedHandle) {
      redirectUrl.searchParams.set("handle", resolvedHandle);
      redirectUrl.searchParams.set("productHandle", resolvedHandle);
    }
    if (shopifyProductId) redirectUrl.searchParams.set("productId", String(shopifyProductId));
    
    // Pass the onlineStoreUrl if available to ensure correct redirection.
    // The user explicitly requested that the base URL (onlineStoreUrl) be taken
    // directly from the product collection when available.
    let onlineStoreUrl = syncedProduct?.onlineStoreUrl || favorite.productData?.onlineStoreUrl || campaignProduct?.onlineStoreUrl;
    
    // Fallback: If no onlineStoreUrl, try to find/construct one if we have handle and shopDomain.
    // However, if we found the synced product but it lacks a URL, we might still want to
    // use the constructed one as a last resort to avoid 404s.
    if (!onlineStoreUrl && shopDomain && resolvedHandle) {
      onlineStoreUrl = `https://${shopDomain}/products/${resolvedHandle}`;
    }
    
    console.log("Using onlineStoreUrl:", onlineStoreUrl);

    // ── Metadata Collection for Tracking ─────────────────────────────────────
    const brandUser = campaign.brandId; // Already populated
    const subRole = mongoUser?.subRole || "athlete";
    const subRoleKey = toCamelCase(subRole);
    
    // Compensation type
    const compType = campaign.compensation?.type || "pay-per-sale";
    
    // Product details
    const productName = syncedProduct?.title || campaignProduct?.name || favorite.productData?.name;
    const productPrice = syncedProduct?.priceRangeV2?.minVariantPrice?.amount || 
                         syncedProduct?.price || 
                         campaignProduct?.price || 
                         favorite.productData?.price;
    
    // VAT Details
    const brandVatCountry = brandUser?.brand?.vatDetails?.vatCountry || brandUser?.brand?.country;
    const brandVatStatus = brandUser?.brand?.vatDetails?.vatStatus;
    
    const athleteVatCountry = mongoUser?.[subRoleKey]?.vatDetails?.vatCountry;
    const athleteVatStatus = mongoUser?.[subRoleKey]?.vatDetails?.vatStatus;

    if (onlineStoreUrl) {
      // Pass the full URL as the path parameter; the shopify-redirect route 
      // is now updated to handle full URLs by using them as the base.
      redirectUrl.searchParams.set("path", onlineStoreUrl);
    }
    
    // Append collected metadata to redirect URL
    if (compType) redirectUrl.searchParams.set("compType", compType);
    if (productName) redirectUrl.searchParams.set("productName", productName);
    if (productPrice) {
      redirectUrl.searchParams.set("productPrice", productPrice);
      redirectUrl.searchParams.set("amount", productPrice);
    }
    if (brandVatCountry) redirectUrl.searchParams.set("brandVatCountry", brandVatCountry);
    if (brandVatStatus) redirectUrl.searchParams.set("brandVatStatus", brandVatStatus);
    if (athleteVatCountry) redirectUrl.searchParams.set("athleteVatCountry", athleteVatCountry);
    if (athleteVatStatus) redirectUrl.searchParams.set("athleteVatStatus", athleteVatStatus);
    redirectUrl.searchParams.set("event", "purchase");

    if (variantId) {
      const numericVariantId = String(variantId).includes("/")
        ? String(variantId).split("/").pop()
        : String(variantId);
      redirectUrl.searchParams.set("variantId", numericVariantId);
    }

    const shareUrl = redirectUrl.toString();
    console.log("[product-share] Original long URL (shopify redirect):", shareUrl);
    const shortUrl = await createShortLink(shareUrl, BASE_URL);
    console.log("[product-share] Short URL:", shortUrl);

    return NextResponse.json(
      { message: "Product share URL generated (Shopify redirect)", shareUrl: shortUrl, success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error generating product share URL:", error.message);
    return NextResponse.json(
      { message: error.message || "Error generating product share URL" },
      { status: 500 }
    );
  }
}
