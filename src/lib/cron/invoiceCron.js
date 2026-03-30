require("dotenv").config();
const cron = require("node-cron");
const mongoose = require("mongoose");
const moment = require("moment");
const PaymentError =
  mongoose.models.PaymentError || require("../../models/PaymentError").default;
const User = mongoose.models.User || require("../../models/User").default;
const Invoice =
  mongoose.models.Invoice || require("../../models/Invoice").default;
const Campaign =
  mongoose.models.Campaign || require("../../models/Campaign").default;
const VisitorEvent =
  mongoose.models.VisitorEvent || require("../../models/VisitorEvent").default;
const Transaction =
  mongoose.models.Transaction || require("../../models/Transaction").default;
const stripe = require("../stripe").default;
const { connectDB } = require("../db");
const {
  getBrandInvoiceVATTreatment,
  calculateVATAmounts,
  getAmbassadorVATRules,
} = require("../vat/viesValidator");
const { calculateStripeProcessingFeeCents } = require("../vat/vatCalculator");

// Dynamic import helper for ES module (creditAmbassadorBalance)
async function getCreditBalanceModule() {
  const module = await import("../ambassador/creditBalance.js");
  return module;
}

/**
 * Helper function to credit ambassador balance after successful invoice payment
 * @param {Object} invoice - The local Invoice document
 */
async function creditAmbassadorBalanceAfterPayment(invoice) {
  try {
    const { creditAmbassadorBalance } = await getCreditBalanceModule();
    const result = await creditAmbassadorBalance(invoice);
    // if (result.success) {
    //   console.log(
    //     `💰 Credited ${result.creditedCount} ambassador(s) for invoice ${invoice.stripeInvoiceId}`,
    //   );
    // } else if (result.error) {
    //   console.error(
    //     `❌ Failed to credit balance for invoice ${invoice.stripeInvoiceId}:`,
    //     result.error,
    //   );
    // }
    return result;
  } catch (creditError) {
    console.error(
      `❌ Error crediting ambassador balance for invoice ${invoice.stripeInvoiceId}:`,
      creditError.message,
    );
    return { success: false, error: creditError.message };
  }
}

// Core function: generate invoice for visitor events that are exactly 1 month old
async function generateInvoicesForVisitorEvents() {
  try {
    await connectDB();

    // Calculate the exact time range for events that are 1 month old
    const now = moment().utc();
    const oneMonthAgo = now.clone().subtract(1, "month");

    // Find all conversion events (non-refund) from the full day exactly 1 month ago
    const startTime = oneMonthAgo.clone().startOf("day").toDate();
    const endTime = oneMonthAgo.clone().endOf("day").toDate();

    // Find all conversion events (non-refund) that haven't been invoiced yet and are exactly 1 month old
    const uninvoicedEvents = await VisitorEvent.find({
      eventType: "conversion",
      "eventData.eventName": { $ne: "refund" },
      cancelledAt: { $exists: false },
      commissionStatus: { $ne: "cancelled" },
      createdAt: {
        $gte: startTime,
        $lte: endTime,
      },
      $or: [
        { invoicedAt: { $exists: false } },
        { invoicedAt: null },
        { invoicedInvoiceId: { $exists: false } },
        { invoicedInvoiceId: null },
      ],
    }).lean();

    let successfulInvoices = 0;
    let failedInvoices = 0;

    for (const event of uninvoicedEvents) {
      try {
        // Safety: skip cancelled events
        if (event.cancelledAt || event.commissionStatus === "cancelled") {
          continue;
        }
        const eventDate = moment(event.createdAt).utc();
        const invoiceDate = now;
        const monthsDiff = invoiceDate.diff(eventDate, "months", true);

        // Load brand user
        const user = await User.findById(event.brandId);
        if (!user || user.role !== "brand") {
          continue;
        }

        // Load ambassador and their VAT details (Gold Standard: use snapshots; fallback to current for legacy)
        const athlete = await User.findById(event.athleteId);
        if (!athlete) continue;

        let athleteVatCountry = event.athleteVatCountry;
        let athleteVatStatus = event.athleteVatStatus;

        if (typeof athleteVatStatus === "undefined") {
          const subRole = athlete.subRole || "athlete";
          const subRoleCamel = subRole.replace(/-([a-z])/g, (g) =>
            g[1].toUpperCase(),
          );
          const athleteProfile = athlete[subRoleCamel];
          const athleteVatDetails = athleteProfile?.vatDetails || {};
          athleteVatCountry = (
            athleteVatDetails.vatCountry ||
            athleteVatDetails.registrationCountry ||
            athleteProfile?.vatCountry ||
            athleteProfile?.registrationCountry ||
            ""
          )
            .toString()
            .toUpperCase();
          athleteVatStatus = (
            athleteVatDetails.vatStatus ||
            athleteProfile?.vatStatus ||
            "not_provided"
          )
            .toString()
            .toLowerCase();
        } else {
          athleteVatCountry = (athleteVatCountry || "")
            .toString()
            .toUpperCase();
          athleteVatStatus = (athleteVatStatus || "not_provided")
            .toString()
            .toLowerCase();
        }

        // Load campaign for description alignment
        const campaign = await Campaign.findById(event.campaignId);

        // Ensure Stripe customer exists
        if (!user.brand?.stripeCustomerId) {
          try {
            const customer = await stripe.customers.create({
              email: user.email,
              metadata: { userId: user._id.toString() },
            });
            await User.updateOne(
              { _id: user._id },
              { "brand.stripeCustomerId": customer.id },
            );
            user.brand = user.brand || {};
            user.brand.stripeCustomerId = customer.id;
          } catch (customerError) {
            console.error(
              `❌ Failed to create Stripe customer for brand ${user._id}:`,
              customerError.message,
            );
            failedInvoices++;
            continue;
          }
        }

        // Verify customer has a default payment method
        try {
          const customer = await stripe.customers.retrieve(
            user.brand.stripeCustomerId,
          );
          if (!customer.invoice_settings.default_payment_method) {
            continue;
          }
        } catch (customerError) {
          console.error(
            `❌ Failed to retrieve Stripe customer for brand ${user._id}:`,
            customerError.message,
          );
          failedInvoices++;
          continue;
        }

        // Standardize base amounts to absolute values (to match API)
        const ambassadorAmount = Math.abs(Number(event.eventData?.amount || 0));
        const platformFee = Math.abs(Number(event.eventData?.platformFee || 0));
        const eventCurrency = (
          event.eventData?.currency || "EUR"
        ).toLowerCase();

        // VAT logic: Use centralized VAT treatment helper (matching API's getBrandInvoiceVATTreatment logic)
        let vatTreatment = {
          vatTreatment: "reverse_charge",
          vatRate: 0,
          chargeVat: false,
          notes: ["No VAT (non-FI or not valid)"],
        };
        try {
          // Get brand's VAT details (Gold Standard: Snapshots fallback to current)
          const brandVatDetails = user?.brand?.vatDetails || {};

          let brandCountry = event.brandVatCountry;
          let brandVatStatus = event.brandVatStatus;

          if (typeof brandVatStatus === "undefined") {
            brandCountry = (
              brandVatDetails.vatCountry ||
              brandVatDetails.registrationCountry ||
              user?.brand?.country ||
              ""
            )
              .toString()
              .toUpperCase();
            brandVatStatus = (brandVatDetails.vatStatus || "not_provided")
              .toString()
              .toLowerCase();
          } else {
            brandCountry = (brandCountry || "").toString().toUpperCase();
            brandVatStatus = (brandVatStatus || "not_provided")
              .toString()
              .toLowerCase();
          }

          const treatment = getBrandInvoiceVATTreatment(
            brandCountry,
            brandVatStatus,
          );
          vatTreatment = {
            vatTreatment: treatment.vatTreatment,
            vatRate: treatment.vatRate,
            chargeVat: treatment.chargeVat,
            notes: treatment.notes,
          };
        } catch (err) {
          console.error("[CRON INVOICE] VAT treatment fallback", err?.message);
        }

        // Calculate VAT on total of earnings and platform fee (EXCLUDING Stripe fees - matching API)
        const baseAmount = ambassadorAmount + platformFee;
        const vatCalculation = calculateVATAmounts(
          baseAmount,
          vatTreatment.vatRate,
        );
        const vatAmountCents = Math.round(vatCalculation.vatAmount * 100);

        // Stripe processing fee is calculated on baseAmount (earnings + platformFee)
        const feeBaseCents = Math.round(baseAmount * 100);
        const stripeFeeCents = calculateStripeProcessingFeeCents(feeBaseCents);

        const totalAmount = baseAmount + vatCalculation.vatAmount;
        const totalCents = Math.round(totalAmount * 100) + stripeFeeCents; // subtotal + VAT + Stripe fee

        if (!Number.isFinite(totalCents) || totalCents <= 0) {
          continue;
        }

        const periodStartIso = new Date(event.createdAt).toISOString();
        const periodEndIso = new Date(event.createdAt).toISOString();

        // Create Stripe invoice (matched to manual invoice logic)
        const invoice = await stripe.invoices.create({
          customer: user.brand.stripeCustomerId,
          collection_method: "send_invoice", // send_invoice instead of charge_automatically
          days_until_due: 30, // 30 days due instead of immediate
          auto_advance: true,
          currency: eventCurrency,
          description: `Automated Invoice for ${event.eventData?.eventName || "conversion"} event - Campaign: ${campaign?.name || "N/A"}`,
          footer: (vatTreatment.notes || []).filter(Boolean).join(" | "),
          metadata: {
            campaignId: event.campaignId.toString(),
            periodStart: periodStartIso,
            periodEnd: periodEndIso,
            metrics: JSON.stringify({
              clicks: event.eventType === "click" ? 1 : 0,
              conversions: event.eventType === "conversion" ? 1 : 0,
            }),
            eventId: event._id.toString(),
            eventDate: eventDate.format("YYYY-MM-DD HH:mm:ss"),
            eventType: event.eventData?.eventName || "conversion", // Added eventType for alignment
            invoiceGeneratedAfter: "1 month",
            vatTreatment: vatTreatment.vatTreatment,
            vatRate: vatTreatment.vatRate.toString(),
            vatAmount: vatCalculation.vatAmount.toString(),
            baseAmount: baseAmount.toString(),
            brandCountry: (
              user?.brand?.vatDetails?.vatCountry ||
              user?.brand?.country ||
              ""
            )
              .toString()
              .toUpperCase(),
            brandVatStatus: (
              user?.brand?.vatDetails?.vatStatus || "not_provided"
            )
              .toString()
              .toLowerCase(),
            vatNotes: vatTreatment.notes.join(", "),
          },
        });

        // Ambassador earnings line item
        if (earnings > 0) {
          await stripe.invoiceItems.create({
            customer: user.brand.stripeCustomerId,
            invoice: invoice.id,
            amount: Math.round(earnings * 100),
            currency: eventCurrency,
            description: `Ambassador Commission - ${athlete?.firstName || ""} ${athlete?.lastName || ""}`,
            metadata: {
              type: "ambassador_earnings",
              eventId: event._id.toString(),
              athleteId: event.athleteId.toString(),
              athleteVatCountry: athleteVatCountry,
              athleteVatStatus: athleteVatStatus,
            },
          });
        }

        // Platform fee line item
        if (platformFee > 0) {
          await stripe.invoiceItems.create({
            customer: user.brand.stripeCustomerId,
            invoice: invoice.id,
            amount: Math.round(platformFee * 100),
            currency: eventCurrency,
            description: "Platform fee",
            metadata: {
              type: "platform_fee",
              eventId: event._id.toString(),
            },
          });
        }

        // VAT line item (when brand has valid FI VAT)
        if (vatCalculation.vatAmount > 0) {
          await stripe.invoiceItems.create({
            customer: user.brand.stripeCustomerId,
            invoice: invoice.id,
            amount: Math.round(vatCalculation.vatAmount * 100),
            currency: eventCurrency,
            description: `VAT ${(vatTreatment.vatRate * 100).toFixed(1)}% (${vatTreatment.vatTreatment})`,
            metadata: {
              type: "vat",
              eventId: event._id.toString(),
              vatRate: vatTreatment.vatRate.toString(),
              vatTreatment: vatTreatment.vatTreatment,
            },
          });
        }

        // Stripe processing fee line item (no VAT)
        if (stripeFeeAdjustedCents > 0) {
          await stripe.invoiceItems.create({
            customer: user.brand.stripeCustomerId,
            invoice: invoice.id,
            amount: stripeFeeAdjustedCents,
            currency: eventCurrency,
            description: "Payment processing fee (Stripe)",
            metadata: {
              type: "stripe_processing_fee",
              eventId: event._id.toString(),
              vatIncluded: "false",
              vatRate: "0",
            },
          });
        }

        // Finalize invoice
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(
          invoice.id,
        );

        // Persist invoice
        const savedInvoice = await Invoice.create({
          brandId: user._id,
          campaignId: event.campaignId.toString(),
          eventId: event._id,
          stripeInvoiceId: invoice.id,
          amount: totalCents,
          currency: eventCurrency,
          periodStart: new Date(periodStartIso),
          periodEnd: new Date(periodEndIso),
          status: finalizedInvoice.status,
          // VAT information (based on brand's VAT status)
          subtotal: Math.round(baseAmount * 100), // earnings + platformFee
          vatAmount: vatAmountCents, // VAT amount when brand has valid FI VAT
          vatRate: vatTreatment.vatRate,
          vatTreatment: vatTreatment.vatTreatment,
          total: totalCents, // subtotal + VAT + stripe processing fee
          baseAmount: Math.round(baseAmount * 100), // subtotal before VAT and Stripe fee
          brandCountry: (
            user?.brand?.vatDetails?.vatCountry ||
            user?.brand?.country ||
            ""
          )
            .toString()
            .toUpperCase(),
          brandVatStatus: (user?.brand?.vatDetails?.vatStatus || "not_provided")
            .toString()
            .toLowerCase(),
          notes: vatTreatment.notes || [],
          lineItems: [
            ...(ambassadorAmount > 0
              ? [
                  {
                    description: `Ambassador Commission - ${athlete?.firstName || ""} ${athlete?.lastName || ""}`,
                    amount: Math.round(ambassadorAmount * 100),
                    metadata: {
                      type: "ambassador_earnings",
                      eventId: event._id.toString(),
                      athleteId: event.athleteId.toString(),
                      athleteVatCountry: athleteVatCountry,
                      athleteVatStatus: athleteVatStatus,
                    },
                  },
                ]
              : []),
            ...(platformFee > 0
              ? [
                  {
                    description: "Platform fee",
                    amount: Math.round(platformFee * 100),
                    metadata: {
                      type: "platform_fee",
                      eventId: event._id.toString(),
                    },
                  },
                ]
              : []),
            ...(vatCalculation.vatAmount > 0
              ? [
                  {
                    description: `VAT ${(vatTreatment.vatRate * 100).toFixed(1)}% (${vatTreatment.vatTreatment})`,
                    amount: Math.round(vatCalculation.vatAmount * 100),
                    metadata: {
                      type: "vat",
                      eventId: event._id.toString(),
                      vatRate: vatTreatment.vatRate.toString(),
                      vatTreatment: vatTreatment.vatTreatment,
                    },
                  },
                ]
              : []),
            ...(stripeFeeAdjustedCents > 0
              ? [
                  {
                    description: "Payment processing fee (Stripe)",
                    amount: stripeFeeAdjustedCents,
                    metadata: {
                      type: "stripe_processing_fee",
                      eventId: event._id.toString(),
                      vatIncluded: "false",
                      vatRate: "0",
                    },
                  },
                ]
              : []),
          ],
          metrics: {
            clicks: event.eventType === "click" ? 1 : 0,
            conversions: event.eventType === "conversion" ? 1 : 0,
          },
        });

        // Mark event as invoiced
        await VisitorEvent.updateOne(
          { _id: event._id },
          { invoicedAt: new Date(), invoicedInvoiceId: invoice.id },
        );

        // Email notification removed - will be sent after payment success instead

        successfulInvoices++;
      } catch (eventError) {
        failedInvoices++;
        console.error(
          `❌ Error processing event ${event._id}:`,
          eventError.message,
        );
      }
    }
    return { successfulInvoices, failedInvoices };
  } catch (error) {
    console.error(
      "❌ Critical error in monthly invoice generation:",
      error.message,
      error.stack,
    );
    return { successfulInvoices: 0, failedInvoices: 0 };
  }
}

