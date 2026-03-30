import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
import Transaction from "@/models/Transaction";
import VisitorEvent from "@/models/VisitorEvent";
import Stripe from "stripe";
import { creditAmbassadorBalance } from "@/lib/ambassador/creditBalance";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { message: "Missing Stripe signature" },
        { status: 400 }
      );
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET_INVOICES
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { message: "Invalid signature" },
        { status: 400 }
      );
    }

    await connectDB();

    // Handle different invoice events
    switch (event.type) {
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case "invoice.voided":
        await handleInvoiceVoided(event.data.object);
        break;

      case "invoice.updated":
        await handleInvoiceUpdated(event.data.object);
        break;

      case "credit_note.created":
        await handleCreditNoteCreated(event.data.object);
        break;

      default:
        console.log(`Unhandled invoice webhook event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Invoice webhook error:", error);
    return NextResponse.json(
      { message: error.message || "Webhook error" },
      { status: 500 }
    );
  }
}

async function handleInvoicePaymentSucceeded(stripeInvoice) {
  try {
    // Update local invoice status
    const localInvoice = await Invoice.findOneAndUpdate(
      { stripeInvoiceId: stripeInvoice.id },
      {
        status: "paid",
        paidAt: new Date(stripeInvoice.status_transitions.paid_at * 1000),
      },
      { new: true }
    );

    if (localInvoice) {
      // Create Transaction record for webhook payment
      let paymentIntentId = stripeInvoice.payment_intent;
      let paymentMethodDetails = "N/A";

      // Try to get payment method details from PaymentIntent
      if (paymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            paymentIntentId
          );
          if (paymentIntent.payment_method) {
            const pm = await stripe.paymentMethods.retrieve(
              paymentIntent.payment_method
            );
            if (pm.card) {
              paymentMethodDetails = `${pm.card.brand} ending in ${pm.card.last4}`;
            }
          }
        } catch (pmError) {
          console.warn(
            "Could not retrieve payment method details:",
            pmError.message
          );
        }
      }

      // Use payment intent ID or create unique transaction ID for webhook payments
      const transactionId =
        paymentIntentId || `webhook_${stripeInvoice.id}_${Date.now()}`;

      // Check for existing processing transaction first
      const existingTransaction = await Transaction.findOne({
        invoiceId: stripeInvoice.id,
        status: "processing",
      });

      if (existingTransaction) {
        // Update existing processing transaction to succeeded
        await Transaction.findByIdAndUpdate(
          existingTransaction._id,
          {
            transactionId: transactionId,
            status: "succeeded",
            paymentMethod: paymentMethodDetails,
            updatedAt: new Date(),
            description: `Webhook payment for invoice ${stripeInvoice.id} (updated from processing)`,
          },
          { new: true }
        );
      } else {
        // Create new transaction record
        await Transaction.findOneAndUpdate(
          { transactionId: transactionId },
          {
            transactionId: transactionId,
            amount: stripeInvoice.amount_paid,
            currency: stripeInvoice.currency,
            status: "succeeded",
            paymentMethod: paymentMethodDetails,
            invoiceId: stripeInvoice.id,
            customerId: stripeInvoice.customer,
            brandId: localInvoice.brandId || "N/A",
            campaignId: localInvoice.campaignId || "N/A",
            createdAt: new Date(
              stripeInvoice.status_transitions.paid_at * 1000
            ),
            updatedAt: new Date(),
            description: `Webhook payment for invoice ${stripeInvoice.id}`,
          },
          { upsert: true, new: true }
        );
      }

      // Credit ambassador balance for paid invoice
      await creditAmbassadorBalance(localInvoice);

      // Send payment success email to brand
      try {
        const { sendEmail } = await import("@/lib/sendEmail");
        const User = (await import("@/models/User")).default;
        const Campaign = (await import("@/models/Campaign")).default;

        const brand = await User.findById(localInvoice.brandId);
        const campaign = await Campaign.findById(localInvoice.campaignId)
          .select("basics.title")
          .lean();

        if (brand && brand.email) {
          const campaignName = campaign?.basics?.title || "Campaign";
          const subject = `Successful payment receipt for ${campaignName}`;
          const amountDisplay = (stripeInvoice.amount_paid / 100).toFixed(2);
          const currencyUpper = stripeInvoice.currency.toUpperCase();
          const hostedUrl = stripeInvoice.hosted_invoice_url;
          const nowFormatted = new Date().toLocaleString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
            hour12: true,
            timeZone: "UTC",
          });

          const text = `Hello ${
            brand?.brand?.companyName || "there"
          },\n\nYour payment has been successfully processed for ${campaignName}.\n\nAmount Paid: ${amountDisplay} ${currencyUpper}\nPayment Date: ${nowFormatted} UTC\n\nView invoice: ${hostedUrl}\n\nThank you for your business.`;

          const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 0;">
              <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
                <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;">
               
                <p style="color: #000; margin-bottom: 16px;">Hi ${
                  brand?.brand?.companyName || "there"
                },</p>
                <p style="color: #000; margin-bottom: 12px;">Your payment has been successfully processed for <strong>${campaignName}</strong>.</p>
                <p style="color: #000; margin-bottom: 8px;"><strong>Amount Paid:</strong> ${amountDisplay} ${currencyUpper}</p>
                
                <p style="color: #000; margin-bottom: 24px;"><strong>Payment Date:</strong> ${nowFormatted} UTC</p>
                
                <a href="${hostedUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 24px; background-color: #f26915; color: #fff; text-decoration: none; border-radius: 50px; font-weight: bold;">View Invoice</a>
                
                <p style="color: #000; margin-top: 30px;">Thank you for your business,<br>Team Sbonssy</p>
              </div>
            </div>
          `;

          await sendEmail({
            to: brand.email,
            subject,
            text,
            html,
          });
        }
      } catch (emailErr) {
        console.error("Failed to send payment success email (webhook):", emailErr);
      }
    }
  } catch (error) {
    console.error("Error handling invoice payment succeeded:", error);
  }
}

