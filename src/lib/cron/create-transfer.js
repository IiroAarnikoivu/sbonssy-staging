require("dotenv").config();
const cron = require("node-cron");
const mongoose = require("mongoose");
const moment = require("moment");

const User = mongoose.models.User || require("../../models/User").default;
const Transaction =
  mongoose.models.Transaction || require("../../models/Transaction").default;
const Transfer =
  mongoose.models.Transfer || require("../../models/Transfer").default;
const Payout = mongoose.models.Payout || require("../../models/Payout").default;
const VisitorEvent =
  mongoose.models.VisitorEvent || require("../../models/VisitorEvent").default;
const Invoice =
  mongoose.models.Invoice || require("../../models/Invoice").default;
const stripe = require("../stripe").default;
const { connectDB } = require("../db");
const { toCamelCase } = require("../helper");
const {
  calculateAmbassadorPayout,
  generateTransferMetadata,
  generatePayoutPeriod,
} = require("../vat/vatCalculator");
const { creditAmbassadorBalance } = require("../ambassador/creditBalance");

// ============================================================================
// DEPRECATED: Per-invoice transfer cron job
// This has been replaced by the monthly threshold-based payout system.
// Ambassador balances now accumulate and are paid out on the 15th of each month
// only when they reach the €50 threshold.
// See: src/lib/cron/payout-monthly.js
// ============================================================================

// DISABLED: CRON job for automatic transfers - runs daily at 12 noon
// Processes transfers for invoices that were paid at 9am the same day
// if (process.env.NODE_ENV === "production")
//   cron.schedule(
//     "0 12 * * *", // At 12:00 noon daily (3 hours after invoice payments at 9am)
//     async () => {

// LEGACY: Keeping the cron disabled but code intact for potential rollback
const ENABLE_LEGACY_PER_INVOICE_TRANSFERS = false;

