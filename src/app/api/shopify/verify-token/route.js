import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/helper";
import { NextResponse } from "next/server";

/**
 * POST /api/shopify/verify-token
 *
 * Verifies a Shopify token by decoding it and checking validity.
 * Used by the frontend to authenticate Shopify app access.
 *
 * @param {Request} req - HTTP request containing `shopify_token` in the JSON body.
 * @returns {NextResponse} JSON response with decoded token and validity status.
 */
export async function POST(req) {
  try {
    await connectDB();

    const { shopify_token } = await req.json();

    if (!shopify_token) {
      return NextResponse.json(
        { message: "Token is required" },
        { status: 400 }
      );
    }

    const { valid, decoded } = await verifyToken(shopify_token);

    // Flatten response for frontend: response.data.valid and response.data.data
    return NextResponse.json({ valid, data: decoded }, { status: 200 });
  } catch (error) {
    console.error("Token verification error:", error);
    return NextResponse.json(
      { error: error.message || error, message: "Something went wrong" },
      { status: 500 }
    );
  }
}
