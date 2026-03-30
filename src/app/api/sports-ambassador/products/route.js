// app/api/products/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import createClient from "@/lib/supabase/server";
import { connectDB } from "@/lib/db";
import Campaign from "@/models/Campaign";

export async function GET(request) {
  try {
    // Authentication removed - products are public data viewable on ambassador profiles
    // const supabase = await createClient();
    // const {
    //   data: { user },
    //   error,
    // } = await supabase.auth.getUser();
    // if (error || !user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    await connectDB();

    // Filter products — only those from active campaigns (stateID=1) are visible in the explorer
    const activeCampaigns = await Campaign.find({ stateID: 1 }, "products");
    const activeProductIds = new Set();
    activeCampaigns.forEach((campaign) => {
      if (campaign.products) {
        campaign.products.forEach((p) => activeProductIds.add(p.shopifyProductId));
      }
    });

    const products = await mongoose.connection.db
      .collection("Product")
      .find({ shopifyProductId: { $in: Array.from(activeProductIds) } })
      .toArray();

    // Get shopify authors (first level)
    const shopifyAuthors = await Promise.all(
      products.map(async (product) => {
        const author = await mongoose.connection.db
          .collection("User")
          .findOne({ _id: product.userId });
        return author || null;
      })
    );

    // Get main platform authors (second level)
    const mainAuthors = await Promise.all(
      shopifyAuthors.map(async (shopifyAuthor) => {
        if (!shopifyAuthor?.mainPlatformUserId) return null;

        // Fixed: Properly create ObjectId from string
        const mainPlatformUserId = new mongoose.Types.ObjectId(
          shopifyAuthor.mainPlatformUserId
        );

        return await mongoose.connection.db
          .collection("users")
          .findOne({ _id: mainPlatformUserId });
      })
    );

    // Combine everything
    const productsWithAuthors = products.map((product, index) => ({
      ...product,
      shopifyAuthor: shopifyAuthors[index],
      mainAuthor: mainAuthors[index],
    }));

    return NextResponse.json({ products: productsWithAuthors });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products", details: error.message },
      { status: 500 }
    );
  }
}
