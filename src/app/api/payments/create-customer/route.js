import { connectDB } from "@/lib/db";
import stripe from "@/lib/stripe";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(request) {
  await connectDB();
  const { userId, email } = await request.json();

  try {
    // Find the user by ID with retry logic to handle timing issues
    let user = null;
    let retryCount = 0;
    const maxRetries = 3;

    while (!user && retryCount < maxRetries) {
      user = await User.findById(userId);
      if (!user) {
        retryCount++;
        if (retryCount < maxRetries) {
          // Wait 500ms before retrying to allow user API to complete
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only support 'brand' role
    if (user.role !== "brand") {
      return NextResponse.json(
        {
          error: "Only brand users can create a Stripe customer",
        },
        { status: 403 }
      );
    }

    // Check if stripeCustomerId already exists for brand
    const existingCustomerId = user.brand?.stripeCustomerId;

    if (existingCustomerId) {
      return NextResponse.json({
        success: true,
        stripeCustomerId: existingCustomerId,
      });
    }

    // Create a Stripe customer
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });

    // Use findByIdAndUpdate for more reliable updates
    const updateResult = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          "brand.stripeCustomerId": customer.id,
        },
      },
      { new: true, runValidators: false }
    );

    // Check if the update was successful
    if (!updateResult) {
      // Try to fetch the user again to see current state
      const updatedUser = await User.findById(userId);

      return NextResponse.json(
        { error: "Failed to save Stripe customer ID" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        success: true,
        stripeCustomerId: customer.id,
      },
    });
  } catch (error) {
    console.error("Create customer error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