// Monthly invoice generation CRON job - runs daily at 12 noon
// This generates invoices for events that are exactly 1 month old (by date)
// Example: Event on Sep 25, 2025 (any time) → Invoice on Oct 25, 2025 at 12 noon
if (process.env.NODE_ENV === "production")
  cron.schedule(
    "0 12 * * *", // Run daily at 12 noon UTC

    async () => {
      try {
        await connectDB();
        // console.log(
        //   `🚀 Starting daily invoice generation check at ${moment()
        //     .utc()
        //     .format("YYYY-MM-DD HH:mm:ss")} UTC`,
        // );
        await generateInvoicesForVisitorEvents();
      } catch (error) {
        console.error(
          "CRITICAL ERROR in monthly invoice generation:",
          error.message,
          error.stack,
        );
      }
    },
    { scheduled: true, timezone: "UTC" },
  );

// CRON job to pay invoices that were generated exactly 1 day ago
if (process.env.NODE_ENV === "production")
  cron.schedule(
    "0 9 * * *", // Run daily at 9:00 AM UTC
    async () => {
      try {
        await connectDB();

        // Calculate the exact date range for invoices generated 1 day ago
        const now = moment().utc();
        const oneDayAgo = now.clone().subtract(1, "day");

        // Get invoices created exactly 1 day ago (full day range)
        const startOfTargetDate = oneDayAgo.clone().startOf("day").toDate();
        const endOfTargetDate = oneDayAgo.clone().endOf("day").toDate();

        // console.log(
        //   `💳 Payment processing started at ${now.format(
        //     "YYYY-MM-DD HH:mm:ss",
        //   )} UTC`,
        // );
        // console.log(
        //   `🎯 Looking for invoices generated on: ${oneDayAgo.format(
        //     "YYYY-MM-DD",
        //   )} (exactly 1 day ago)`,
        // );
        // console.log(
        //   `⏰ Date range: ${startOfTargetDate.toISOString()} to ${endOfTargetDate.toISOString()}`,
        // );

        // Find all unpaid invoices that were created exactly 1 day ago
        const unpaidInvoices = await Invoice.find({
          status: { $in: ["open", "draft"] }, // Only pay open or draft invoices
          createdAt: {
            $gte: startOfTargetDate,
            $lte: endOfTargetDate,
          },
        }).populate("brandId");

        // console.log(
        //   `📋 Found ${
        //     unpaidInvoices.length
        //   } unpaid invoices from ${oneDayAgo.format("YYYY-MM-DD")}`,
        // );

        let successfulPayments = 0;
        let failedPayments = 0;

        // Group successful payments by brand to send a single consolidated email receipt
        const brandSuccessPayments = {};

        for (const invoice of unpaidInvoices) {
          try {
            const invoiceDate = moment(invoice.createdAt).utc();
            const paymentDate = now;
            const daysDiff = paymentDate.diff(invoiceDate, "days", true);

            // console.log(
            //   `💰 Processing payment for invoice ${
            //     invoice.stripeInvoiceId
            //   } (generated ${invoiceDate.format(
            //     "YYYY-MM-DD HH:mm:ss",
            //   )}, ${daysDiff.toFixed(1)} days ago)`,
            // );

            // Enhanced duplicate detection - check for existing successful or processing transactions
            const existingTransaction = await Transaction.findOne({
              invoiceId: invoice.stripeInvoiceId,
              status: { $in: ["succeeded", "processing"] },
            });

            if (existingTransaction) {
              // console.log(
              //   `⚠️ Skipping invoice ${invoice.stripeInvoiceId}: Payment already ${existingTransaction.status}`,
              // );
              continue;
            }

            // Check for recent payment attempts within 5 minutes
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const recentAttempt = await Transaction.findOne({
              invoiceId: invoice.stripeInvoiceId,
              createdAt: { $gte: fiveMinutesAgo },
              status: { $in: ["succeeded", "processing"] },
            });

            if (recentAttempt) {
              // console.log(
              //   `⚠️ Skipping invoice ${invoice.stripeInvoiceId}: Recent payment attempt found (${recentAttempt.status})`,
              // );
              continue;
            }

            // Use proper payment logic matching the API route
            const brand = invoice.brandId;
            if (!brand || !brand.brand?.stripeCustomerId) {
              // console.log(
              //   `⚠️ Skipping invoice ${invoice.stripeInvoiceId}: No Stripe customer for brand ${brand?._id}`,
              // );

              // Log payment error for missing customer
              try {
                const eventDetails = invoice.eventId
                  ? await VisitorEvent.findById(invoice.eventId)
                      .select("athleteId visitorId")
                      .lean()
                  : null;

                await PaymentError.createPaymentError({
                  brandId: brand?._id || invoice.brandId,
                  campaignId: invoice.campaignId,
                  athleteId: eventDetails?.athleteId || null,
                  visitorId: eventDetails?.visitorId || null,
                  invoiceId: invoice._id.toString(),
                  stripeInvoiceId: invoice.stripeInvoiceId,
                  amount: invoice.amount,
                  currency: invoice.currency,
                  errorReason: "customer_not_found",
                  errorMessage: `Brand ${
                    brand?._id || invoice.brandId
                  } has no Stripe customer configured`,
                  errorCode: null,
                  paymentContext: "cron_automatic",
                  metadata: {
                    invoiceCreatedAt: invoice.createdAt,
                    brandEmail: brand?.email,
                    brandName: brand?.brand?.companyName,
                  },
                });
              } catch (logError) {
                console.error("Failed to log payment error:", logError.message);
              }

              continue;
            }

            // Retrieve the invoice from Stripe to check its current status
            const stripeInvoice = await stripe.invoices.retrieve(
              invoice.stripeInvoiceId,
            );

            // Explicit local status validation - skip if already cancelled or paid
            if (!["open", "draft"].includes(invoice.status)) {
              // console.log(
              //   `⚠️ Skipping invoice ${invoice.stripeInvoiceId}: Local status is ${invoice.status}`,
              // );
              continue;
            }

            // Enhanced status validation - skip if already paid
            if (!["open", "draft"].includes(stripeInvoice.status)) {
              if (stripeInvoice.status === "paid") {
                // console.log(
                //   `⚠️ Skipping invoice ${invoice.stripeInvoiceId}: Already paid in Stripe`,
                // );
                // Update local invoice status to match Stripe
                invoice.status = stripeInvoice.status;
                await invoice.save();
                continue;
              }
              // console.log(
              //   `⚠️ Skipping invoice ${invoice.stripeInvoiceId}: Cannot be paid (status: ${stripeInvoice.status})`,
              // );
              continue;
            }

            // Retrieve customer to check payment method
            const customer = await stripe.customers.retrieve(
              brand.brand.stripeCustomerId,
            );
            const paymentMethod =
              customer.invoice_settings.default_payment_method;

            if (!paymentMethod) {
              // console.log(
              //   `⚠️ Skipping invoice ${invoice.stripeInvoiceId}: No default payment method for brand ${brand._id}`,
              // );

              // Log payment error for missing payment method
              try {
                const eventDetails = invoice.eventId
                  ? await VisitorEvent.findById(invoice.eventId)
                      .select("athleteId visitorId")
                      .lean()
                  : null;

                await PaymentError.createPaymentError({
                  brandId: brand._id,
                  campaignId: invoice.campaignId,
                  athleteId: eventDetails?.athleteId || null,
                  visitorId: eventDetails?.visitorId || null,
                  invoiceId: invoice._id.toString(),
                  stripeInvoiceId: invoice.stripeInvoiceId,
                  amount: invoice.amount,
                  currency: invoice.currency,
                  errorReason: "no_default_payment_method",
                  errorMessage: `Brand ${brand._id} has no default payment method configured`,
                  errorCode: null,
                  paymentContext: "cron_automatic",
                  metadata: {
                    invoiceCreatedAt: invoice.createdAt,
                    brandEmail: brand.email,
                    brandName: brand.brand?.companyName,
                  },
                });
              } catch (logError) {
                console.error("Failed to log payment error:", logError.message);
              }

              continue;
            }

            // Finalize draft invoice if necessary
            let payableInvoice = stripeInvoice;
            if (stripeInvoice.status === "draft") {
              payableInvoice = await stripe.invoices.finalizeInvoice(
                invoice.stripeInvoiceId,
              );
              // console.log(
              //   `📋 Finalized draft invoice ${invoice.stripeInvoiceId}`,
              // );
            }

            // Check if customer balance covers the invoice
            if (
              customer.balance < 0 &&
              -customer.balance >= payableInvoice.amount_due
            ) {
              // console.log(
              //   `💰 Invoice ${
              //     invoice.stripeInvoiceId
              //   } paid using customer balance: ${-customer.balance}`,
              // );

              // Pay with customer balance using consistent idempotency key
              const balanceIdempotencyKey = `balance_pay_${invoice.stripeInvoiceId}`;
              const paidInvoice = await stripe.invoices.pay(
                payableInvoice.id,
                {
                  paid_out_of_band: true, // Indicate payment via balance
                },
                { idempotencyKey: balanceIdempotencyKey },
              );

              // Update local invoice status
              invoice.status = paidInvoice.status;
              await invoice.save();

              // Record transaction for balance payment with duplicate prevention
              await Transaction.findOneAndUpdate(
                { invoiceId: invoice.stripeInvoiceId },
                {
                  transactionId: `balance_payment_${invoice.stripeInvoiceId}`,
                  amount: paidInvoice.amount_due,
                  currency: paidInvoice.currency,
                  status: "succeeded",
                  paymentMethod: "Customer Balance",
                  invoiceId: invoice.stripeInvoiceId,
                  customerId: brand.brand.stripeCustomerId,
                  brandId: brand._id,
                  campaignId: invoice.campaignId,
                  createdAt: new Date(paidInvoice.created * 1000),
                  updatedAt: new Date(),
                  description: `Automatic payment for invoice ${
                    invoice.stripeInvoiceId
                  } via customer balance (generated ${invoiceDate.format(
                    "YYYY-MM-DD HH:mm:ss",
                  )})`,
                },
                { upsert: true, new: true },
              );

              successfulPayments++;
              // console.log(
              //   `✅ Successfully paid invoice ${
              //     invoice.stripeInvoiceId
              //   } via customer balance (generated ${invoiceDate.format(
              //     "YYYY-MM-DD HH:mm:ss",
              //   )}, ${daysDiff.toFixed(1)} days ago)`,
              // );

              // Credit ambassador balance for this paid invoice
              await creditAmbassadorBalanceAfterPayment(invoice);

              // Collect details for consolidated receipt
              if (brand?.email) {
                if (!brandSuccessPayments[brand._id]) {
                  brandSuccessPayments[brand._id] = {
                    brand: brand,
                    payments: [],
                  };
                }

                let campaignName = "Campaign";
                try {
                  const campaign = await Campaign.findById(invoice.campaignId)
                    .select("basics.title")
                    .lean();
                  campaignName = campaign?.basics?.title || campaignName;
                } catch (_) {}

                brandSuccessPayments[brand._id].payments.push({
                  campaignName,
                  amount: (paidInvoice.amount_due / 100).toFixed(2),
                  currency: paidInvoice.currency.toUpperCase(),
                  hostedUrl: paidInvoice.hosted_invoice_url,
                });
              }

              continue;
            }

            // Create a processing transaction record to prevent duplicate payments
            const processingTransaction = await Transaction.create({
              transactionId: `cron_processing_${
                invoice.stripeInvoiceId
              }_${Date.now()}`,
              amount: stripeInvoice.amount_due,
              currency: stripeInvoice.currency,
              status: "processing",
              paymentMethod: "Cron Processing",
              invoiceId: invoice.stripeInvoiceId,
              customerId: brand.brand.stripeCustomerId,
              brandId: brand._id,
              campaignId: invoice.campaignId,
              createdAt: new Date(),
              description: `Cron processing payment for invoice ${invoice.stripeInvoiceId}`,
            });

            // Pay the invoice with the default payment method using idempotency key
            const paymentOptions = {
              payment_method: paymentMethod,
              off_session: true,
            };
            // Use Stripe idempotency to prevent duplicate charges on retries/double-submits
            const idempotencyKey = `invoice_pay_${invoice.stripeInvoiceId}`;
            const paidInvoice = await stripe.invoices.pay(
              payableInvoice.id,
              paymentOptions,
              { idempotencyKey },
            );

            // console.log(`💳 Paid invoice ${invoice.stripeInvoiceId}:`, {
            //   status: paidInvoice.status,
            //   payment_intent: paidInvoice.payment_intent,
            //   amount_paid: paidInvoice.amount_paid,
            //   payment_method: paymentMethod,
            // });

            // Handle PaymentIntent for transaction details
            let paymentMethodDetails = "Automatic Payment";
            let paymentIntentId = null;

            if (paidInvoice.payment_intent) {
              const paymentIntent = await stripe.paymentIntents.retrieve(
                paidInvoice.payment_intent,
              );
              paymentIntentId = paymentIntent.id;

              if (paymentIntent.status !== "succeeded") {
                throw new Error(
                  `Payment requires further action: ${paymentIntent.status}`,
                );
              }

              if (paymentIntent.payment_method) {
                const pm = await stripe.paymentMethods.retrieve(
                  paymentIntent.payment_method,
                );
                if (pm.card) {
                  paymentMethodDetails = `${pm.card.brand} ending in ${pm.card.last4}`;
                }
              }
            } else {
              // Do NOT create a manual PaymentIntent; it risks double charging.
              // Instead, briefly retry invoice expand to allow Stripe to attach PI, else accept success if invoice is already paid.
              let refreshed = null;
              let attempts = 0;
              while (attempts < 3 && !refreshed) {
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
                  throw new Error(
                    `Payment requires further action: ${pi.status}`,
                  );
                }
                if (pi.payment_method) {
                  const pm = await stripe.paymentMethods.retrieve(
                    pi.payment_method,
                  );
                  if (pm.card) {
                    paymentMethodDetails = `${pm.card.brand} ending in ${pm.card.last4}`;
                  }
                }
              } else {
                // If Stripe already marks invoice as paid, finalize locally and finalize transaction without PI
                const latest =
                  refreshed ||
                  (await stripe.invoices.retrieve(payableInvoice.id));
                if (latest?.status === "paid") {
                  if (invoice) {
                    invoice.status = "paid";
                    invoice.updatedAt = new Date();
                    if (latest.status_transitions?.paid_at) {
                      invoice.paidAt = new Date(
                        latest.status_transitions.paid_at * 1000,
                      );
                    }
                    await invoice.save();
                  }
                  // Remove processing lock and create a succeeded transaction without PI
                  try {
                    await Transaction.deleteOne({
                      _id: processingTransaction._id,
                    });
                  } catch (_) {}
                  await Transaction.findOneAndUpdate(
                    { invoiceId: invoice.stripeInvoiceId },
                    {
                      transactionId: `manual_payment_${invoice.stripeInvoiceId}`,
                      amount: latest.amount_paid || paidInvoice.amount_due,
                      currency: latest.currency || paidInvoice.currency,
                      status: "succeeded",
                      paymentMethod: paymentMethodDetails,
                      invoiceId: invoice.stripeInvoiceId,
                      customerId: brand.brand.stripeCustomerId,
                      brandId: brand._id,
                      campaignId: invoice.campaignId,
                      createdAt: new Date(
                        (latest.created || paidInvoice.created) * 1000,
                      ),
                      updatedAt: new Date(),
                      description: `Automatic payment for invoice ${invoice.stripeInvoiceId} (no PI attached)`,
                    },
                    { upsert: true, new: true },
                  );

                  successfulPayments++;
                  // console.log(
                  //   `✅ Successfully paid invoice ${invoice.stripeInvoiceId} (finalized without explicit PI)`,
                  // );
                  continue;
                }

                // Otherwise, leave as processing to be finalized by webhook/transfer cron
                // Fall back - if invoice is actually paid in Stripe, finalize it locally
                try {
                  const latest = await stripe.invoices.retrieve(
                    payableInvoice.id,
                  );
                  if (invoice && latest?.status === "paid") {
                    // Invoice IS paid - finalize everything properly
                    invoice.status = latest.status;
                    invoice.updatedAt = new Date();
                    if (latest.status_transitions?.paid_at) {
                      invoice.paidAt = new Date(
                        latest.status_transitions.paid_at * 1000,
                      );
                    }
                    await invoice.save();

                    // Remove processing transaction and create final transaction
                    await Transaction.deleteOne({
                      _id: processingTransaction._id,
                    });
                    await Transaction.findOneAndUpdate(
                      { invoiceId: invoice.stripeInvoiceId },
                      {
                        transactionId: `manual_payment_${invoice.stripeInvoiceId}`,
                        amount: latest.amount_paid || paidInvoice.amount_due,
                        currency: latest.currency || paidInvoice.currency,
                        status: "succeeded",
                        paymentMethod: paymentMethodDetails,
                        invoiceId: invoice.stripeInvoiceId,
                        customerId: brand.brand.stripeCustomerId,
                        brandId: brand._id,
                        campaignId: invoice.campaignId,
                        createdAt: new Date(latest.created * 1000),
                        updatedAt: new Date(),
                        description: `Automatic payment for invoice ${invoice.stripeInvoiceId} (no PI attached)`,
                      },
                      { upsert: true, new: true },
                    );

                    successfulPayments++;
                    // console.log(
                    //   `✅ Successfully paid invoice ${invoice.stripeInvoiceId} (finalized without explicit PI)`,
                    // );

                    // Credit ambassador balance
                    await creditAmbassadorBalanceAfterPayment(invoice);

                    continue;
                  } else if (invoice && latest?.status) {
                    invoice.status = latest.status;
                    invoice.updatedAt = new Date();
                    await invoice.save();
                  }
                } catch (_) {}

                // console.log(
                //   `⚠️ Payment processing for invoice ${invoice.stripeInvoiceId}. Will be finalized by webhook.`,
                // );
                continue;
              }
            }

            // Remove processing transaction and create final transaction
            await Transaction.deleteOne({ _id: processingTransaction._id });

            // Update local invoice status
            invoice.status = paidInvoice.status;
            await invoice.save();

            // Save or update transaction in MongoDB with duplicate prevention
            await Transaction.findOneAndUpdate(
              { transactionId: paymentIntentId },
              {
                transactionId: paymentIntentId,
                amount: paidInvoice.amount_due,
                currency: paidInvoice.currency,
                status: "succeeded",
                paymentMethod: paymentMethodDetails,
                invoiceId: invoice.stripeInvoiceId,
                customerId: brand.brand.stripeCustomerId,
                brandId: brand._id,
                campaignId: invoice.campaignId,
                createdAt: new Date(paidInvoice.created * 1000),
                updatedAt: new Date(),
                description: `Automatic payment for invoice ${
                  invoice.stripeInvoiceId
                } (generated ${invoiceDate.format("YYYY-MM-DD HH:mm:ss")})`,
              },
              { upsert: true, new: true },
            );

            successfulPayments++;
            // console.log(
            //   `✅ Successfully paid invoice ${
            //     invoice.stripeInvoiceId
            //   } (generated ${invoiceDate.format(
            //     "YYYY-MM-DD HH:mm:ss",
            //   )}, ${daysDiff.toFixed(1)} days ago)`,
            // );

            // Credit ambassador balance for this paid invoice
            await creditAmbassadorBalanceAfterPayment(invoice);

            // Collect details for consolidated receipt
            if (brand?.email) {
              if (!brandSuccessPayments[brand._id]) {
                brandSuccessPayments[brand._id] = {
                  brand: brand,
                  payments: [],
                };
              }

              let campaignName = "Campaign";
              try {
                const campaign = await Campaign.findById(invoice.campaignId)
                  .select("basics.title")
                  .lean();
                campaignName = campaign?.basics?.title || campaignName;
              } catch (_) {}

              // Use expanded invoice if available for hosted URL
              const hostedUrl = (
                await stripe.invoices.retrieve(invoice.stripeInvoiceId)
              ).hosted_invoice_url;

              brandSuccessPayments[brand._id].payments.push({
                campaignName,
                amount: (paidInvoice.amount_due / 100).toFixed(2),
                currency: paidInvoice.currency.toUpperCase(),
                hostedUrl: hostedUrl,
              });
            }

            // Consolidation handled after loop
          } catch (paymentError) {
            // Clean up processing transaction on error
            try {
              await Transaction.deleteOne({ _id: processingTransaction._id });
            } catch (cleanupError) {
              console.error(
                "Failed to cleanup processing transaction:",
                cleanupError.message,
              );
            }

            failedPayments++;
            console.error(
              `❌ Failed to pay invoice ${invoice.stripeInvoiceId}:`,
              paymentError.message,
            );

            // Determine error reason based on error message/code
            let errorReason = "unknown_error";
            if (paymentError.code) {
              switch (paymentError.code) {
                case "card_declined":
                  errorReason = "payment_method_declined";
                  break;
                case "insufficient_funds":
                  errorReason = "insufficient_funds";
                  break;
                case "expired_card":
                  errorReason = "payment_method_expired";
                  break;
                case "authentication_required":
                  errorReason = "authentication_required";
                  break;
                case "processing_error":
                  errorReason = "processing_error";
                  break;
                default:
                  errorReason = "stripe_error";
              }
            } else if (paymentError.message.includes("payment method")) {
              errorReason = "no_default_payment_method";
            } else if (paymentError.message.includes("customer")) {
              errorReason = "customer_not_found";
            } else if (paymentError.message.includes("invoice")) {
              errorReason = "invoice_not_found";
            }

            // Log detailed payment error
            try {
              const eventDetails = invoice.eventId
                ? await VisitorEvent.findById(invoice.eventId)
                    .select("athleteId visitorId")
                    .lean()
                : null;

              await PaymentError.createPaymentError({
                brandId: brand?._id || invoice.brandId,
                campaignId: invoice.campaignId,
                athleteId: eventDetails?.athleteId || null,
                visitorId: eventDetails?.visitorId || null,
                invoiceId: invoice._id.toString(),
                stripeInvoiceId: invoice.stripeInvoiceId,
                amount: invoice.amount,
                currency: invoice.currency,
                errorReason: errorReason,
                errorMessage: paymentError.message,
                errorCode: paymentError.code || null,
                paymentContext: "cron_automatic",
                metadata: {
                  invoiceCreatedAt: invoice.createdAt,
                  paymentAttemptedAt: new Date(),
                  brandEmail: brand?.email,
                  brandName: brand?.brand?.companyName,
                  stripeErrorType: paymentError.type,
                  fullErrorStack: paymentError.stack,
                },
              });
            } catch (logError) {
              console.error("Failed to log payment error:", logError.message);
            }

            // Update invoice status if payment failed
            invoice.status = "payment_failed";
            await invoice.save();
          }
        }

        // Send consolidated emails to brands
        for (const brandId in brandSuccessPayments) {
          const { brand, payments } = brandSuccessPayments[brandId];
          try {
            const { sendEmail } = await import("../sendEmail.js");
            const isMultiple = payments.length > 1;

            const subject = isMultiple
              ? `Successful payment receipt for ${payments.length} invoices`
              : `Successful payment receipt for ${payments[0].campaignName}`;

            const paymentRowsText = payments
              .map(
                (p) =>
                  `- ${p.campaignName}: ${p.amount} ${p.currency} (View: ${p.hostedUrl})`,
              )
              .join("\n");

            const totalAmount = payments
              .reduce((sum, p) => sum + parseFloat(p.amount), 0)
              .toFixed(2);
            const currency = payments[0].currency;

            const text = `Hello ${
              brand?.brand?.companyName || "there"
            },\n\nYour payment has been successfully processed for the following invoice(s):\n\n${paymentRowsText}\n\nTotal Paid: ${totalAmount} ${currency}\nPayment Date: ${now.format(
              "MMMM D, YYYY h:mm A",
            )}\n\nThank you for your business.`;

            const paymentRowsHtml = payments
              .map(
                (p) => `
              <div style="margin-bottom: 12px; padding: 10px; border-bottom: 1px solid #eee;">
                <p style="margin: 0;"><strong>${p.campaignName}</strong></p>
                <p style="margin: 4px 0;">Amount: ${p.amount} ${p.currency}</p>
                <a href="${p.hostedUrl}" target="_blank" style="color: #f26915; text-decoration: none;">View Invoice</a>
              </div>
            `,
              )
              .join("");

            const html = `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 0;">
                <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;">
                 
                  <p style="color: #000; margin-bottom: 16px;">Hi ${
                    brand?.brand?.companyName || "there"
                  },</p>
                  <p style="color: #000; margin-bottom: 12px;">Your payment has been successfully processed for <strong>${
                    isMultiple
                      ? `${payments.length} invoices`
                      : payments[0].campaignName
                  }</strong>.</p>
                  
                  <div style="margin-top: 20px; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #f9f9f9; padding: 12px; border-bottom: 1px solid #eee;">
                      <h3 style="margin: 0; font-size: 16px;">Payment Summary</h3>
                    </div>
                    ${paymentRowsHtml}
                    <div style="background-color: #f9f9f9; padding: 12px; text-align: right;">
                      <p style="margin: 0; font-size: 18px;"><strong>Total Paid: ${totalAmount} ${currency}</strong></p>
                    </div>
                  </div>
                  
                  <p style="color: #000; margin: 20px 0;"><strong>Payment Date:</strong> ${now.format(
                    "MMMM D, YYYY h:mm A",
                  )}</p>
                  
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
            // console.log(
            //   `📧 Sent consolidated payment success email to ${brand.email} for ${payments.length} invoices`,
            // );
          } catch (emailErr) {
            console.error(
              `Failed to send consolidated payment success email to ${brand?.email}:`,
              emailErr,
            );
          }
        }

        // console.log(
        //   `📊 Payment processing complete: ${successfulPayments} successful, ${failedPayments} failed`,
        // );
        // console.log(
        //   `=== Daily payment run finished at ${now.format(
        //     "YYYY-MM-DD HH:mm:ss",
        //   )} UTC ===`,
        // );
      } catch (error) {
        console.error(
          "CRITICAL ERROR in daily invoice payment:",
          error.message,
          error.stack,
        );
      }
    },
    { scheduled: true, timezone: "UTC" },
  );

// ==================== TESTING FUNCTIONS ====================
// These functions use minutes instead of months/days for quick testing

// TESTING: Generate invoices for events that are exactly 5 minutes old
async function generateInvoicesForVisitorEventsTest() {
  try {
    await connectDB();

    // Calculate the exact time that is 5 minutes ago (for testing)
    const now = moment().utc();
    const fiveMinutesAgo = now.clone().subtract(5, "minutes");

    // Find events that occurred exactly 5 minutes ago (within a 30-second window)
    const startTime = fiveMinutesAgo.clone().subtract(30, "seconds").toDate();
    const endTime = fiveMinutesAgo.clone().add(30, "seconds").toDate();

    console.log(
      `🧪 TEST: Looking for conversion events from: ${startTime.toISOString()} to ${endTime.toISOString()}`,
    );
    console.log(
      `⏰ TEST: These events are exactly 5 minutes old and ready for testing invoice generation`,
    );

    // Find all conversion events that haven't been invoiced yet and are exactly 5 minutes old
    const uninvoicedEvents = await VisitorEvent.find({
      eventType: "conversion",
      createdAt: {
        $gte: startTime,
        $lte: endTime,
      },
      $or: [
        { invoicedAt: { $exists: false } },
        { invoicedAt: null },
        { invoicedInvoiceId: { $exists: false } },
        { invoicedInvoiceId: null },
      ],
    }).lean();

    console.log(
      `📋 TEST: Found ${uninvoicedEvents.length} uninvoiced conversion events that are exactly 5 minutes old`,
    );

    let successfulInvoices = 0;
    let failedInvoices = 0;

    for (const event of uninvoicedEvents) {
      try {
        const eventDate = moment(event.createdAt).utc();
        const invoiceDate = now;
        const minutesDiff = invoiceDate.diff(eventDate, "minutes", true);

        console.log(
          `🎯 TEST: Processing event ${event._id} from ${eventDate.format(
            "YYYY-MM-DD HH:mm:ss",
          )} (${minutesDiff.toFixed(1)} minutes ago)`,
        );

        // Load brand user
        const user = await User.findById(event.brandId);
        if (!user || user.role !== "brand") {
          console.log(
            `⚠️ TEST: Skipping event ${event._id}: Invalid brand user`,
          );
          continue;
        }

        // Load ambassador and their VAT details (Gold Standard: use snapshots; fallback to current for legacy)
        let athleteVatCountry = event.athleteVatCountry;
        let athleteVatStatus = event.athleteVatStatus;

        if (typeof athleteVatStatus === "undefined") {
          try {
            const athlete = await User.findById(event.athleteId);
            if (athlete) {
              const subRole = athlete.subRole || "athlete";
              const subRoleCamel = subRole.replace(/-([a-z])/g, (g) =>
                g[1].toUpperCase(),
              );
              const athleteProfile = athlete[subRoleCamel];
              const athleteVatDetails = athleteProfile?.vatDetails || {};
              athleteVatCountry = (
                athleteVatDetails.vatCountry ||
                athleteVatDetails.registrationCountry ||
                athleteProfile?.vatCountry ||
                athleteProfile?.registrationCountry ||
                ""
              )
                .toString()
                .toUpperCase();
              athleteVatStatus = (
                athleteVatDetails.vatStatus ||
                athleteProfile?.vatStatus ||
                "not_provided"
              )
                .toString()
                .toLowerCase();
              console.log(
                `[TEST INVOICE] Legacy event ${event._id}: Fetched current ambassador VAT:`,
                {
                  athleteId: event.athleteId,
                  athleteVatCountry,
                  athleteVatStatus,
                },
              );
            }
          } catch (athleteError) {
            console.error(
              `⚠️ TEST: Error fetching ambassador VAT details for event ${event._id}:`,
              athleteError.message,
            );
          }
        } else {
          athleteVatCountry = (athleteVatCountry || "")
            .toString()
            .toUpperCase();
          athleteVatStatus = (athleteVatStatus || "not_provided")
            .toString()
            .toLowerCase();
          console.log(
            `[TEST INVOICE] Using event snapshot ambassador VAT for event ${event._id}: ${athleteVatStatus} (${athleteVatCountry})`,
          );
        }

        // Ensure Stripe customer exists
        if (!user.brand?.stripeCustomerId) {
          try {
            const customer = await stripe.customers.create({
              email: user.email,
              metadata: { userId: user._id.toString() },
            });
            await User.updateOne(
              { _id: user._id },
              { "brand.stripeCustomerId": customer.id },
            );
            user.brand = user.brand || {};
            user.brand.stripeCustomerId = customer.id;
            console.log(
              `✅ TEST: Created Stripe customer for brand ${user._id}: ${customer.id}`,
            );
          } catch (customerError) {
            console.error(
              `❌ TEST: Failed to create Stripe customer for brand ${user._id}:`,
              customerError.message,
            );
            failedInvoices++;
            continue;
          }
        }

        // Verify customer has a default payment method
        try {
          const customer = await stripe.customers.retrieve(
            user.brand.stripeCustomerId,
          );
          if (!customer.invoice_settings.default_payment_method) {
            console.log(
              `⚠️ TEST: Brand ${user._id} has no default payment method - skipping event ${event._id}`,
            );
            continue;
          }
        } catch (customerError) {
          console.error(
            `❌ TEST: Failed to retrieve Stripe customer for brand ${user._id}:`,
            customerError.message,
          );
          failedInvoices++;
          continue;
        }

        // Build line items and totals
        const earnings = Number(event.eventData?.amount || 0);
        const platformFee = Number(event.eventData?.platformFee || 0);
        const eventCurrency = (
          event.eventData?.currency || "EUR"
        ).toLowerCase();

        // Calculate VAT treatment (TEST): mirror main cron logic (new schema)
        const brandCountry = (user.brand?.country || "")
          .toString()
          .toUpperCase();
        const brandVatStatus = "not_provided";

        // Apply VAT to invoice based on BRAND's VAT status (brand pays the invoice) - TEST
        let vatTreatment = {
          vatTreatment: "reverse_charge",
          vatRate: 0,
          chargeVat: false,
          notes: ["[TEST] No VAT (non-FI or not valid)"],
        };

        // Use brand's VAT status for invoice VAT (TEST)
        try {
          const brandVatDetails = user?.brand?.vatDetails || {};

          let brandCountry = event.brandVatCountry;
          let brandVatStatus = event.brandVatStatus;

          if (typeof brandVatStatus === "undefined") {
            brandCountry = (
              brandVatDetails.vatCountry ||
              brandVatDetails.registrationCountry ||
              user?.brand?.country ||
              ""
            )
              .toString()
              .toUpperCase();
            brandVatStatus = (brandVatDetails.vatStatus || "not_provided")
              .toString()
              .toLowerCase();
            console.log(
              `[TEST INVOICE] Legacy event ${event._id}: Fetched current brand VAT`,
            );
          } else {
            brandCountry = (brandCountry || "").toString().toUpperCase();
            brandVatStatus = (brandVatStatus || "not_provided")
              .toString()
              .toLowerCase();
            console.log(
              `[TEST INVOICE] Using event snapshot brand VAT for event ${event._id}: ${brandVatStatus} (${brandCountry})`,
            );
          }

          const treatment = getBrandInvoiceVATTreatment(
            brandCountry,
            brandVatStatus,
          );
          vatTreatment = {
            vatTreatment: treatment.vatTreatment,
            vatRate: treatment.vatRate,
            chargeVat: treatment.chargeVat,
            notes: treatment.notes,
          };
        } catch (_) {
          vatTreatment = {
            vatTreatment: "reverse_charge",
            vatRate: 0,
            chargeVat: false,
            notes: ["[TEST] Error checking brand VAT - no VAT charged"],
          };
        }

        // Stripe processing fee is calculated on subtotal BEFORE fee (earnings + platformFee)
        const earningsCents = Math.round(earnings * 100);
        const platformFeeCents = Math.round(platformFee * 100);
        const feeBaseCents = earningsCents + platformFeeCents;
        const stripeFeeCents = calculateStripeProcessingFeeCents(feeBaseCents);
        const stripeFeeAdjustedCents = stripeFeeCents;

        // VAT calculation: Charge VAT to brand invoice in test mode if applicable on full amount (earnings + platform + stripe)
        const vatBaseCents =
          earningsCents + platformFeeCents + stripeFeeAdjustedCents;
        const baseAmount = vatBaseCents / 100;
        const vatCalculation = calculateVATAmounts(
          baseAmount, // Calculate VAT on full amount (earnings + platform fee + stripe fee)
          vatTreatment.vatRate,
        );
        const vatAmountCents = Math.round(vatCalculation.vatAmount * 100);
        const subtotalAmount = vatBaseCents / 100;
        // Include VAT in total amount for brand invoice
        const correctedTotalAmount = subtotalAmount + vatCalculation.vatAmount;

        console.log(`💰 TEST: VAT calculation for brand ${user._id}:`, {
          country: (
            user?.brand?.vatDetails?.vatCountry ||
            user?.brand?.country ||
            ""
          )
            .toString()
            .toUpperCase(),
          vatStatus: (user?.brand?.vatDetails?.vatStatus || "not_provided")
            .toString()
            .toLowerCase(),
          treatment: vatTreatment.vatTreatment,
          earnings: earnings,
          platformFee: platformFee,
          baseAmount: baseAmount,
          vatOnEarnings: vatCalculation.vatAmount,
          correctedTotalAmount: correctedTotalAmount,
        });

        const totalCents = Math.round(correctedTotalAmount * 100);

        if (!Number.isFinite(totalCents) || totalCents <= 0) {
          console.log(
            `⚠️ Event ${event._id} has no billable amount - skipping`,
          );
          continue;
        }

        const periodStartIso = new Date(event.createdAt).toISOString();
        const periodEndIso = new Date(event.createdAt).toISOString();

        // Create Stripe invoice
        const invoice = await stripe.invoices.create({
          customer: user.brand.stripeCustomerId,
          collection_method: "charge_automatically",
          auto_advance: true,
          currency: eventCurrency,
          description: `Invoice for event ${event._id} (TEST)`,
          footer: (vatTreatment.notes || []).filter(Boolean).join(" | "),
          metadata: {
            campaignId: event.campaignId.toString(),
            periodStart: periodStartIso,
            periodEnd: periodEndIso,
            metrics: JSON.stringify({
              clicks: event.eventType === "click" ? 1 : 0,
              conversions: event.eventType === "conversion" ? 1 : 0,
            }),
            eventId: event._id.toString(),
            eventDate: eventDate.format("YYYY-MM-DD HH:mm:ss"),
            invoiceGeneratedOn: invoiceDate.format("YYYY-MM-DD HH:mm:ss"),
            billingCycle: "testing_5_minutes",
            testMode: "true",
            vatTreatment: vatTreatment.vatTreatment,
            vatRate: vatTreatment.vatRate.toString(),
            vatAmount: vatCalculation.vatAmount.toString(),
            baseAmount: vatCalculation.baseAmount.toString(),
            brandCountry: (
              user?.brand?.vatDetails?.vatCountry ||
              user?.brand?.country ||
              ""
            )
              .toString()
              .toUpperCase(),
            brandVatStatus: (
              user?.brand?.vatDetails?.vatStatus || "not_provided"
            )
              .toString()
              .toLowerCase(),
            notes: (vatTreatment.notes || []).join(", "),
            vatNotes: (vatTreatment.notes || []).join(" | "),
          },
        });

        // Ambassador earnings line item (TEST)
        if (earnings > 0) {
          await stripe.invoiceItems.create({
            customer: user.brand.stripeCustomerId,
            invoice: invoice.id,
            amount: Math.round(earnings * 100),
            currency: eventCurrency,
            description: `Ambassador earnings (${
              event.eventData?.eventName || "conversion"
            }) - TEST`,
            metadata: {
              type: "ambassador_earnings",
              eventId: event._id.toString(),
              athleteId: event.athleteId.toString(),
              athleteVatCountry: athleteVatCountry,
              athleteVatStatus: athleteVatStatus,
            },
          });
        }

        // Platform fee line item (TEST)
        if (platformFee > 0) {
          await stripe.invoiceItems.create({
            customer: user.brand.stripeCustomerId,
            invoice: invoice.id,
            amount: Math.round(platformFee * 100),
            currency: eventCurrency,
            description: "Platform fee - TEST",
            metadata: {
              type: "platform_fee",
              eventId: event._id.toString(),
            },
          });
        }

        // VAT line item (if applicable)
        if (vatCalculation.vatAmount > 0) {
          await stripe.invoiceItems.create({
            customer: user.brand.stripeCustomerId,
            invoice: invoice.id,
            amount: Math.round(vatCalculation.vatAmount * 100),
            currency: eventCurrency,
            description: `VAT ${(vatTreatment.vatRate * 100).toFixed(1)}% (${
              vatTreatment.vatTreatment
            }) - TEST`,
            metadata: {
              type: "vat",
              vatTreatment: vatTreatment.vatTreatment,
              vatRate: vatTreatment.vatRate.toString(),
              eventId: event._id.toString(),
            },
          });
        }

        // Stripe processing fee line item (no VAT)
        if (stripeFeeCents > 0) {
          await stripe.invoiceItems.create({
            customer: user.brand.stripeCustomerId,
            invoice: invoice.id,
            amount: stripeFeeCents,
            currency: eventCurrency,
            description: "Payment processing fee (Stripe)",
            metadata: {
              type: "stripe_processing_fee",
              eventId: event._id.toString(),
              vatIncluded: "false",
              vatRate: "0",
            },
          });
        }

        // Finalize invoice
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(
          invoice.id,
        );

        // Persist invoice
        const savedInvoice = await Invoice.create({
          brandId: user._id,
          campaignId: event.campaignId.toString(),
          eventId: event._id,
          stripeInvoiceId: invoice.id,
          amount: totalCents,
          currency: eventCurrency,
          periodStart: new Date(periodStartIso),
          periodEnd: new Date(periodEndIso),
          status: finalizedInvoice.status,
          // VAT information (corrected - TEST function)
          subtotal: Math.round(subtotalAmount * 100),
          vatAmount: Math.round(vatCalculation.vatAmount * 100),
          vatRate: vatTreatment.vatRate,
          vatTreatment: vatTreatment.vatTreatment,
          total: totalCents, // correctedTotalAmount in cents (includes stripe fee and VAT)
          baseAmount: vatBaseCents, // VAT base includes earnings + platform + stripe
          brandCountry: brandCountry,
          brandVatStatus: brandVatStatus,
          notes: vatTreatment.notes || [],
          lineItems: [
            ...(earnings > 0
              ? [
                  {
                    description: `Ambassador earnings (${
                      event.eventData?.eventName || "conversion"
                    }) - TEST`,
                    amount: Math.round(earnings * 100),
                    metadata: {
                      type: "ambassador_earnings",
                      eventId: event._id.toString(),
                      athleteId: event.athleteId.toString(),
                      athleteVatCountry: athleteVatCountry,
                      athleteVatStatus: athleteVatStatus,
                    },
                  },
                ]
              : []),
            ...(platformFee > 0
              ? [
                  {
                    description: "Platform fee - TEST",
                    amount: Math.round(platformFee * 100),
                    metadata: {
                      type: "platform_fee",
                      eventId: event._id.toString(),
                    },
                  },
                ]
              : []),
            ...(vatCalculation.vatAmount > 0
              ? [
                  {
                    description: `VAT ${(vatTreatment.vatRate * 100).toFixed(
                      1,
                    )}% (${vatTreatment.vatTreatment}) - TEST`,
                    amount: Math.round(vatCalculation.vatAmount * 100),
                    metadata: {
                      type: "vat",
                      vatTreatment: vatTreatment.vatTreatment,
                      vatRate: vatTreatment.vatRate.toString(),
                      eventId: event._id.toString(),
                    },
                  },
                ]
              : []),
            ...(stripeFeeCents > 0
              ? [
                  {
                    description: "Payment processing fee (Stripe)",
                    amount: stripeFeeCents,
                    metadata: {
                      type: "stripe_processing_fee",
                      eventId: event._id.toString(),
                      vatIncluded: "false",
                      vatRate: "0",
                    },
                  },
                ]
              : []),
          ],
          metrics: {
            clicks: event.eventType === "click" ? 1 : 0,
            conversions: event.eventType === "conversion" ? 1 : 0,
          },
        });

        // Mark event as invoiced
        await VisitorEvent.updateOne(
          { _id: event._id },
          { invoicedAt: new Date(), invoicedInvoiceId: invoice.id },
        );

        // Email notification removed - will be sent after payment success instead

        successfulInvoices++;
        console.log(
          `✅ TEST: Successfully created invoice for event ${
            event._id
          } (${minutesDiff.toFixed(1)} minutes after conversion) - Invoice: ${
            invoice.id
          }`,
        );
      } catch (eventError) {
        failedInvoices++;
        console.error(
          `❌ TEST: Error processing event ${event._id}:`,
          eventError.message,
        );
      }
    }

    console.log(
      `📊 TEST: Invoice generation complete: ${successfulInvoices} successful, ${failedInvoices} failed`,
    );
    return { successfulInvoices, failedInvoices };
  } catch (error) {
    console.error(
      "❌ TEST: Critical error in test invoice generation:",
      error.message,
      error.stack,
    );
    return { successfulInvoices: 0, failedInvoices: 0 };
  }
}

// TESTING: Pay invoices that were generated exactly 2 minutes ago
async function payInvoicesTest() {
  try {
    await connectDB();

    // Calculate the exact time range for invoices generated 2 minutes ago
    const now = moment().utc();
    const twoMinutesAgo = now.clone().subtract(2, "minutes");

    // Find invoices created exactly 2 minutes ago (within a 30-second window)
    const startTime = twoMinutesAgo.clone().subtract(30, "seconds").toDate();
    const endTime = twoMinutesAgo.clone().add(30, "seconds").toDate();

    console.log(
      `💳 TEST: Payment processing started at ${now.format(
        "YYYY-MM-DD HH:mm:ss",
      )} UTC`,
    );
    console.log(
      `🎯 TEST: Looking for invoices generated between: ${startTime.toISOString()} to ${endTime.toISOString()}`,
    );
    console.log(
      `⏰ TEST: These invoices are exactly 2 minutes old and ready for payment testing`,
    );

    // Find all unpaid invoices that were created exactly 2 minutes ago
    const unpaidInvoices = await Invoice.find({
      status: { $in: ["open", "draft"] },
      createdAt: {
        $gte: startTime,
        $lte: endTime,
      },
    }).populate("brandId");

    console.log(
      `📋 TEST: Found ${unpaidInvoices.length} unpaid invoices that are exactly 2 minutes old`,
    );

    let successfulPayments = 0;
    let failedPayments = 0;

    // Group successful payments by brand to send a single consolidated email receipt
    const brandSuccessPayments = {};

    for (const invoice of unpaidInvoices) {
      try {
        const invoiceDate = moment(invoice.createdAt).utc();
        const paymentDate = now;
        const minutesDiff = paymentDate.diff(invoiceDate, "minutes", true);

        console.log(
          `💰 TEST: Processing payment for invoice ${
            invoice.stripeInvoiceId
          } (generated ${invoiceDate.format(
            "YYYY-MM-DD HH:mm:ss",
          )}, ${minutesDiff.toFixed(1)} minutes ago)`,
        );

        // Enhanced duplicate detection - check for existing successful or processing transactions
        const existingTransaction = await Transaction.findOne({
          invoiceId: invoice.stripeInvoiceId,
          status: { $in: ["succeeded", "processing"] },
        });

        if (existingTransaction) {
          console.log(
            `⚠️ TEST: Skipping invoice ${invoice.stripeInvoiceId}: Payment already ${existingTransaction.status}`,
          );
          continue;
        }

        // Check for recent payment attempts within 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentAttempt = await Transaction.findOne({
          invoiceId: invoice.stripeInvoiceId,
          createdAt: { $gte: fiveMinutesAgo },
          status: { $in: ["succeeded", "processing"] },
        });

        if (recentAttempt) {
          console.log(
            `⚠️ TEST: Skipping invoice ${invoice.stripeInvoiceId}: Recent payment attempt found (${recentAttempt.status})`,
          );
          continue;
        }

        // Use proper payment logic matching the API route (same as production)
        const brand = invoice.brandId;

        if (!brand || !brand.brand?.stripeCustomerId) {
          console.log(
            `⚠️ TEST: Skipping invoice ${invoice.stripeInvoiceId}: No Stripe customer for brand ${brand?._id}`,
          );

          // Log payment error for missing customer
          try {
            const eventDetails = invoice.eventId
              ? await VisitorEvent.findById(invoice.eventId)
                  .select("athleteId visitorId")
                  .lean()
              : null;

            await PaymentError.createPaymentError({
              brandId: brand?._id || invoice.brandId,
              campaignId: invoice.campaignId,
              athleteId: eventDetails?.athleteId || null,
              visitorId: eventDetails?.visitorId || null,
              invoiceId: invoice._id.toString(),
              stripeInvoiceId: invoice.stripeInvoiceId,
              amount: invoice.amount,
              currency: invoice.currency,
              errorReason: "customer_not_found",
              errorMessage: `[TEST] Brand ${
                brand?._id || invoice.brandId
              } has no Stripe customer configured`,
              errorCode: null,
              paymentContext: "test_mode",
              metadata: {
                invoiceCreatedAt: invoice.createdAt,
                brandEmail: brand?.email,
                brandName: brand?.brand?.companyName,
                testMode: true,
              },
            });
          } catch (logError) {
            console.error(
              "Failed to log test payment error:",
              logError.message,
            );
          }

          continue;
        }

        // Retrieve the invoice from Stripe to check its current status
        const stripeInvoice = await stripe.invoices.retrieve(
          invoice.stripeInvoiceId,
        );

        // Check if invoice is payable
        if (!["open", "draft"].includes(stripeInvoice.status)) {
          console.log(
            `⚠️ TEST: Skipping invoice ${invoice.stripeInvoiceId}: Cannot be paid (status: ${stripeInvoice.status})`,
          );
          continue;
        }

        // Check if invoice has amount due
        if (stripeInvoice.amount_due <= 0) {
          console.log(
            `⚠️ TEST: Skipping invoice ${invoice.stripeInvoiceId}: No amount due`,
          );
          continue;
        }

        // Retrieve customer to check payment method
        const customer = await stripe.customers.retrieve(
          brand.brand.stripeCustomerId,
        );
        const paymentMethod = customer.invoice_settings.default_payment_method;

        // Explicit local status validation - skip if already cancelled or paid
        if (!["open", "draft"].includes(invoice.status)) {
          console.log(
            `⚠️ TEST: Skipping invoice ${invoice.stripeInvoiceId}: Local status is ${invoice.status}`,
          );
          continue;
        }

        console.log("TEST: Retrieved customer", {
          id: customer.id,
          balance: customer.balance,
          default_payment_method: paymentMethod,
        });

        if (!paymentMethod) {
          console.log(
            `⚠️ TEST: Skipping invoice ${invoice.stripeInvoiceId}: No default payment method for brand ${brand._id}`,
          );

          // Log payment error for missing payment method
          try {
            const eventDetails = invoice.eventId
              ? await VisitorEvent.findById(invoice.eventId)
                  .select("athleteId visitorId")
                  .lean()
              : null;

            await PaymentError.createPaymentError({
              brandId: brand._id,
              campaignId: invoice.campaignId,
              athleteId: eventDetails?.athleteId || null,
              visitorId: eventDetails?.visitorId || null,
              invoiceId: invoice._id.toString(),
              stripeInvoiceId: invoice.stripeInvoiceId,
              amount: invoice.amount,
              currency: invoice.currency,
              errorReason: "no_default_payment_method",
              errorMessage: `[TEST] Brand ${brand._id} has no default payment method configured`,
              errorCode: null,
              paymentContext: "test_mode",
              metadata: {
                invoiceCreatedAt: invoice.createdAt,
                brandEmail: brand.email,
                brandName: brand.brand?.companyName,
                testMode: true,
              },
            });
          } catch (logError) {
            console.error(
              "Failed to log test payment error:",
              logError.message,
            );
          }

          continue;
        }

        // Finalize draft invoice if necessary
        let payableInvoice = stripeInvoice;
        if (stripeInvoice.status === "draft") {
          payableInvoice = await stripe.invoices.finalizeInvoice(
            invoice.stripeInvoiceId,
          );
          console.log(
            `📋 TEST: Finalized draft invoice ${invoice.stripeInvoiceId}`,
          );
        }

        // Check if customer balance covers the invoice
        if (
          customer.balance < 0 &&
          -customer.balance >= payableInvoice.amount_due
        ) {
          console.log(
            `💰 TEST: Invoice ${
              invoice.stripeInvoiceId
            } paid using customer balance: ${-customer.balance}`,
          );

          // Pay with customer balance using consistent idempotency key
          const balanceIdempotencyKey = `balance_pay_${invoice.stripeInvoiceId}`;
          const paidInvoice = await stripe.invoices.pay(
            payableInvoice.id,
            {
              paid_out_of_band: true, // Indicate payment via balance
            },
            { idempotencyKey: balanceIdempotencyKey },
          );

          // Update local invoice status
          invoice.status = paidInvoice.status;
          await invoice.save();

          // Record transaction for balance payment with duplicate prevention
          await Transaction.findOneAndUpdate(
            { invoiceId: invoice.stripeInvoiceId },
            {
              transactionId: `test_balance_payment_${invoice.stripeInvoiceId}`,
              amount: paidInvoice.amount_due,
              currency: paidInvoice.currency,
              status: "succeeded",
              paymentMethod: "Customer Balance (TEST)",
              invoiceId: invoice.stripeInvoiceId,
              customerId: brand.brand.stripeCustomerId,
              brandId: brand._id,
              campaignId: invoice.campaignId,
              createdAt: new Date(paidInvoice.created * 1000),
              updatedAt: new Date(),
              description: `TEST: Automatic payment for invoice ${
                invoice.stripeInvoiceId
              } via customer balance (generated ${invoiceDate.format(
                "YYYY-MM-DD HH:mm:ss",
              )})`,
            },
            { upsert: true, new: true },
          );

          successfulPayments++;
          console.log(
            `✅ TEST: Successfully paid invoice ${
              invoice.stripeInvoiceId
            } via customer balance (generated ${invoiceDate.format(
              "YYYY-MM-DD HH:mm:ss",
            )}, ${minutesDiff.toFixed(1)} minutes ago)`,
          );

          // Credit ambassador balance for this paid invoice
          await creditAmbassadorBalanceAfterPayment(invoice);

          // Collect details for consolidated receipt
          if (brand?.email) {
            if (!brandSuccessPayments[brand._id]) {
              brandSuccessPayments[brand._id] = {
                brand: brand,
                payments: [],
              };
            }

            let campaignName = "Campaign";
            try {
              const campaign = await Campaign.findById(invoice.campaignId)
                .select("basics.title")
                .lean();
              campaignName = campaign?.basics?.title || campaignName;
            } catch (_) {}

            brandSuccessPayments[brand._id].payments.push({
              campaignName,
              amount: (paidInvoice.amount_due / 100).toFixed(2),
              currency: paidInvoice.currency.toUpperCase(),
              hostedUrl: paidInvoice.hosted_invoice_url,
            });
          }

          continue;

          continue;
        }

        // Create a processing transaction record to prevent duplicate payments
        const processingTransaction = await Transaction.create({
          transactionId: `test_processing_${
            invoice.stripeInvoiceId
          }_${Date.now()}`,
          amount: stripeInvoice.amount_due,
          currency: stripeInvoice.currency,
          status: "processing",
          paymentMethod: "Test Processing",
          invoiceId: invoice.stripeInvoiceId,
          customerId: brand.brand.stripeCustomerId,
          brandId: brand._id,
          campaignId: invoice.campaignId,
          createdAt: new Date(),
          description: `TEST: Processing payment for invoice ${invoice.stripeInvoiceId}`,
        });

        // Pay the invoice with the default payment method using idempotency key
        const paymentOptions = {
          payment_method: paymentMethod,
          off_session: true,
        };
        // Use Stripe idempotency to prevent duplicate charges on retries/double-submits
        const idempotencyKey = `invoice_pay_${invoice.stripeInvoiceId}`;
        const paidInvoice = await stripe.invoices.pay(
          payableInvoice.id,
          paymentOptions,
          { idempotencyKey },
        );

        console.log(`💳 TEST: Paid invoice ${invoice.stripeInvoiceId}:`, {
          status: paidInvoice.status,
          payment_intent: paidInvoice.payment_intent,
          amount_paid: paidInvoice.amount_paid,
          payment_method: paymentMethod,
        });

        // Handle PaymentIntent for transaction details
        let paymentMethodDetails = "Automatic Payment (TEST)";
        let paymentIntentId = null;

        if (paidInvoice.payment_intent) {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            paidInvoice.payment_intent,
          );
          paymentIntentId = paymentIntent.id;

          if (paymentIntent.status !== "succeeded") {
            throw new Error(
              `Payment requires further action: ${paymentIntent.status}`,
            );
          }

          if (paymentIntent.payment_method) {
            const pm = await stripe.paymentMethods.retrieve(
              paymentIntent.payment_method,
            );
            if (pm.card) {
              paymentMethodDetails = `${pm.card.brand} ending in ${pm.card.last4} (TEST)`;
            }
          }
        } else {
          // Do NOT create a manual PaymentIntent; it risks double charging.
          // Instead, re-fetch the invoice with expanded payment_intent (Stripe can attach it asynchronously).
          const refreshed = await stripe.invoices.retrieve(payableInvoice.id, {
            expand: ["payment_intent"],
          });
          if (
            refreshed.payment_intent &&
            typeof refreshed.payment_intent !== "string"
          ) {
            const pi = refreshed.payment_intent;
            paymentIntentId = pi.id;
            if (pi.status !== "succeeded") {
              throw new Error(`Payment requires further action: ${pi.status}`);
            }
            if (pi.payment_method) {
              const pm = await stripe.paymentMethods.retrieve(
                pi.payment_method,
              );
              if (pm.card) {
                paymentMethodDetails = `${pm.card.brand} ending in ${pm.card.last4} (TEST)`;
              }
            }
          }

          // ALWAYS check if invoice is paid and create transaction (even without PaymentIntent)
          // This handles cases where Stripe pays via customer balance or other non-PI methods
          const latest = await stripe.invoices.retrieve(payableInvoice.id);
          if (invoice && latest?.status === "paid") {
            // Invoice IS paid - finalize everything properly
            invoice.status = latest.status;
            invoice.updatedAt = new Date();
            if (latest.status_transitions?.paid_at) {
              invoice.paidAt = new Date(
                latest.status_transitions.paid_at * 1000,
              );
            }
            await invoice.save();

            // Remove processing transaction and create final transaction
            await Transaction.deleteOne({ _id: processingTransaction._id });
            await Transaction.findOneAndUpdate(
              { invoiceId: invoice.stripeInvoiceId },
              {
                transactionId:
                  paymentIntentId ||
                  `test_payment_${invoice.stripeInvoiceId}_${Date.now()}`,
                amount: latest.amount_paid || paidInvoice.amount_due,
                currency: latest.currency || paidInvoice.currency,
                status: "succeeded",
                paymentMethod: paymentMethodDetails,
                invoiceId: invoice.stripeInvoiceId,
                customerId: brand.brand.stripeCustomerId,
                brandId: brand._id,
                campaignId: invoice.campaignId,
                createdAt: new Date(),
                updatedAt: new Date(),
                description: `TEST: Automatic payment for invoice ${
                  invoice.stripeInvoiceId
                }${paymentIntentId ? "" : " (no PI attached)"}`,
              },
              { upsert: true, new: true },
            );

            successfulPayments++;
            console.log(
              `✅ TEST: Successfully paid invoice ${
                invoice.stripeInvoiceId
              } (finalized${paymentIntentId ? "" : " without explicit PI"})`,
            );

            // Credit ambassador balance
            await creditAmbassadorBalanceAfterPayment(invoice);

            // Collect details for consolidated receipt
            if (brand?.email) {
              if (!brandSuccessPayments[brand._id]) {
                brandSuccessPayments[brand._id] = {
                  brand: brand,
                  payments: [],
                };
              }

              let campaignName = "Campaign";
              try {
                const campaign = await Campaign.findById(invoice.campaignId)
                  .select("basics.title")
                  .lean();
                campaignName = campaign?.basics?.title || campaignName;
              } catch (_) {}

              brandSuccessPayments[brand._id].payments.push({
                campaignName,
                amount: (latest.amount_paid / 100).toFixed(2),
                currency: latest.currency.toUpperCase(),
                hostedUrl: latest.hosted_invoice_url,
              });
            }

            continue;

            continue;
          } else if (invoice && latest?.status) {
            invoice.status = latest.status;
            invoice.updatedAt = new Date();
            await invoice.save();
          }

          // Only log "webhook" message if invoice is NOT paid yet
          if (latest?.status !== "paid") {
            console.log(
              `⚠️ TEST: Payment processing for invoice ${invoice.stripeInvoiceId}. Will be finalized by webhook.`,
            );
            continue;
          }
        }

        // Remove processing transaction and create final transaction
        await Transaction.deleteOne({ _id: processingTransaction._id });

        // Update local invoice status
        invoice.status = paidInvoice.status;
        await invoice.save();

        // Save or update transaction in MongoDB with duplicate prevention
        await Transaction.findOneAndUpdate(
          { transactionId: paymentIntentId },
          {
            transactionId: paymentIntentId,
            amount: paidInvoice.amount_due,
            currency: paidInvoice.currency,
            status: "succeeded",
            paymentMethod: paymentMethodDetails,
            invoiceId: invoice.stripeInvoiceId,
            customerId: brand.brand.stripeCustomerId,
            brandId: brand._id,
            campaignId: invoice.campaignId,
            createdAt: new Date(paidInvoice.created * 1000),
            updatedAt: new Date(),
            description: `TEST: Automatic payment for invoice ${
              invoice.stripeInvoiceId
            } (generated ${invoiceDate.format("YYYY-MM-DD HH:mm:ss")})`,
          },
          { upsert: true, new: true },
        );

        successfulPayments++;
        console.log(
          `✅ TEST: Successfully paid invoice ${
            invoice.stripeInvoiceId
          } (generated ${invoiceDate.format(
            "YYYY-MM-DD HH:mm:ss",
          )}, ${minutesDiff.toFixed(1)} minutes ago)`,
        );

        // Credit ambassador balance for this paid invoice
        await creditAmbassadorBalanceAfterPayment(invoice);
      } catch (paymentError) {
        // Clean up processing transaction on error
        try {
          await Transaction.deleteOne({ _id: processingTransaction._id });
        } catch (cleanupError) {
          console.error(
            "Failed to cleanup test processing transaction:",
            cleanupError.message,
          );
        }

        failedPayments++;
        console.error(
          `❌ TEST: Failed to pay invoice ${invoice.stripeInvoiceId}:`,
          paymentError.message,
        );

        // Determine error reason based on error message/code
        let errorReason = "unknown_error";
        if (paymentError.code) {
          switch (paymentError.code) {
            case "card_declined":
              errorReason = "payment_method_declined";
              break;
            case "insufficient_funds":
              errorReason = "insufficient_funds";
              break;
            case "expired_card":
              errorReason = "payment_method_expired";
              break;
            case "authentication_required":
              errorReason = "authentication_required";
              break;
            case "processing_error":
              errorReason = "processing_error";
              break;
            default:
              errorReason = "stripe_error";
          }
        } else if (paymentError.message.includes("payment method")) {
          errorReason = "no_default_payment_method";
        } else if (paymentError.message.includes("customer")) {
          errorReason = "customer_not_found";
        } else if (paymentError.message.includes("invoice")) {
          errorReason = "invoice_not_found";
        }

        // Log detailed payment error
        try {
          const eventDetails = invoice.eventId
            ? await VisitorEvent.findById(invoice.eventId)
                .select("athleteId visitorId")
                .lean()
            : null;

          await PaymentError.createPaymentError({
            brandId: brand?._id || invoice.brandId,
            campaignId: invoice.campaignId,
            athleteId: eventDetails?.athleteId || null,
            visitorId: eventDetails?.visitorId || null,
            invoiceId: invoice._id.toString(),
            stripeInvoiceId: invoice.stripeInvoiceId,
            amount: invoice.amount,
            currency: invoice.currency,
            errorReason: errorReason,
            errorMessage: `[TEST] ${paymentError.message}`,
            errorCode: paymentError.code || null,
            paymentContext: "test_mode",
            metadata: {
              invoiceCreatedAt: invoice.createdAt,
              paymentAttemptedAt: new Date(),
              brandEmail: brand?.email,
              brandName: brand?.brand?.companyName,
              stripeErrorType: paymentError.type,
              fullErrorStack: paymentError.stack,
              testMode: true,
            },
          });
        } catch (logError) {
          console.error("Failed to log test payment error:", logError.message);
        }

        // Update invoice status if payment failed
        invoice.status = "payment_failed";
        await invoice.save();
      }
    }

    // Send consolidated emails to brands (TEST MODE)
    for (const brandId in brandSuccessPayments) {
      const { brand, payments } = brandSuccessPayments[brandId];
      try {
        const { sendEmail } = await import("../sendEmail.js");
        const isMultiple = payments.length > 1;

        const subject = isMultiple
          ? `[TEST] Successful payment receipt for ${payments.length} invoices`
          : `[TEST] Successful payment receipt for ${payments[0].campaignName}`;

        const paymentRowsText = payments
          .map(
            (p) =>
              `- ${p.campaignName}: ${p.amount} ${p.currency} (View: ${p.hostedUrl})`,
          )
          .join("\n");

        const totalAmount = payments
          .reduce((sum, p) => sum + parseFloat(p.amount), 0)
          .toFixed(2);
        const currency = payments[0].currency;

        const text = `Hello ${
          brand?.brand?.companyName || "there"
        },\n\n[TEST MODE] Your payment has been successfully processed for the following invoice(s):\n\n${paymentRowsText}\n\nTotal Paid: ${totalAmount} ${currency}\nPayment Date: ${now.format(
          "MMMM D, YYYY h:mm A",
        )} UTC\n\nThank you for your business.`;

        const paymentRowsHtml = payments
          .map(
            (p) => `
          <div style="margin-bottom: 12px; padding: 10px; border-bottom: 1px solid #eee;">
            <p style="margin: 0;"><strong>${p.campaignName}</strong></p>
            <p style="margin: 4px 0;">Amount: ${p.amount} ${p.currency}</p>
            <a href="${p.hostedUrl}" target="_blank" style="color: #f26915; text-decoration: none;">View Invoice</a>
          </div>
        `,
          )
          .join("");

        const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 0;">
            <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
              <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;">
             
              <p style="color: #000; margin-bottom: 16px;">Hi ${
                brand?.brand?.companyName || "there"
              },</p>
              <p style="color: #000; margin-bottom: 12px;"><strong>[TEST MODE]</strong> Your payment has been successfully processed for <strong>${
                isMultiple
                  ? `${payments.length} invoices`
                  : payments[0].campaignName
              }</strong>.</p>
              
              <div style="margin-top: 20px; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #f9f9f9; padding: 12px; border-bottom: 1px solid #eee;">
                  <h3 style="margin: 0; font-size: 16px;">Payment Summary (TEST)</h3>
                </div>
                ${paymentRowsHtml}
                <div style="background-color: #f9f9f9; padding: 12px; text-align: right;">
                  <p style="margin: 0; font-size: 18px;"><strong>Total Paid: ${totalAmount} ${currency}</strong></p>
                </div>
              </div>
              
              <p style="color: #000; margin: 20px 0;"><strong>Payment Date:</strong> ${now.format(
                "MMMM D, YYYY h:mm A",
              )} UTC</p>
              
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
        console.log(
          `📧 [TEST] Sent consolidated payment success email to ${brand.email} for ${payments.length} invoices`,
        );
      } catch (emailErr) {
        console.error(
          `❌ [TEST] Failed to send consolidated payment success email to ${brand?.email}:`,
          emailErr,
        );
      }
    }

    console.log(
      `📊 TEST: Payment processing complete: ${successfulPayments} successful, ${failedPayments} failed`,
    );
    console.log(
      `=== TEST: Payment run finished at ${now.format(
        "YYYY-MM-DD HH:mm:ss",
      )} UTC ===`,
    );
    return { successfulPayments, failedPayments };
  } catch (error) {
    console.error(
      "❌ TEST: Critical error in test payment processing:",
      error.message,
      error.stack,
    );
    return { successfulPayments: 0, failedPayments: 0 };
  }
}

