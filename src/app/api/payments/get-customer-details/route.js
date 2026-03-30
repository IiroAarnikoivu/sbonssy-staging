import { connectDB } from "@/lib/db";
import stripe from "@/lib/stripe";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(request) {
  await connectDB();
  const { userId } = await request.json();

  try {
    // Validate request body
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Restrict to 'brand' role
    if (user.role !== "brand") {
      return NextResponse.json(
        { error: "Only brand users can retrieve customer details" },
        { status: 403 }
      );
    }

    // Check if stripeCustomerId exists
    if (!user.brand?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer ID found for this user" },
        { status: 404 }
      );
    }

    // Retrieve the Stripe Customer
    const customer = await stripe.customers.retrieve(
      user.brand.stripeCustomerId
    );

    // Retrieve payment methods (cards) for the customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.brand.stripeCustomerId,
      type: "card",
    });

    const cards = paymentMethods.data.map((pm) => ({
      id: pm.id,
      last4: pm.card.last4,
      brand: pm.card.brand,
      exp_month: pm.card.exp_month,
      exp_year: pm.card.exp_year,
    }));

    return NextResponse.json({
      data: {
        success: true,
        customer: {
          id: customer.id,
          email: customer.email,
        },
        cards,
      },
    });
  } catch (error) {
    console.error("Get Customer Details error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve customer details: " + error.message },
      { status: 500 }
    );
  }
}