if (
  process.env.NODE_ENV === "production" &&
  ENABLE_LEGACY_PER_INVOICE_TRANSFERS
)
  cron.schedule(
    "0 12 * * *", // At 12:00 noon daily (3 hours after invoice payments at 9am)
    async () => {
      try {
        await connectDB();

        const now = moment().utc();

        // Get the date range for transactions that occurred today
        // This will capture payments made at 9am this morning
        const startOfToday = now.clone().startOf("day").toDate();
        const endOfToday = now.clone().endOf("day").toDate();

        // Find all transactions from today (succeeded or processing) that don't have corresponding transfers
        const transactions = await Transaction.aggregate([
          {
            $match: {
              status: { $in: ["succeeded", "processing"] }, // Include both succeeded and processing transactions
              invoiceId: { $ne: "N/A" }, // Only transactions with valid invoice IDs
              createdAt: {
                $gte: startOfToday,
                $lte: endOfToday,
              },
            },
          },
          {
            $lookup: {
              from: "invoices",
              localField: "invoiceId",
              foreignField: "stripeInvoiceId",
              as: "invoice",
            },
          },
          { $unwind: "$invoice" },
          {
            $match: {
              "invoice.status": "paid",
              $or: [
                // Old structure: athleteId directly in metadata
                { "invoice.lineItems.metadata.athleteId": { $exists: true } },
                // New structure: eventId with type ambassador_earnings
                {
                  "invoice.lineItems.metadata.eventId": { $exists: true },
                  "invoice.lineItems.metadata.type": "ambassador_earnings",
                },
              ],
            },
          },
          {
            $lookup: {
              from: "transfers",
              localField: "invoiceId",
              foreignField: "invoiceId",
              as: "existingTransfers",
            },
          },
          {
            $match: {
              existingTransfers: { $size: 0 }, // Only transactions without existing transfers
            },
          },
        ]);

        let successfulTransfers = 0;
        let failedTransfers = 0;

        for (const transaction of transactions) {
          try {
            // Check and correct transaction status if needed
            if (transaction.status === "processing") {
              try {
                const stripeInvoice = await stripe.invoices.retrieve(
                  transaction.invoiceId,
                );

                if (stripeInvoice.status === "paid") {
                  // Update transaction status to succeeded
                  await Transaction.findByIdAndUpdate(transaction._id, {
                    status: "succeeded",
                    updatedAt: new Date(),
                    description: `${transaction.description} (status corrected from processing to succeeded by cron)`,
                  });
                  transaction.status = "succeeded"; // Update local object
                } else {
                  continue;
                }
              } catch (stripeError) {
                continue;
              }
            }

            const transactionDate = moment(transaction.createdAt).utc();
            const transferDate = now;
            const hoursDiff = transferDate.diff(transactionDate, "hours", true);

            const invoice = transaction.invoice;

            // Extract ambassador earnings from line items (handle both old and new structures)
            const ambassadorEarnings = [];

            for (const item of invoice.lineItems) {
              let athleteId = null;
              let eventCreatedAt = null;

              // New structure: eventId in metadata (from cron-generated invoices)
              if (
                item.metadata?.eventId &&
                item.metadata?.type === "ambassador_earnings" &&
                item.amount > 0
              ) {
                try {
                  const VisitorEvent =
                    mongoose.models.VisitorEvent ||
                    require("../../models/VisitorEvent").default;
                  const event = await VisitorEvent.findById(
                    item.metadata.eventId,
                  );
                  if (event?.athleteId) {
                    athleteId = event.athleteId;
                    eventCreatedAt = event.createdAt;
                  }
                } catch (eventError) {}
              }
              // Old structure: athleteId directly in metadata (legacy invoices)
              else if (item.metadata?.athleteId && item.amount > 0) {
                athleteId = item.metadata.athleteId;
              }

              // Only include items with valid athleteId and positive amounts
              if (athleteId) {
                ambassadorEarnings.push({
                  athleteId: athleteId,
                  amount: item.amount,
                  description:
                    item.description ||
                    `Earnings from invoice ${invoice.stripeInvoiceId}`,
                  eventCreatedAt,
                });
              }
            }

            if (!ambassadorEarnings.length) {
              continue;
            }

            // Process transfers for each ambassador
            const transfers = [];
            const payouts = [];
            const period = generatePayoutPeriod(transactionDate.toDate());

            for (const earning of ambassadorEarnings) {
              try {
                const athlete = await User.findById(earning.athleteId);
                if (!athlete) {
                  continue;
                }

                const subRole = toCamelCase(athlete?.subRole) || "";
                const athleteProfile = athlete?.[subRole];
                const stripeAccountId = athleteProfile?.stripeAccountId || "";

                if (!stripeAccountId) {
                  continue;
                }

                // Calculate VAT-aware payout amounts
                // earning.amount is already in cents, so convert to euros for VAT calculation
                const commissionInEuros = earning.amount / 100;
                let payoutCalculation = calculateAmbassadorPayout(
                  commissionInEuros,
                  athleteProfile,
                );
                // Mirror invoice VAT only (main): enforce VAT strictly from invoice (robust to string/number types)
                try {
                  const rate = Number(invoice?.vatRate || 0);
                  const treatment = (invoice?.vatTreatment || "").toString();
                  const invHasVat = rate > 0 && treatment === "domestic";
                  if (invHasVat) {
                    const vatAmt =
                      Math.round(commissionInEuros * rate * 100) / 100;
                    payoutCalculation = {
                      commissionAmount:
                        Math.round(commissionInEuros * 100) / 100,
                      vatAmount: vatAmt,
                      grossAmount:
                        Math.round((commissionInEuros + vatAmt) * 100) / 100,
                      vatApplied: true,
                      vatRate: rate,
                      vatNumber: null,
                      vatCountry: "FI",
                      treatment,
                      note: "mirror_invoice_vat",
                    };
                  } else {
                    payoutCalculation = {
                      commissionAmount:
                        Math.round(commissionInEuros * 100) / 100,
                      vatAmount: 0,
                      grossAmount: Math.round(commissionInEuros * 100) / 100,
                      vatApplied: false,
                      vatRate: 0,
                      vatNumber: null,
                      vatCountry: null,
                      treatment: "no_vat",
                      note: "mirror_invoice_no_vat",
                    };
                  }
                } catch (_) {}
                const grossAmountCents = Math.round(
                  payoutCalculation.grossAmount * 100,
                );

                console.log(
                  `💰 Transfer calculation for athlete ${earning.athleteId}:`,
                  {
                    commissionCents: earning.amount,
                    commissionEuros: commissionInEuros,
                    vatApplied: payoutCalculation.vatApplied,
                    vatAmount: payoutCalculation.vatAmount,
                    grossAmount: payoutCalculation.grossAmount,
                    grossAmountCents: grossAmountCents,
                    vatRate: payoutCalculation.vatRate,
                    treatment: payoutCalculation.treatment,
                  },
                );

                // Generate VAT-aware metadata
                const vatMetadata = generateTransferMetadata(
                  payoutCalculation,
                  period,
                  invoice.campaignId || "N/A",
                );

                // Create Stripe transfer with gross amount (commission + VAT)
                const transfer = await stripe.transfers.create({
                  amount: grossAmountCents,
                  currency: invoice.currency || "eur",
                  destination: stripeAccountId,
                  description: `${earning.description}${
                    payoutCalculation.vatApplied ? " (incl. VAT)" : ""
                  }`,
                  metadata: {
                    ...vatMetadata,
                    transactionId: String(transaction.transactionId),
                    invoiceId: String(invoice.stripeInvoiceId),
                    athleteId: String(earning.athleteId),
                    transferTiming: "daily_noon",
                    paymentDate: transactionDate.format("YYYY-MM-DD HH:mm:ss"),
                    transferDate: transferDate.format("YYYY-MM-DD HH:mm:ss"),
                  },
                });

                // Save transfer in MongoDB
                const savedTransfer = await Transfer.create({
                  transferId: transfer.id,
                  amount: transfer.amount,
                  currency: transfer.currency,
                  status: transfer.status || "pending",
                  destination: transfer.destination,
                  invoiceId: invoice.stripeInvoiceId,
                  transactionId: transaction.transactionId,
                  athleteId: String(earning.athleteId),
                  brandId: String(
                    invoice.brandId || transaction.brandId || "N/A",
                  ),
                  campaignId: String(
                    invoice.campaignId || transaction.campaignId || "N/A",
                  ),
                  createdAt: new Date(transfer.created * 1000),
                  description: transfer.description || earning.description,
                });

                // Save VAT-aware payout record
                const savedPayout = await Payout.create({
                  ambassadorId: earning.athleteId,
                  campaignId: invoice.campaignId || transaction.campaignId,
                  stripePayoutId: transfer.id, // Legacy field
                  stripeTransferId: transfer.id,
                  commissionAmount: Math.round(
                    payoutCalculation.commissionAmount * 100,
                  ),
                  vatAmount: Math.round(payoutCalculation.vatAmount * 100),
                  grossAmount: grossAmountCents,
                  vatApplied: payoutCalculation.vatApplied,
                  vatRate: payoutCalculation.vatRate,
                  vatNumber: payoutCalculation.vatNumber,
                  vatCountry: payoutCalculation.vatCountry,
                  amount: grossAmountCents, // Legacy field for backward compatibility
                  status: "transferred",
                  period: period,
                  createdAt: new Date(transfer.created * 1000),
                });

                transfers.push(savedTransfer);
                payouts.push(savedPayout);

                // Attempt to notify athlete via email (non-blocking)
                try {
                  const { sendEmail } = await import("../sendEmail.js");
                  if (athlete?.email) {
                    const grossAmountDisplay = (
                      savedPayout.grossAmount / 100
                    ).toFixed(2);
                    const commissionDisplay = (
                      savedPayout.commissionAmount / 100
                    ).toFixed(2);
                    const vatAmountDisplay = (
                      savedPayout.vatAmount / 100
                    ).toFixed(2);
                    const currency =
                      savedTransfer.currency?.toUpperCase() || "EUR";

                    const subject = `Payout received: ${grossAmountDisplay} ${currency}${
                      payoutCalculation.vatApplied ? " (incl. VAT)" : ""
                    }`;

                    let vatText = "";
                    if (payoutCalculation.vatApplied) {
                      vatText = `\nCommission: ${commissionDisplay} ${currency}\nVAT (${(
                        payoutCalculation.vatRate * 100
                      ).toFixed(
                        1,
                      )}%): ${vatAmountDisplay} ${currency}\nVAT Number: ${
                        payoutCalculation.vatNumber || "N/A"
                      }\nVAT Country: ${payoutCalculation.vatCountry || "N/A"}`;
                    }

                    const text = `Hello ${
                      athlete?.name || "there"
                    },\n\nYou have received a payout.\n\nGross Amount: ${grossAmountDisplay} ${currency}${vatText}\nDescription: ${
                      savedTransfer.description
                    }\nInvoice: ${savedTransfer.invoiceId}\nTransaction: ${
                      savedTransfer.transactionId
                    }\nPayment Date: ${transactionDate.format(
                      "MMMM Do, YYYY at h:mm A",
                    )}\nTransfer Date: ${transferDate.format(
                      "MMMM Do, YYYY at h:mm A",
                    )}\nDestination: ${savedTransfer.destination}\nStatus: ${
                      savedTransfer.status
                    }\nPeriod: ${period}\nTreatment: ${
                      payoutCalculation.treatment
                    }\n\nThank you.`;
                    let vatHtml = "";
                    if (payoutCalculation.vatApplied) {
                      vatHtml = `
                      <li><strong>Commission</strong>: ${commissionDisplay} ${currency}</li>
                      <li><strong>VAT (${(
                        payoutCalculation.vatRate * 100
                      ).toFixed(
                        1,
                      )}%)</strong>: ${vatAmountDisplay} ${currency}</li>
                      <li><strong>VAT Number</strong>: ${
                        payoutCalculation.vatNumber || "N/A"
                      }</li>
                      <li><strong>VAT Country</strong>: ${
                        payoutCalculation.vatCountry || "N/A"
                      }</li>
                    `;
                    }

                    const html = `
                    <p>Hello ${athlete?.name || "there"},</p>
                    <p>You have received a payout.</p>
                    <ul>
                      <li><strong>Gross Amount</strong>: ${grossAmountDisplay} ${currency}${
                        payoutCalculation.vatApplied ? " (incl. VAT)" : ""
                      }</li>
                      ${vatHtml}
                      <li><strong>Description</strong>: ${
                        savedTransfer.description
                      }</li>
                      <li><strong>Invoice</strong>: ${
                        savedTransfer.invoiceId
                      }</li>
                      <li><strong>Transaction</strong>: ${
                        savedTransfer.transactionId
                      }</li>
                      <li><strong>Payment Date</strong>: ${transactionDate.format(
                        "MMMM Do, YYYY at h:mm A",
                      )}</li>
                      <li><strong>Transfer Date</strong>: ${transferDate.format(
                        "MMMM Do, YYYY at h:mm A",
                      )}</li>
                      <li><strong>Destination</strong>: ${
                        savedTransfer.destination
                      }</li>
                      <li><strong>Status</strong>: ${savedTransfer.status}</li>
                      <li><strong>Period</strong>: ${period}</li>
                      <li><strong>Treatment</strong>: ${
                        payoutCalculation.treatment
                      }</li>
                    </ul>
                    <p>Thank you.</p>
                  `;
                    await sendEmail({ to: athlete.email, subject, text, html });
                  }
                } catch (emailErr) {}
              } catch (athleteError) {
                failedTransfers++;
              }
            }

            if (transfers.length > 0) {
              successfulTransfers++;
            }
          } catch (transactionError) {
            failedTransfers++;
          }
        }
      } catch (error) {}
    },
    { scheduled: true, timezone: "UTC" },
  );

