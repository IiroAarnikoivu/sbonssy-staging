// app/api/products/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import createClient from "@/lib/supabase/server";
import { connectDB } from "@/lib/db";

/**
 * GET /api/brand/products
 *
 * Returns products for the authenticated brand user.
 * - Auth: Supabase session must be valid.
 * - Filters: excludes products with isDeleted === true.
 * - Search: supports search query parameter for filtering by title.
 * - Domain resolution: attaches myShopifyDomain to each product using the first non-empty of
 *   product.mainAuthor.brand.shopifyDetails.myShopifyDomain,
 *   owner's domain from User (brand.shopifyDetails.myShopifyDomain | myShopifyDomain | myshopifyDomain),
 *   current shop's domain (same fallbacks),
 *   parsed hostname from product.onlineStoreUrl.
 *
 * Query Parameters:
 * - search: Optional string to filter products by title (case-insensitive)
 *
 * Response: { products: Array<Product & { myShopifyDomain: string }> }
 */
export async function GET(request) {
  try {
    const supabase = await createClient();
    // Get authenticated user from Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseId = user.id; // e.g., "2bb2fab0-a7df-4082-91df-e79938c3a254"

    // Extract search and pagination parameters from URL
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get("search");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    await connectDB();

    // Find the user in the users collection
    const userDoc = await mongoose.connection.db
      .collection("users")
      .findOne({ supabaseId });
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const mainPlatformUserId = userDoc._id.toString(); // e.g., "68943753f8be506dc56567ff"

    // Check if the brand user has Shopify connected via brand.shopifyDetails
    const hasShopifyIntegration = !!(
      userDoc?.brand?.shopifyDetails?.myShopifyDomain &&
      userDoc?.brand?.shopifyDetails?.shopifyId
    );

    if (!hasShopifyIntegration) {
      return NextResponse.json(
        {
          products: [],
          shopifyConnected: false,
          message: "Shopify store not connected",
        },
        { status: 200 }
      );
    }

    // Try to find the shop in the Shopify User collection
    const shop = await mongoose.connection.db
      .collection("User")
      .findOne({ mainPlatformUserId: mainPlatformUserId });

    // Use shop._id if available, otherwise we'll query by the user's shopifyId
    const shopId = shop?._id;

    // If there's no shop document in the Shopify User collection yet,
    // return empty products but indicate Shopify is connected
    if (!shopId) {
      return NextResponse.json({
        products: [],
        shopifyConnected: true,
        message: "Shopify connected but no products synced yet",
        pagination: {
          currentPage: page,
          totalItems: 0,
          totalPages: 0,
          limit: limit === 0 ? 10000 : limit,
        },
      });
    }

    // Build query filter
    const queryFilter = {
      userId: shopId,
      isDeleted: { $ne: true },
    };

    // Add search filter if search term is provided
    if (searchTerm && searchTerm.trim()) {
      const cleanSearchTerm = searchTerm.trim();
      queryFilter.$or = [
        { title: { $regex: cleanSearchTerm, $options: "i" } },
        { handle: { $regex: cleanSearchTerm, $options: "i" } },
        { vendor: { $regex: cleanSearchTerm, $options: "i" } },
        { productType: { $regex: cleanSearchTerm, $options: "i" } },
      ];
    }

    // Get total count for pagination
    const totalCount = await mongoose.connection.db
      .collection("Product")
      .countDocuments(queryFilter);

    // Fetch products with pagination
    console.log(limit, "limit ")
    const products = await mongoose.connection.db
      .collection("Product")
      .find(queryFilter)
      .sort({ title: 1 })
      .skip(skip)
      .limit(limit === 0 ? 10000 : limit)
      .toArray();

    // Collect unique owner IDs from products to determine their Shopify domains
    const uniqueOwnerIds = [...new Set(products.map((p) => p.userId))];

    // Normalize IDs to ObjectId for querying
    const ownerObjectIds = uniqueOwnerIds
      .map((id) => {
        try {
          // If already an ObjectId, keep it; else convert from 24-char hex string
          return typeof id === "object" &&
            id !== null &&
            id._bsontype === "ObjectID"
            ? id
            : new mongoose.Types.ObjectId(String(id));
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Fetch owners with their Shopify domains
    const owners = await mongoose.connection.db
      .collection("User")
      .find({ _id: { $in: ownerObjectIds } })
      .project({
        _id: 1,
        "brand.shopifyDetails.myShopifyDomain": 1,
        myshopifyDomain: 1,
        myShopifyDomain: 1,
      })
      .toArray();

    // Build map: ownerId (string) -> myShopifyDomain
    const ownerDomainMap = new Map(
      owners.map((o) => [
        String(o._id),
        o?.brand?.shopifyDetails?.myShopifyDomain ||
          o?.myShopifyDomain ||
          o?.myshopifyDomain ||
          "",
      ])
    );

    // Attach the correct domain per product with fallbacks
    const productsWithDomain = products.map((p) => {
      const embeddedDomain =
        p?.mainAuthor?.brand?.shopifyDetails?.myShopifyDomain;
      const ownerDomain = ownerDomainMap.get(String(p.userId));
      const shopDomain =
        shop?.brand?.shopifyDetails?.myShopifyDomain ||
        shop?.myshopifyDomain ||
        shop?.myShopifyDomain ||
        "";
      let urlDomain = "";
      try {
        if (p?.onlineStoreUrl) {
          urlDomain = new URL(p.onlineStoreUrl).hostname || "";
        }
      } catch {}
      return {
        ...p,
        myShopifyDomain:
          embeddedDomain || ownerDomain || shopDomain || urlDomain || "",
      };
    });

    return NextResponse.json({
      products: productsWithDomain,
      shopifyConnected: true,
      message: "Products loaded successfully",
      pagination: {
        currentPage: page,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        limit: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
