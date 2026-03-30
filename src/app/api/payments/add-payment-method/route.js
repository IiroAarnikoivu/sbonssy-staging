import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import stripe from "@/lib/stripe";
import User from "@/models/User";
import PaymentMethod from "@/models/PaymentMethod"; // Import the new model
import { NextResponse } from "next/server";

export async function POST(request) {
  await connectDB();
  const { userId, stripeCustomerId, paymentMethodToken } = await request.json();

  try {
    // Authenticate requester
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate request body
    if (!userId || !stripeCustomerId || !paymentMethodToken) {
      return NextResponse.json(
        {
          error: "Missing userId, stripeCustomerId, or paymentMethodToken",
        },
        { status: 400 },
      );
    }

    // Find the target user by ID
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Restrict to 'brand' role
    if (targetUser.role !== "brand") {
      return NextResponse.json(
        { error: "Only brand users can add payment methods" },
        { status: 403 },
      );
    }

    // Fetch requester brand user and ensure they are the brand owner (not invited)
    const requester = await User.findOne({ supabaseId: user.id });
    if (!requester || requester.role !== "brand") {
      return NextResponse.json(
        { error: "Unauthorized: Must be a brand" },
        { status: 403 },
      );
    }
    // Invited brand users cannot add cards
    if (requester.invitedBy) {
      return NextResponse.json(
        { error: "Only brand owner can add cards" },
        { status: 403 },
      );
    }
    // Requester must match the target userId (owner-only modification)
    if (String(requester._id) !== String(userId)) {
      return NextResponse.json(
        { error: "Cannot add card for another user" },
        { status: 403 },
      );
    }

    // Verify stripeCustomerId
    if (requester.brand?.stripeCustomerId !== stripeCustomerId) {
      return NextResponse.json(
        { error: "Invalid Stripe customer ID for this user" },
        { status: 403 },
      );
    }

    // Attach the payment method to the customer in Stripe
    const paymentMethod = await stripe.paymentMethods.attach(
      paymentMethodToken,
      {
        customer: stripeCustomerId,
      },
    );

    // Set the payment method as the default for the customer
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });

    // Save the payment method to the PaymentMethod collection
    const newPaymentMethod = new PaymentMethod({
      userId,
      stripeCustomerId,
      paymentMethodId: paymentMethod.id,
      last4: paymentMethod.card.last4,
      brand: paymentMethod.card.brand,
      exp_month: paymentMethod.card.exp_month,
      exp_year: paymentMethod.card.exp_year,
      isDefault: true, // Set as default since it's being set in Stripe
    });

    await newPaymentMethod.save();

    return NextResponse.json({
      data: {
        success: true,
        paymentMethod: {
          id: paymentMethod.id,
          last4: paymentMethod.card.last4,
          brand: paymentMethod.card.brand,
          exp_month: paymentMethod.card.exp_month,
          exp_year: paymentMethod.card.exp_year,
        },
      },
    });
  } catch (error) {
    console.error("Add Payment Method error:", error);
    let errorMessage = "Failed to add payment method";
    if (error.type === "StripeInvalidRequestError") {
      errorMessage = `Stripe error: ${error.message}`;
    } else if (error.name === "MongoError") {
      errorMessage = `Database error: ${error.message}`;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