// Credit ambassador balances daily at 12:00 UTC for newly paid invoices
if (process.env.NODE_ENV === "production")
  cron.schedule(
    "0 12 * * *",
    async () => {
      try {
        await connectDB();

        const now = moment().utc();
        const startOfToday = now.clone().startOf("day").toDate();
        const endOfToday = now.clone().endOf("day").toDate();

        const invoices = await Invoice.find({
          status: "paid",
          $and: [
            {
              $or: [
                { ambassadorCreditedAt: { $exists: false } },
                { ambassadorCreditedAt: null },
              ],
            },
            {
              $or: [
                { paidAt: { $gte: startOfToday, $lte: endOfToday } },
                { updatedAt: { $gte: startOfToday, $lte: endOfToday } },
              ],
            },
          ],
        });

        for (const inv of invoices) {
          try {
            await creditAmbassadorBalance(inv);
          } catch (_) {}
        }
      } catch (_) {}
    },
    { scheduled: true, timezone: "UTC" },
  );

// ==================== TESTING FUNCTIONS ====================
// These functions use minutes instead of hours/days for quick testing

async function processCreditsTest() {
  try {
    await connectDB();

    const now = moment().utc();
    const twoMinutesAgo = now.clone().subtract(2, "minutes");
    const startTime = twoMinutesAgo.clone().subtract(30, "seconds").toDate();
    const endTime = twoMinutesAgo.clone().add(30, "seconds").toDate();

    const invoices = await Invoice.find({
      status: "paid",
      $and: [
        {
          $or: [
            { ambassadorCreditedAt: { $exists: false } },
            { ambassadorCreditedAt: null },
          ],
        },
        {
          $or: [
            { paidAt: { $gte: startTime, $lte: endTime } },
            { updatedAt: { $gte: startTime, $lte: endTime } },
          ],
        },
      ],
    });

    let credited = 0;
    for (const inv of invoices) {
      try {
        const res = await creditAmbassadorBalance(inv);
        if (res?.success) credited += 1;
      } catch (_) {}
    }

    return { credited };
  } catch (error) {
    return { credited: 0 };
  }
}

