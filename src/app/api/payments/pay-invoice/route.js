import { connectDB } from "@/lib/db";
import stripe from "@/lib/stripe";
import Invoice from "@/models/Invoice";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { NextResponse } from "next/server";
import { creditAmbassadorBalance } from "@/lib/ambassador/creditBalance";

export async function POST(request) {
  await connectDB();
  const { brandId, customerId, stripeInvoiceId, paymentMethodToken } =
    await request.json();

  try {
    // Validate request body
    if (!brandId || !customerId || !stripeInvoiceId) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: brandId, customerId, or stripeInvoiceId",
        },
        { status: 400 }
      );
    }

    // Find the user by ID and validate role
    const user = await User.findById(brandId);
    if (!user) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }
    if (user.role !== "brand") {
      return NextResponse.json(
        { error: "Only brand users can pay invoices" },
        { status: 403 }
      );
    }
    if (user.brand?.stripeCustomerId !== customerId) {
      return NextResponse.json(
        { error: "Customer ID does not match user’s Stripe customer ID" },
        { status: 403 }
      );
    }

    // Retrieve local invoice to check status
    const localInvoice = await Invoice.findOne({ stripeInvoiceId });
    if (localInvoice && !["open", "draft"].includes(localInvoice.status)) {
      return NextResponse.json(
        {
          error: `Invoice cannot be paid because it is locally marked as: ${localInvoice.status}.`,
        },
        { status: 400 }
      );
    }

    // Retrieve the invoice from Stripe
    const stripeInvoice = await stripe.invoices.retrieve(stripeInvoiceId);
    if (stripeInvoice.customer !== customerId) {
      return NextResponse.json(
        { error: "Invoice does not belong to the specified customer" },
        { status: 403 }
      );
    }

    // Check if Stripe invoice is payable
    if (!["open", "draft"].includes(stripeInvoice.status)) {
      return NextResponse.json(
        { error: `Invoice cannot be paid (Stripe status: ${stripeInvoice.status})` },
        { status: 400 }
      );
    }

    // Check if invoice has amount due
    if (stripeInvoice.amount_due <= 0) {
      return NextResponse.json(
        { error: "Invoice has no amount due and cannot be paid" },
        { status: 400 }
      );
    }

    // Retrieve customer to check payment method and balance
    const customer = await stripe.customers.retrieve(customerId);

    // Validate payment method
    let paymentMethod =
      paymentMethodToken || customer.invoice_settings.default_payment_method;
    if (!paymentMethod) {
      return NextResponse.json(
        {
          error:
            "No payment method provided and no default payment method set for customer",
        },
        { status: 400 }
      );
    }

    // Verify the provided payment method is valid and attached to the customer
    if (paymentMethodToken) {
      try {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodToken);
        if (pm.customer !== customerId) {
          return NextResponse.json(
            { error: "Payment method does not belong to the customer" },
            { status: 403 }
          );
        }
      } catch (error) {
        console.error("Payment method validation error:", error);
        return NextResponse.json(
          { error: `Invalid payment method: ${error.message}` },
          { status: 400 }
        );
      }
    }

    // Finalize draft invoice if necessary
    let payableInvoice = stripeInvoice;
    if (stripeInvoice.status === "draft") {
      payableInvoice = await stripe.invoices.finalizeInvoice(stripeInvoiceId);
    }

    // Check if customer balance covers the invoice
    if (
      customer.balance < 0 &&
      -customer.balance >= payableInvoice.amount_due
    ) {
      // Mark invoice as paid in Stripe
      const paidInvoice = await stripe.invoices.pay(payableInvoice.id, {
        paid_out_of_band: true, // Indicate payment via balance
      });

      // Update local invoice
      if (localInvoice) {
        localInvoice.status = paidInvoice.status;
        localInvoice.updatedAt = new Date();
        await localInvoice.save();
      }

      // Record transaction for balance payment
      const transaction = await Transaction.findOneAndUpdate(
        { invoiceId: stripeInvoiceId },
        {
          transactionId: `balance_payment_${stripeInvoiceId}`,
          amount: paidInvoice.amount_due,
          currency: paidInvoice.currency,
          status: "succeeded",
          paymentMethod: "Customer Balance",
          invoiceId: stripeInvoiceId,
          customerId,
          brandId: localInvoice ? localInvoice.brandId : brandId,
          campaignId: localInvoice ? localInvoice.campaignId : "N/A",
          createdAt: new Date(paidInvoice.created * 1000),
          updatedAt: new Date(),
          description: `Payment for invoice ${stripeInvoiceId} via customer balance`,
        },
        { upsert: true, new: true }
      );

      // Credit ambassador balance for paid invoice
      if (localInvoice) {
        await creditAmbassadorBalance(localInvoice);
      }

      // Send payment success email to brand
      try {
        const { sendEmail } = await import("@/lib/sendEmail");
        const hostedUrl = paidInvoice.hosted_invoice_url;

        let campaignName = "Campaign";
        try {
          const Campaign = (await import("@/models/Campaign")).default;
          const campaign = await Campaign.findById(
            localInvoice?.campaignId || paidInvoice.metadata?.campaignId
          )
            .select("basics.title")
            .lean();
          campaignName = campaign?.basics?.title || campaignName;
        } catch (_) {}

        const subject = `Successful payment receipt for ${campaignName}`;
        const amountDisplay = (paidInvoice.amount_due / 100).toFixed(2);
        const currencyUpper = paidInvoice.currency.toUpperCase();
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
          user?.brand?.companyName || "there"
        },\n\nYour payment has been successfully processed for ${campaignName}.\n\nAmount Paid: ${amountDisplay} ${currencyUpper}\nPayment Date: ${nowFormatted} UTC\n\nView invoice: ${hostedUrl}\n\nThank you for your business.`;

        const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 0;">
            <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
              <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;">
             
              <p style="color: #000; margin-bottom: 16px;">Hi ${
                user?.brand?.companyName || "there"
              },</p>
              <p style="color: #000; margin-bottom: 12px;">Your payment has been successfully processed for <strong>${campaignName}</strong>.</p>
              <p style="color: #000; margin-bottom: 8px;"><strong>Amount Paid:</strong> ${amountDisplay} ${currencyUpper}</p>
              
              <p style="color: #000; margin-bottom: 24px;"><strong>Payment Date:</strong> ${nowFormatted} UTC</p>
              
              <a href="${hostedUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 24px; background-color: #f26915; color: #fff; text-decoration: none; border-radius: 50px; font-weight: bold;">View Invoice</a>
              
              <p style="color: #000; margin-top: 30px;">Thank you for your business,<br>Team Sbonssy</p>
            </div>
          </div>
        `;

        if (user?.email) {
          await sendEmail({
            to: user.email,
            subject,
            text,
            html,
          });
        }
      } catch (emailErr) {
        console.error("Failed to send payment success email (manual balance):", emailErr);
      }

      return NextResponse.json({
        success: true,
        invoice: {
          id: localInvoice?._id || paidInvoice.id,
          stripeInvoiceId: paidInvoice.id,
          campaignId:
            localInvoice?.campaignId ||
            paidInvoice.metadata?.campaignId ||
            "N/A",
          amount: localInvoice?.amount || paidInvoice.amount_due,
          currency: paidInvoice.currency,
          status: paidInvoice.status,
          periodStart:
            localInvoice?.periodStart ||
            new Date(paidInvoice.metadata?.periodStart) ||
            new Date(paidInvoice.created * 1000),
          periodEnd:
            localInvoice?.periodEnd ||
            new Date(paidInvoice.metadata?.periodEnd) ||
            new Date(paidInvoice.created * 1000),
          lineItems:
            localInvoice?.lineItems ||
            paidInvoice.lines.data.map((line) => ({
              description: line.description || "N/A",
              quantity: line.quantity || 0,
              amount: line.amount || 0,
            })),
          createdAt:
            localInvoice?.createdAt || new Date(paidInvoice.created * 1000),
        },
      });
    }

    // Pay the invoice with the selected payment method
    const paymentOptions = {
      payment_method: paymentMethod,
      off_session: true,
    };
    // Use Stripe idempotency to prevent duplicate charges on retries/double-submits
    const idempotencyKey = `invoice_pay_${stripeInvoiceId}`;
    const paidInvoice = await stripe.invoices.pay(
      payableInvoice.id,
      paymentOptions,
      { idempotencyKey }
    );

    // Use the localInvoice retrieved earlier
    if (!localInvoice) {
      console.warn(
        `No local invoice found for stripeInvoiceId: ${stripeInvoiceId}`
      );
    }

    // Handle PaymentIntent for transaction details
    let paymentMethodDetails = "N/A";
    let paymentIntentId = null;
    if (paidInvoice.payment_intent) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paidInvoice.payment_intent
      );
      paymentIntentId = paymentIntent.id;

      if (paymentIntent.status !== "succeeded") {
        return NextResponse.json(
          {
            error: `Payment requires further action: ${paymentIntent.status}`,
          },
          { status: 400 }
        );
      }

      if (paymentIntent.payment_method) {
        const pm = await stripe.paymentMethods.retrieve(
          paymentIntent.payment_method
        );
        if (pm.card) {
          paymentMethodDetails = `${pm.card.brand} ending in ${pm.card.last4}`;
        }
      }
    } else {
      // Do NOT create a manual PaymentIntent; it risks double charging.
      // Instead, try to give Stripe a moment to attach the PI, then re-fetch with expand.
      let refreshed = null;
      let attempts = 0;
      while (attempts < 3 && !refreshed) {
        // small delay
        await new Promise((r) => setTimeout(r, 400));
        const tmp = await stripe.invoices.retrieve(payableInvoice.id, {
          expand: ["payment_intent"],
        });
        if (tmp) refreshed = tmp;
        attempts++;
      }

      if (
        refreshed?.payment_intent &&
        typeof refreshed.payment_intent !== "string"
      ) {
        const pi = refreshed.payment_intent;
        paymentIntentId = pi.id;
        if (pi.status !== "succeeded") {
          return NextResponse.json(
            { error: `Payment requires further action: ${pi.status}` },
            { status: 400 }
          );
        }
        if (pi.payment_method) {
          const pm = await stripe.paymentMethods.retrieve(pi.payment_method);
          if (pm.card) {
            paymentMethodDetails = `${pm.card.brand} ending in ${pm.card.last4}`;
          }
        }
      } else {
        // If invoice is already marked paid by Stripe, accept success even without a PI (rare but possible)
        const latest = refreshed || (await stripe.invoices.retrieve(payableInvoice.id));
        if (latest?.status === "paid") {
          // Update local invoice to paid
          if (localInvoice) {
            localInvoice.status = "paid";
            localInvoice.updatedAt = new Date();
            if (latest.status_transitions?.paid_at) {
              localInvoice.paidAt = new Date(
                latest.status_transitions.paid_at * 1000
              );
            }
            await localInvoice.save();
          }
        } else {
          // Create processing transaction that will be updated by webhook
          try {
            await Transaction.findOneAndUpdate(
              { invoiceId: stripeInvoiceId },
              {
                transactionId: `processing_${stripeInvoiceId}_${Date.now()}`,
                amount: paidInvoice.amount_due,
                currency: paidInvoice.currency,
                status: "processing",
                paymentMethod: paymentMethodDetails || "N/A",
                invoiceId: stripeInvoiceId,
                customerId,
                brandId: localInvoice ? localInvoice.brandId : brandId,
                campaignId: localInvoice ? localInvoice.campaignId : "N/A",
                createdAt: new Date(paidInvoice.created * 1000),
                updatedAt: new Date(),
                description: `Processing payment for invoice ${stripeInvoiceId}`,
              },
              { upsert: true, new: true }
            );
          } catch (transactionError) {
            console.error(
              "Error creating processing transaction:",
              transactionError
            );
          }

          // Return processing response; webhook will finalize if still not paid
          return NextResponse.json(
            {
              success: true,
              processing: true,
              message:
                "Payment is processing. We will update the invoice status once Stripe confirms the charge.",
              invoice: {
                id: localInvoice?._id || paidInvoice.id,
                stripeInvoiceId: paidInvoice.id,
                status: localInvoice?.status || paidInvoice.status,
              },
            },
            { status: 202 }
          );
        }
      }
    }

    // Save or update transaction in MongoDB
    let transaction = null;
    try {
      // Use invoiceId as primary query field for consistency, with transactionId as backup
      const transactionQuery = paymentIntentId
        ? {
            $or: [
              { transactionId: paymentIntentId },
              { invoiceId: stripeInvoiceId },
            ],
          }
        : { invoiceId: stripeInvoiceId };

      transaction = await Transaction.findOneAndUpdate(
        transactionQuery,
        {
          transactionId: paymentIntentId || `manual_payment_${stripeInvoiceId}`,
          amount: paidInvoice.amount_due,
          currency: paidInvoice.currency,
          status: "succeeded",
          paymentMethod: paymentMethodDetails,
          invoiceId: stripeInvoiceId,
          customerId,
          brandId: localInvoice ? localInvoice.brandId : brandId,
          campaignId: localInvoice ? localInvoice.campaignId : "N/A",
          createdAt: new Date(paidInvoice.created * 1000),
          updatedAt: new Date(),
          description: `Manual payment for invoice ${stripeInvoiceId}`,
        },
        { upsert: true, new: true }
      );
    } catch (transactionError) {
      console.error("Error creating transaction:", transactionError);
      // Continue with the response even if transaction creation fails
    }

    // Reconcile final invoice status from Stripe (handles brief async lag)
    let finalStatus = paidInvoice.status;
    try {
      const refreshedInvoice = await stripe.invoices.retrieve(paidInvoice.id);
      if (refreshedInvoice?.status) {
        finalStatus = refreshedInvoice.status;
      }
    } catch (_) {}

    // Update local Invoice model if it exists
    if (localInvoice) {
      localInvoice.status = finalStatus;
      localInvoice.updatedAt = new Date();
      await localInvoice.save();

      // Credit ambassador balance for paid invoice
      if (finalStatus === "paid") {
        await creditAmbassadorBalance(localInvoice);

        // Send payment success email to brand
        try {
          const { sendEmail } = await import("@/lib/sendEmail");
          // Re-retrieve to get the hosted_invoice_url if not present
          const refreshedInvoice = await stripe.invoices.retrieve(
            paidInvoice.id
          );
          const hostedUrl = refreshedInvoice.hosted_invoice_url;

          let campaignName = "Campaign";
          try {
            const Campaign = (await import("@/models/Campaign")).default;
            const campaign = await Campaign.findById(
              localInvoice?.campaignId || paidInvoice.metadata?.campaignId
            )
              .select("basics.title")
              .lean();
            campaignName = campaign?.basics?.title || campaignName;
          } catch (_) {}

          const subject = `Successful payment receipt for ${campaignName}`;
          const amountDisplay = (paidInvoice.amount_due / 100).toFixed(2);
          const currencyUpper = paidInvoice.currency.toUpperCase();
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
            user?.brand?.companyName || "there"
          },\n\nYour payment has been successfully processed for ${campaignName}.\n\nAmount Paid: ${amountDisplay} ${currencyUpper}\nPayment Date: ${nowFormatted} UTC\n\nView invoice: ${hostedUrl}\n\nThank you for your business.`;

          const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 0;">
              <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
                <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;">
               
                <p style="color: #000; margin-bottom: 16px;">Hi ${
                  user?.brand?.companyName || "there"
                },</p>
                <p style="color: #000; margin-bottom: 12px;">Your payment has been successfully processed for <strong>${campaignName}</strong>.</p>
                <p style="color: #000; margin-bottom: 8px;"><strong>Amount Paid:</strong> ${amountDisplay} ${currencyUpper}</p>
                
                <p style="color: #000; margin-bottom: 24px;"><strong>Payment Date:</strong> ${nowFormatted} UTC</p>
                
                <a href="${hostedUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 24px; background-color: #f26915; color: #fff; text-decoration: none; border-radius: 50px; font-weight: bold;">View Invoice</a>
                
                <p style="color: #000; margin-top: 30px;">Thank you for your business,<br>Team Sbonssy</p>
              </div>
            </div>
          `;

          if (user?.email) {
            await sendEmail({
              to: user.email,
              subject,
              text,
              html,
            });
          }
        } catch (emailErr) {
          console.error(
            "Failed to send payment success email (manual card):",
            emailErr
          );
        }
      }
    }

    // Return updated invoice details
    return NextResponse.json({
      success: true,
      invoice: {
        id: localInvoice?._id || paidInvoice.id,
        stripeInvoiceId: paidInvoice.id,
        campaignId:
          localInvoice?.campaignId || paidInvoice.metadata?.campaignId || "N/A",
        amount: localInvoice?.amount || paidInvoice.amount_due,
        currency: paidInvoice.currency,
        status: finalStatus,
        periodStart:
          localInvoice?.periodStart ||
          new Date(paidInvoice.metadata?.periodStart) ||
          new Date(paidInvoice.created * 1000),
        periodEnd:
          localInvoice?.periodEnd ||
          new Date(paidInvoice.metadata?.periodEnd) ||
          new Date(paidInvoice.created * 1000),
        lineItems:
          localInvoice?.lineItems ||
          paidInvoice.lines.data.map((line) => ({
            description: line.description || "N/A",
            quantity: line.quantity || 0,
            amount: line.amount || 0,
          })),
        createdAt:
          localInvoice?.createdAt || new Date(paidInvoice.created * 1000),
      },
    });
  } catch (error) {
    console.error("Pay Invoice error:", error);
    let errorMessage = "Failed to pay invoice";
    if (error.type === "StripeCardError") {
      errorMessage = `Payment failed: ${error.message}`;
    } else if (error.type === "StripeInvalidRequestError") {
      errorMessage = `Stripe error: ${error.message}`;
    } else if (error.name === "MongoError") {
      errorMessage = `Database error: ${error.message}`;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
