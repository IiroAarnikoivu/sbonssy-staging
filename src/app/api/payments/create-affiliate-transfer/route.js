import { connectDB } from "@/lib/db";
import stripe from "@/lib/stripe";
import User from "@/models/User";
import { NextResponse } from "next/server";
import { toCamelCase } from "@/lib/helper";

/**
 * POST handler to create a transfer to an affiliate's Stripe Connect account
 * 
 * @param {Request} request - Incoming request with JSON body: 
 * { 
 *   affiliateId, 
 *   amount, 
 *   currency, 
 *   description, 
 *   metadata 
 * }
 * @returns {Promise<NextResponse>} JSON with transfer details or error
 */
export async function POST(request) {
  await connectDB();
  const { 
    affiliateId, 
    amount, 
    currency = "eur", 
    description, 
    metadata = {} 
  } = await request.json();

  try {
    // Validate request body
    if (!affiliateId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: affiliateId or amount" },
        { status: 400 }
      );
    }

    // Validate amount (must be positive integer in cents)
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive integer in cents" },
        { status: 400 }
      );
    }

    // Find the affiliate user
    const affiliate = await User.findById(affiliateId);
    if (!affiliate) {
      return NextResponse.json(
        { error: "Affiliate not found" },
        { status: 404 }
      );
    }

    // Ensure user is a sports ambassador
    if (affiliate.role !== "sports-ambassador") {
      return NextResponse.json(
        { error: "User is not a sports ambassador" },
        { status: 403 }
      );
    }

    // Get the subRole and Stripe account ID
    const subRole = toCamelCase(affiliate.subRole);
    const stripeAccountId = affiliate[subRole]?.stripeAccountId;

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: "Affiliate does not have a connected Stripe account" },
        { status: 400 }
      );
    }

    // Check if the account is ready for transfers
    const account = await stripe.accounts.retrieve(stripeAccountId);
    if (!account.charges_enabled || !account.payouts_enabled) {
      return NextResponse.json(
        { 
          error: "Affiliate's Stripe account is not ready for transfers",
          accountStatus: {
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            requirementsDue: account.requirements.currently_due
          }
        },
        { status: 400 }
      );
    }

    // Create the transfer
    const transfer = await stripe.transfers.create({
      amount,
      currency: currency.toLowerCase(),
      destination: stripeAccountId,
      description: description || `Commission payment to ${affiliate[subRole]?.name || 'affiliate'}`,
      metadata: {
        affiliateId,
        businessType: affiliate[subRole]?.businessType || 'individual',
        ...metadata
      }
    });

    // Return success response
    return NextResponse.json({
      success: true,
      transfer: {
        id: transfer.id,
        amount: transfer.amount,
        currency: transfer.currency,
        destination: transfer.destination,
        status: transfer.status,
        description: transfer.description,
        created: transfer.created,
        metadata: transfer.metadata
      }
    });

  } catch (error) {
    console.error("Create affiliate transfer error:", error);
    
    let errorMessage = "Failed to create transfer";
    let statusCode = 500;

    if (error.type === "StripeInvalidRequestError") {
      errorMessage = `Stripe error: ${error.message}`;
      statusCode = 400;
    } else if (error.code === "insufficient_funds") {
      errorMessage = "Insufficient funds in platform account";
      statusCode = 400;
    } else if (error.code === "account_invalid") {
      errorMessage = "Destination account is invalid or restricted";
      statusCode = 400;
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
