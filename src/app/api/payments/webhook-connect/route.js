import { connectDB } from "@/lib/db";
import stripe from "@/lib/stripe";
import User from "@/models/User";
import { NextResponse } from "next/server";
import { toCamelCase } from "@/lib/helper";

/**
 * POST handler for Stripe Connect webhooks
 *
 * Handles account.updated events to update onboarding status
 * and other Connect account events
 */
export async function POST(request) {
  await connectDB();

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "account.updated":
        await handleAccountUpdated(event.data.object);
        break;

      case "account.application.deauthorized":
        await handleAccountDeauthorized(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle account.updated webhook events
 */
async function handleAccountUpdated(account) {
  try {
    const userId = account.metadata?.userId;
    if (!userId) {
      console.warn("No userId found in account metadata");
      return;
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      console.warn(`User not found for ID: ${userId}`);
      return;
    }

    // Get the subRole
    const subRole = toCamelCase(user.subRole);
    if (
      !user[subRole]?.stripeAccountId ||
      user[subRole].stripeAccountId !== account.id
    ) {
      console.warn(`Stripe account ID mismatch for user ${userId}`);
      return;
    }

    // Determine onboarding status
    let onboardingStatus = "pending";

    if (account.charges_enabled && account.payouts_enabled) {
      if (account.requirements.currently_due.length === 0) {
        onboardingStatus = "completed";
      } else {
        onboardingStatus = "restricted";
      }
    } else if (account.requirements.disabled_reason) {
      onboardingStatus = "restricted";
    }

    // Update the user's onboarding status
    const updatePath = `${subRole}.onboardingStatus`;
    await User.updateOne({ _id: userId }, { [updatePath]: onboardingStatus });
  } catch (error) {
    console.error("Error handling account.updated:", error);
    throw error;
  }
}

/**
 * Handle account.application.deauthorized webhook events
 */
async function handleAccountDeauthorized(account) {
  try {
    const userId = account.metadata?.userId;
    if (!userId) {
      console.warn("No userId found in deauthorized account metadata");
      return;
    }

    // Find the user and clear their Stripe account info
    const user = await User.findById(userId);
    if (!user) {
      console.warn(`User not found for deauthorized account: ${userId}`);
      return;
    }

    const subRole = toCamelCase(user.subRole);
    if (user[subRole]?.stripeAccountId === account.id) {
      const updateFields = {
        [`${subRole}.stripeAccountId`]: null,
        [`${subRole}.onboardingStatus`]: "pending",
        [`${subRole}.businessType`]: "individual",
      };

      await User.updateOne({ _id: userId }, { $unset: updateFields });
    }
  } catch (error) {
    console.error("Error handling account.application.deauthorized:", error);
    throw error;
  }
}
