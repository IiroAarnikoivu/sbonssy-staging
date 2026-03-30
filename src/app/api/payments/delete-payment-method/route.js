import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import stripe from "@/lib/stripe";
import User from "@/models/User";
import PaymentMethod from "@/models/PaymentMethod";
import { NextResponse } from "next/server";

export async function POST(request) {
  await connectDB();
  const { userId, stripeCustomerId, paymentMethodId, cardId } =
    await request.json();

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
    if (!userId || !stripeCustomerId || !paymentMethodId) {
      return NextResponse.json(
        {
          error: "Missing userId, stripeCustomerId, or paymentMethodId",
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
        { error: "Only brand users can delete payment methods" },
        { status: 403 },
      );
    }

    // Ensure requester is brand owner (not invited) and matches userId
    const requester = await User.findOne({ supabaseId: user.id });
    if (!requester || requester.role !== "brand") {
      return NextResponse.json(
        { error: "Unauthorized: Must be a brand" },
        { status: 403 },
      );
    }
    if (requester.invitedBy) {
      return NextResponse.json(
        { error: "Only brand owner can delete cards" },
        { status: 403 },
      );
    }
    if (String(requester._id) !== String(userId)) {
      return NextResponse.json(
        { error: "Cannot delete card for another user" },
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

    // Find and delete the payment method from MongoDB
    const paymentMethod = await PaymentMethod.findOneAndDelete({
      _id: cardId,
      userId: requester._id,
      stripeCustomerId,
      paymentMethodId,
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found in database" },
        { status: 404 },
      );
    }

    // Detach the payment method from Stripe
    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({
      data: {
        data: {
          success: true,
          message: "Payment method deleted successfully",
        },
      },
    });
  } catch (error) {
    console.error("Delete Payment Method error:", error);
    return NextResponse.json(
      { error: "Failed to delete payment method: " + error.message },
      { status: 500 },
    );
  }
}