// TESTING: Process transfers for invoices that were paid exactly 2 minutes ago
async function processTransfersTest() {
  try {
    await connectDB();

    const now = moment().utc();

    // Calculate the exact time range for transactions that occurred 2 minutes ago
    const twoMinutesAgo = now.clone().subtract(2, "minutes");

    // Find transactions that occurred exactly 2 minutes ago (within a 30-second window)
    const startTime = twoMinutesAgo.clone().subtract(30, "seconds").toDate();
    const endTime = twoMinutesAgo.clone().add(30, "seconds").toDate();

    // Find all transactions from 2 minutes ago (succeeded or processing) that don't have corresponding transfers
    const transactions = await Transaction.aggregate([
      {
        $match: {
          status: { $in: ["succeeded", "processing"] }, // Include both succeeded and processing transactions
          invoiceId: { $ne: "N/A" }, // Only transactions with valid invoice IDs
          createdAt: {
            $gte: startTime,
            $lte: endTime,
          },
        },
      },
      {
        $lookup: {
          from: "invoices",
          localField: "invoiceId",
          foreignField: "stripeInvoiceId",
          as: "invoice",
        },
      },
      { $unwind: "$invoice" },
      {
        $match: {
          "invoice.status": "paid",
          $or: [
            // Old structure: athleteId directly in metadata
            { "invoice.lineItems.metadata.athleteId": { $exists: true } },
            // New structure: eventId with type ambassador_earnings
            {
              "invoice.lineItems.metadata.eventId": { $exists: true },
              "invoice.lineItems.metadata.type": "ambassador_earnings",
            },
          ],
        },
      },
      {
        $lookup: {
          from: "transfers",
          localField: "invoiceId",
          foreignField: "invoiceId",
          as: "existingTransfers",
        },
      },
      {
        $match: {
          existingTransfers: { $size: 0 }, // Only transactions without existing transfers
        },
      },
    ]);

    let successfulTransfers = 0;
    let failedTransfers = 0;

    for (const transaction of transactions) {
      try {
        // Check and correct transaction status if needed
        if (transaction.status === "processing") {
          try {
            const stripeInvoice = await stripe.invoices.retrieve(
              transaction.invoiceId,
            );
            if (stripeInvoice.status === "paid") {
              // Update transaction status to succeeded
              await Transaction.findByIdAndUpdate(transaction._id, {
                status: "succeeded",
                updatedAt: new Date(),
                description: `${transaction.description} (status corrected from processing to succeeded by test cron)`,
              });
              transaction.status = "succeeded"; // Update local object
            } else {
              continue;
            }
          } catch (stripeError) {
            continue;
          }
        }

        const transactionDate = moment(transaction.createdAt).utc();
        const transferDate = now;
        const minutesDiff = transferDate.diff(transactionDate, "minutes", true);

        const invoice = transaction.invoice;

        // Extract ambassador earnings from line items (handle both old and new structures)
        const ambassadorEarnings = [];

        for (const item of invoice.lineItems) {
          let athleteId = null;
          let eventCreatedAt = null;

          // New structure: eventId in metadata (from cron-generated invoices)
          if (
            item.metadata?.eventId &&
            item.metadata?.type === "ambassador_earnings" &&
            item.amount > 0
          ) {
            try {
              const VisitorEvent =
                mongoose.models.VisitorEvent ||
                require("../../models/VisitorEvent").default;
              const event = await VisitorEvent.findById(item.metadata.eventId);
              if (event?.athleteId) {
                athleteId = event.athleteId;
                eventCreatedAt = event.createdAt;
              }
            } catch (eventError) {}
          }
          // Old structure: athleteId directly in metadata (legacy invoices)
          else if (item.metadata?.athleteId && item.amount > 0) {
            athleteId = item.metadata.athleteId;
          }

          // Only include items with valid athleteId and positive amounts
          if (athleteId) {
            ambassadorEarnings.push({
              athleteId: athleteId,
              amount: item.amount,
              description:
                item.description ||
                `TEST: Earnings from invoice ${invoice.stripeInvoiceId}`,
              eventCreatedAt,
            });
          }
        }

        if (!ambassadorEarnings.length) {
          continue;
        }

        // Process transfers for each ambassador
        const transfers = [];
        for (const earning of ambassadorEarnings) {
          try {
            const athlete = await User.findById(earning.athleteId);
            if (!athlete) {
              continue;
            }

            const subRole = toCamelCase(athlete?.subRole) || "";
            const stripeAccountId = athlete?.[subRole]?.stripeAccountId || "";

            if (!stripeAccountId) {
              continue;
            }

            const athleteProfile = athlete?.[subRole];

            // Calculate VAT-aware payout amounts for TEST
            const commissionInEuros = earning.amount / 100;
            let payoutCalculation = calculateAmbassadorPayout(
              commissionInEuros,
              athleteProfile,
            );
            // Mirror invoice VAT only (TEST): enforce VAT strictly from invoice
            try {
              const invHasVat =
                typeof invoice?.vatRate === "number" &&
                invoice.vatRate > 0 &&
                (invoice?.vatTreatment || "").toString() === "domestic";
              if (invHasVat) {
                const rate = Number(invoice.vatRate) || 0;
                const vatAmt = Math.round(commissionInEuros * rate * 100) / 100;
                payoutCalculation = {
                  commissionAmount: Math.round(commissionInEuros * 100) / 100,
                  vatAmount: vatAmt,
                  grossAmount:
                    Math.round((commissionInEuros + vatAmt) * 100) / 100,
                  vatApplied: true,
                  vatRate: rate,
                  vatNumber: null,
                  vatCountry: "FI",
                  treatment: (invoice?.vatTreatment || "domestic").toString(),
                  note: "mirror_invoice_vat_test",
                };
              } else {
                payoutCalculation = {
                  commissionAmount: Math.round(commissionInEuros * 100) / 100,
                  vatAmount: 0,
                  grossAmount: Math.round(commissionInEuros * 100) / 100,
                  vatApplied: false,
                  vatRate: 0,
                  vatNumber: null,
                  vatCountry: null,
                  treatment: "no_vat",
                  note: "mirror_invoice_no_vat_test",
                };
              }
            } catch (_) {}
            const grossAmountCents = Math.round(
              payoutCalculation.grossAmount * 100,
            );

            console.log(
              `💰 TEST: Transfer calculation for athlete ${earning.athleteId}:`,
              {
                commissionCents: earning.amount,
                commissionEuros: commissionInEuros,
                vatApplied: payoutCalculation.vatApplied,
                vatAmount: payoutCalculation.vatAmount,
                grossAmount: payoutCalculation.grossAmount,
                grossAmountCents: grossAmountCents,
                vatRate: payoutCalculation.vatRate,
                treatment: payoutCalculation.treatment,
              },
            );

            // Generate VAT-aware metadata
            const period = generatePayoutPeriod(transactionDate.toDate());
            const vatMetadata = generateTransferMetadata(
              payoutCalculation,
              period,
              invoice.campaignId || "N/A",
            );

            // Create Stripe transfer with gross amount (commission + VAT)
            const transfer = await stripe.transfers.create({
              amount: grossAmountCents,
              currency: invoice.currency || "eur",
              destination: stripeAccountId,
              description: `TEST: ${earning.description}${
                payoutCalculation.vatApplied ? " (incl. VAT)" : ""
              }`,
              metadata: {
                ...vatMetadata,
                transactionId: String(transaction.transactionId),
                invoiceId: String(invoice.stripeInvoiceId),
                athleteId: String(earning.athleteId),
                campaignId: String(invoice.campaignId || "N/A"),
                transferTiming: "test_2_minutes",
                paymentDate: transactionDate.format("YYYY-MM-DD HH:mm:ss"),
                transferDate: transferDate.format("YYYY-MM-DD HH:mm:ss"),
                testMode: "true",
              },
            });

            // Save transfer in MongoDB
            const savedTransfer = await Transfer.create({
              transferId: transfer.id,
              amount: transfer.amount,
              currency: transfer.currency,
              status: transfer.status || "pending",
              destination: transfer.destination,
              invoiceId: invoice.stripeInvoiceId,
              transactionId: transaction.transactionId,
              athleteId: String(earning.athleteId),
              brandId: String(invoice.brandId || transaction.brandId || "N/A"),
              campaignId: String(
                invoice.campaignId || transaction.campaignId || "N/A",
              ),
              createdAt: new Date(transfer.created * 1000),
              description: `TEST: ${
                transfer.description || earning.description
              }`,
            });

            // Create corresponding payout record for TEST
            const savedPayout = await Payout.create({
              athleteId: earning.athleteId,
              brandId: invoice.brandId || transaction.brandId,
              campaignId: invoice.campaignId || transaction.campaignId,
              stripePayoutId: transfer.id, // Legacy field
              stripeTransferId: transfer.id,
              commissionAmount: Math.round(
                payoutCalculation.commissionAmount * 100,
              ),
              vatAmount: Math.round(payoutCalculation.vatAmount * 100),
              grossAmount: grossAmountCents,
              vatApplied: payoutCalculation.vatApplied,
              vatRate: payoutCalculation.vatRate,
              vatNumber: payoutCalculation.vatNumber,
              vatCountry: payoutCalculation.vatCountry,
              treatment: payoutCalculation.treatment,
              currency: transfer.currency,
              status: transfer.status || "pending",
              invoiceId: invoice.stripeInvoiceId,
              transactionId: transaction.transactionId,
              period,
              createdAt: new Date(transfer.created * 1000),
              description: `TEST: ${
                transfer.description || earning.description
              }`,
            });

            transfers.push(savedTransfer);

            // Attempt to notify athlete via email (non-blocking)
            try {
              const { sendEmail } = await import("../sendEmail.js");
              if (athlete?.email) {
                const grossAmountDisplay = (
                  savedPayout.grossAmount / 100
                ).toFixed(2);
                const commissionDisplay = (
                  savedPayout.commissionAmount / 100
                ).toFixed(2);
                const vatAmountDisplay = (savedPayout.vatAmount / 100).toFixed(
                  2,
                );
                const currency = savedTransfer.currency?.toUpperCase() || "EUR";

                const subject = `[TEST] Payout received: ${grossAmountDisplay} ${currency}${
                  payoutCalculation.vatApplied ? " (incl. VAT)" : ""
                }`;

                let vatText = "";
                if (payoutCalculation.vatApplied) {
                  vatText = `\nCommission: ${commissionDisplay} ${currency}\nVAT (${(
                    payoutCalculation.vatRate * 100
                  ).toFixed(
                    1,
                  )}%): ${vatAmountDisplay} ${currency}\nVAT Number: ${
                    payoutCalculation.vatNumber || "N/A"
                  }\nVAT Country: ${payoutCalculation.vatCountry || "N/A"}`;
                }

                const text = `Hello ${
                  athlete?.name || "there"
                },\n\n[TEST MODE] You have received a payout.\n\nGross Amount: ${grossAmountDisplay} ${currency}${vatText}\nDescription: ${
                  savedTransfer.description
                }\nInvoice: ${savedTransfer.invoiceId}\nTransaction: ${
                  savedTransfer.transactionId
                }\nPayment Time: ${transactionDate.format(
                  "MMMM Do, YYYY at h:mm A",
                )}\nTransfer Time: ${transferDate.format(
                  "MMMM Do, YYYY at h:mm A",
                )}\nDelay: ${minutesDiff.toFixed(1)} minutes\nDestination: ${
                  savedTransfer.destination
                }\nStatus: ${savedTransfer.status}\nTreatment: ${
                  payoutCalculation.treatment
                }\n\nThis is a test transfer generated ${minutesDiff.toFixed(
                  1,
                )} minutes after the payment.\n\nThank you.`;
                const html = `
                  <p>Hello ${athlete?.name || "there"},</p>
                  <p><strong>[TEST MODE]</strong> You have received a payout.</p>
                  <ul>
                    <li><strong>Amount</strong>: ${amountDisplay} ${
                      savedTransfer.currency?.toUpperCase() || "EUR"
                    }</li>
                    <li><strong>Description</strong>: ${
                      savedTransfer.description
                    }</li>
                    <li><strong>Invoice</strong>: ${
                      savedTransfer.invoiceId
                    }</li>
                    <li><strong>Transaction</strong>: ${
                      savedTransfer.transactionId
                    }</li>
                    <li><strong>Payment Time</strong>: ${transactionDate.format(
                      "MMMM Do, YYYY at h:mm A",
                    )}</li>
                    <li><strong>Transfer Time</strong>: ${transferDate.format(
                      "MMMM Do, YYYY at h:mm A",
                    )}</li>
                    <li><strong>Delay</strong>: ${minutesDiff.toFixed(
                      1,
                    )} minutes</li>
                    <li><strong>Destination</strong>: ${
                      savedTransfer.destination
                    }</li>
                    <li><strong>Status</strong>: ${savedTransfer.status}</li>
                  </ul>
                  <p><em>This is a test transfer generated ${minutesDiff.toFixed(
                    1,
                  )} minutes after the payment.</em></p>
                  <p>Thank you.</p>
                `;
                await sendEmail({ to: athlete.email, subject, text, html });
              }
            } catch (emailErr) {}
          } catch (athleteError) {
            failedTransfers++;
          }
        }

        if (transfers.length > 0) {
          successfulTransfers++;
        }
      } catch (transactionError) {
        failedTransfers++;
      }
    }

    return { successfulTransfers, failedTransfers };
  } catch (error) {
    return { successfulTransfers: 0, failedTransfers: 0 };
  }
}

// ==================== TESTING CRON JOBS ====================

// TEST CRON: Process transfers every minute for transactions that are 2 minutes old
// This runs 2 minutes after the payment test cron (which processes invoices that are 2 minutes old)
// cron.schedule(
//   "* * * * *", // Run every minute for testing
//   async () => {
//     try {
//       await connectDB();
//       await processTransfersTest();
//     } catch (error) {}
//   },
//   { scheduled: true, timezone: "UTC" },
// );

// ==================== END TESTING FUNCTIONS ====================