async function handleInvoicePaymentFailed(stripeInvoice) {
  try {
    await Invoice.findOneAndUpdate(
      { stripeInvoiceId: stripeInvoice.id },
      {
        status: "open", // Reset to open for retry
        lastPaymentAttempt: new Date(),
      }
    );
  } catch (error) {
    console.error("Error handling invoice payment failed:", error);
  }
}

async function handleInvoiceVoided(stripeInvoice) {
  try {
    const localInvoice = await Invoice.findOneAndUpdate(
      { stripeInvoiceId: stripeInvoice.id },
      {
        status: "void",
        voidedAt: new Date(),
      },
      { new: true }
    );

    // If this was an event-based invoice, update the visitor event
    if (localInvoice && localInvoice.eventId) {
      await VisitorEvent.findByIdAndUpdate(localInvoice.eventId, {
        invoiceCancelledAt: new Date(),
        invoiceCancellationReason: "Invoice voided",
      });
    }
  } catch (error) {
    console.error("Error handling invoice voided:", error);
  }
}

async function handleInvoiceUpdated(stripeInvoice) {
  try {
    await Invoice.findOneAndUpdate(
      { stripeInvoiceId: stripeInvoice.id },
      {
        status: stripeInvoice.status,
        updatedAt: new Date(),
      }
    );
  } catch (error) {
    console.error("Error handling invoice updated:", error);
  }
}

async function handleCreditNoteCreated(creditNote) {
  try {
    // Find the invoice this credit note is for
    const localInvoice = await Invoice.findOneAndUpdate(
      { stripeInvoiceId: creditNote.invoice },
      {
        status: "credited",
        creditedAt: new Date(),
        creditNoteId: creditNote.id,
        creditAmount: creditNote.amount / 100, // Convert from cents
      },
      { new: true }
    );

    // If this was an event-based invoice, update the visitor event
    if (localInvoice && localInvoice.eventId) {
      await VisitorEvent.findByIdAndUpdate(localInvoice.eventId, {
        invoiceCancelledAt: new Date(),
        invoiceCancellationReason: "Credit note issued",
      });
    }
  } catch (error) {
    console.error("Error handling credit note created:", error);
  }
}

export async function GET() {
  return NextResponse.json({ message: "Invoice webhook endpoint" });
}