// ==================== TESTING CRON JOBS ====================

// TEST CRON: Generate invoices every minute for events that are 5 minutes old
// DISABLED to prevent conflicts with production crons
// cron.schedule(
//   "* * * * *", // Run every minute for testing
//   async () => {
//     try {
//       await connectDB();
//       console.log(
//         `🧪 TEST: Starting invoice generation test at ${moment()
//           .utc()
//           .format("YYYY-MM-DD HH:mm:ss")} UTC`,
//       );
//       await generateInvoicesForVisitorEventsTest();
//     } catch (error) {
//       console.error(
//         "❌ TEST: Critical error in test invoice generation:",
//         error.message,
//         error.stack,
//       );
//     }
//   },
//   { scheduled: true, timezone: "UTC" },
// );

// TEST CRON: Pay invoices every minute for invoices that are 2 minutes old
// DISABLED to prevent conflicts with production crons and duplicate payments
// cron.schedule(
//   "* * * * *", // Run every minute for testing
//   async () => {
//     try {
//       await connectDB();
//       console.log(
//         `🧪 TEST: Starting payment test at ${moment()
//           .utc()
//           .format("YYYY-MM-DD HH:mm:ss")} UTC`,
//       );
//       await payInvoicesTest();
//     } catch (error) {
//       console.error(
//         "❌ TEST: Critical error in test payment processing:",
//         error.message,
//         error.stack,
//       );
//     }
//   },
//   { scheduled: true, timezone: "UTC" },
// );

// ==================== END TESTING FUNCTIONS ====================
