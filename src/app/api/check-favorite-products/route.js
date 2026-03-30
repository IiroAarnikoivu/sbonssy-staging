import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FavoriteProduct from "@/models/FavoriteProduct";
import User from "@/models/User";
import createClient from "@/lib/supabase/server";

export async function POST(request) {
  try {
    await connectDB();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { productIds } = await request.json();

    if (!productIds || !Array.isArray(productIds)) {
      return NextResponse.json(
        { message: "Product IDs array is required" },
        { status: 400 }
      );
    }

    const mongoUser = await User.findOne({ supabaseId: user.id });
    if (!mongoUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Find all favorite products for this user that match the provided product IDs
    const favoriteProducts = await FavoriteProduct.find({
      userId: mongoUser._id,
      productId: { $in: productIds },
    }).select('productId');

    // Create a status map
    const statuses = {};
    productIds.forEach(productId => {
      statuses[productId] = "removed"; // default to not in favorites
    });

    // Mark products that are in favorites as "added"
    favoriteProducts.forEach(favorite => {
      statuses[favorite.productId] = "added";
    });

    return NextResponse.json(
      {
        message: "Product statuses retrieved successfully",
        statuses,
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Check favorite products error:", error);
    return NextResponse.json(
      { 
        message: "Server error",
        error: error.message 
      }, 
      { status: 500 }
    );
  }
}
