import Invoice from "../../models/Invoice.js";
import User from "../../models/User.js";
import VisitorEvent from "../../models/VisitorEvent.js";
import AmbassadorBalanceCredit from "../../models/AmbassadorBalanceCredit.js";
import { toCamelCase } from "../helper.js";
import {
  calculateAmbassadorPayout,
  generatePayoutPeriod,
} from "../vat/vatCalculator.js";

/**
 * Credit ambassador balance when invoice is paid
 * This replaces the per-invoice transfer with balance accumulation
 *
 * Can be called from:
 * - Webhook: invoice.payment_succeeded
 * - Manual payment: /api/payments/pay-invoice
 *
 * @param {Object} invoice - The local Invoice document (must have lineItems populated)
 * @returns {Object} - { success, creditedCount, error }
 */
export async function creditAmbassadorBalance(invoice) {
  try {
    console.log("[creditAmbassadorBalance] start", {
      stripeInvoiceId: invoice?.stripeInvoiceId,
      vatRate: invoice?.vatRate,
      vatTreatment: invoice?.vatTreatment,
      vatAmount: invoice?.vatAmount,
      subtotal: invoice?.subtotal,
      total: invoice?.total,
      brandId: invoice?.brandId,
      campaignId: invoice?.campaignId,
    });

    // Hydrate from local Invoice if essential fields are missing (defensive when caller passes a Stripe object)
    if (
      !invoice?.stripeInvoiceId ||
      typeof invoice?.vatRate === "undefined" ||
      !Array.isArray(invoice?.lineItems)
    ) {
      try {
        // Try multiple lookup strategies
        let saved = null;

        // Strategy 1: Lookup by stripeInvoiceId or Stripe id
        const lookupKey = invoice?.stripeInvoiceId || invoice?.id || null;
        if (lookupKey) {
          saved = await Invoice.findOne({
            stripeInvoiceId: lookupKey,
          }).lean();
        }

        // Strategy 2: If not found and we have a MongoDB _id, try that
        if (!saved && invoice?._id) {
          saved = await Invoice.findById(invoice._id).lean();
        }

        if (saved) {
          invoice = { ...saved };
          console.log("[creditAmbassadorBalance] hydrated local invoice", {
            stripeInvoiceId: invoice?.stripeInvoiceId,
            hasLineItems: Array.isArray(invoice?.lineItems),
            vatRate: invoice?.vatRate,
            vatTreatment: invoice?.vatTreatment,
          });
        } else {
          console.warn(
            "[creditAmbassadorBalance] could not hydrate local invoice by key",
            lookupKey || invoice?._id,
          );
        }
      } catch (hydrateErr) {
        console.error(
          "[creditAmbassadorBalance] hydrate error",
          hydrateErr?.message,
        );
      }
    }
    // Check if already credited (idempotency check)
    if (invoice.ambassadorCreditedAt) {
      console.log(
        `📋 Invoice ${invoice.stripeInvoiceId} already credited, checking for VAT top-up`,
      );
      // Do not return here; proceed to existingCredits check to perform VAT top-up if needed
    }

    // Skip crediting if the related commission was cancelled (refund/cancellation)
    if (invoice.eventId) {
      try {
        const relatedEvent = await VisitorEvent.findById(invoice.eventId);
        if (
          relatedEvent?.cancelledAt ||
          relatedEvent?.commissionStatus === "cancelled"
        ) {
          console.log(
            `📋 Invoice ${invoice.stripeInvoiceId} linked to cancelled commission, skipping credit`,
          );
          return {
            success: true,
            creditedCount: 0,
            skipped: true,
            reason: "commission_cancelled",
          };
        }
      } catch (_) {
        // Non-blocking: continue if event lookup fails
      }
    }

    // Also check the AmbassadorBalanceCredit collection for extra safety
    const existingCredits = await AmbassadorBalanceCredit.find({
      stripeInvoiceId: invoice.stripeInvoiceId,
    });
    if (existingCredits.length) {
      // If VAT was missed previously, top up the delta so balances include commission + VAT
      const rate = Number(invoice?.vatRate || 0);
      const treatment = (invoice?.vatTreatment || "").toString();
      const needsVat = rate > 0 && treatment === "domestic";

      let toppedUp = 0;
      if (needsVat) {
        for (const credit of existingCredits) {
          // Only top up if commission existed and VAT was zero/under-applied
          const commissionCents = credit.commissionAmountCents || 0;
          if (commissionCents <= 0) continue;
          const expectedVatCents = Math.round(commissionCents * rate);
          const alreadyVatCents = credit.vatAmountCents || 0;
          const delta = expectedVatCents - alreadyVatCents;
          if (delta > 0) {
            const ambassadorId = credit.ambassadorId || null;
            if (ambassadorId) {
              // Resolve current subRole to build the payout balance path safely
              const ambDoc = await User.findById(ambassadorId).select(
                "subRole athlete paraAthlete exAthlete coach team influencer",
              );
              const subRoleKey =
                toCamelCase(ambDoc?.subRole || "") || "athlete";
              const updatePath = `${subRoleKey}.payoutBalanceCents`;
              const before = ambDoc?.[subRoleKey]?.payoutBalanceCents || 0;

              await User.findByIdAndUpdate(
                ambassadorId,
                { $inc: { [updatePath]: delta } },
                { new: true },
              );
              await AmbassadorBalanceCredit.create({
                ambassadorId,
                invoiceId: invoice._id,
                stripeInvoiceId: invoice.stripeInvoiceId,
                campaignId: invoice.campaignId,
                eventId: invoice.eventId,
                commissionAmountCents: 0,
                vatAmountCents: delta,
                grossAmountCents: delta,
                vatApplied: true,
                vatRate: rate,
                vatNumber: null,
                vatCountry: "FI",
                balanceBeforeCents: before,
                balanceAfterCents: before + delta,
                period: generatePayoutPeriod(new Date()),
                description:
                  credit.description ||
                  `VAT top-up for invoice ${invoice.stripeInvoiceId}`,
                note: "vat_topup",
              });
              toppedUp += 1;
            }
          }
        }
      }

      console.log(
        `📋 Credit record exists for invoice ${invoice.stripeInvoiceId}, skipping new credit${toppedUp ? `; topped up VAT for ${toppedUp} credit(s)` : ""}`,
      );
      // Update invoice to mark as credited if not already
      await Invoice.findByIdAndUpdate(invoice._id, {
        ambassadorCreditedAt: existingCredits[0].createdAt,
      });
      return { success: true, creditedCount: 0, skipped: true, toppedUp };
    }

    // Extract ambassador earnings from line items
    const ambassadorEarnings = [];

    for (const item of invoice.lineItems || []) {
      let athleteId = null;
      let eventCreatedAt = null;

      // New structure: eventId in metadata (from cron-generated invoices)
      // Handle both Map (from Mongoose) and plain object
      const getMetadata = (key) => {
        if (item.metadata?.get) {
          return item.metadata.get(key);
        }
        return item.metadata?.[key];
      };

      if (
        getMetadata("eventId") &&
        getMetadata("type") === "ambassador_earnings" &&
        item.amount > 0
      ) {
        try {
          const event = await VisitorEvent.findById(getMetadata("eventId"));
          if (event?.athleteId) {
            athleteId = event.athleteId;
            eventCreatedAt = event.createdAt;
          }
        } catch (eventError) {
          console.error("Error fetching event:", eventError.message);
        }
      }
      // Old structure: athleteId directly in metadata (legacy invoices)
      else if (getMetadata("athleteId") && item.amount > 0) {
        athleteId = getMetadata("athleteId");
      }

      // Only include items with valid athleteId and positive amounts
      if (athleteId) {
        ambassadorEarnings.push({
          athleteId: athleteId,
          amount: item.amount, // in cents
          description:
            item.description ||
            `Earnings from invoice ${invoice.stripeInvoiceId}`,
          eventCreatedAt,
          itemMetadata: item.metadata,
        });
      }
    }

    if (!ambassadorEarnings.length) {
      console.log(
        `📋 No ambassador earnings found in invoice ${invoice.stripeInvoiceId}`,
      );
      // Still mark as credited to prevent reprocessing
      await Invoice.findByIdAndUpdate(invoice._id, {
        ambassadorCreditedAt: new Date(),
      });
      return { success: true, creditedCount: 0, noEarnings: true };
    }

    const period = generatePayoutPeriod(new Date());
    let creditedCount = 0;

    // Process balance credits for each ambassador
    for (const earning of ambassadorEarnings) {
      try {
        const athlete = await User.findById(earning.athleteId);
        if (!athlete) {
          console.warn(`Ambassador ${earning.athleteId} not found, skipping`);
          continue;
        }

        const subRole = toCamelCase(athlete?.subRole) || "";
        const athleteProfile = athlete?.[subRole];

        if (!athleteProfile) {
          console.warn(
            `Ambassador ${earning.athleteId} has no profile for role ${subRole}, skipping`,
          );
          continue;
        }

        // Calculate VAT-aware payout amounts
        const commissionInEuros = earning.amount / 100;
        let payoutCalculation = calculateAmbassadorPayout(
          commissionInEuros,
          athleteProfile,
        );

        // Use ambassador's VAT status AT INVOICE TIME if available in metadata
        const getMetadata = (key) => {
          if (earning.itemMetadata?.get) {
            return earning.itemMetadata.get(key);
          }
          return earning.itemMetadata?.[key];
        };

        const ambCountryAtInvoiceTime = getMetadata("athleteVatCountry");
        const ambVatStatusAtInvoiceTime = getMetadata("athleteVatStatus");

        const FINNISH_VAT_RATE = 0.255;
        try {
          const vd = athleteProfile?.vatDetails || {};

          // Use stored metadata if it exists (even if it says "not_provided")
          // Fall back to current profile only if metadata is COMPLETELY missing (legacy invoices)
          const useStoredMetadata =
            typeof ambVatStatusAtInvoiceTime !== "undefined";

          const ambCountry = useStoredMetadata
            ? (ambCountryAtInvoiceTime || "").toString().toUpperCase()
            : (
                vd.vatCountry ||
                vd.registrationCountry ||
                athleteProfile.vatCountry ||
                athleteProfile.registrationCountry ||
                ""
              )
                .toString()
                .toUpperCase();

          const ambVatStatus = useStoredMetadata
            ? (ambVatStatusAtInvoiceTime || "not_provided")
                .toString()
                .toLowerCase()
            : (vd.vatStatus || athleteProfile.vatStatus || "not_provided")
                .toString()
                .toLowerCase();

          console.log(
            `[creditAmbassadorBalance] VAT decision (${useStoredMetadata ? "from invoice metadata" : "from current status"})`,
            {
              athleteId: earning.athleteId,
              commissionCents: earning.amount,
              ambCountry,
              ambVatStatus,
              willApplyVat: ambVatStatus === "valid" && ambCountry === "FI",
            },
          );

          // If ambassador has valid Finnish VAT, add VAT to payout
          if (ambVatStatus === "valid" && ambCountry === "FI") {
            const vatAmt =
              Math.round(commissionInEuros * FINNISH_VAT_RATE * 100) / 100;
            payoutCalculation = {
              commissionAmount: Math.round(commissionInEuros * 100) / 100,
              vatAmount: vatAmt,
              grossAmount: Math.round((commissionInEuros + vatAmt) * 100) / 100,
              vatApplied: true,
              vatRate: FINNISH_VAT_RATE,
              vatNumber: vd.vatNumber || null,
              vatCountry: "FI",
              treatment: "finnish_vat",
              note: useStoredMetadata
                ? "ambassador_had_valid_fi_vat_at_invoice_time"
                : "ambassador_has_valid_fi_vat",
            };
            console.log(
              "[creditAmbassadorBalance] Applying VAT to ambassador payout",
              {
                athleteId: earning.athleteId,
                commissionAmount: payoutCalculation.commissionAmount,
                vatAmount: payoutCalculation.vatAmount,
                grossAmount: payoutCalculation.grossAmount,
              },
            );
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
              note: useStoredMetadata
                ? "ambassador_no_vat_at_invoice_time"
                : "ambassador_no_vat_or_non_fi",
            };
            console.log(
              "[creditAmbassadorBalance] No VAT for ambassador payout",
              {
                athleteId: earning.athleteId,
                reason:
                  ambVatStatus !== "valid"
                    ? "VAT status not valid"
                    : "Country not FI",
                ambVatStatus,
                ambCountry,
              },
            );
          }
        } catch (_) {}

        const grossAmountCents = Math.round(
          payoutCalculation.grossAmount * 100,
        );
        const commissionAmountCents = Math.round(
          payoutCalculation.commissionAmount * 100,
        );
        const vatAmountCents = Math.round(payoutCalculation.vatAmount * 100);

        // Get current balance before update
        const balanceBeforeCents = athleteProfile.payoutBalanceCents || 0;
        const balanceAfterCents = balanceBeforeCents + grossAmountCents;
        console.log("[creditAmbassadorBalance] apply", {
          athleteId: earning.athleteId,
          subRole,
          commissionAmountCents,
          vatAmountCents,
          grossAmountCents,
          balanceBeforeCents,
          balanceAfterCents,
          vatApplied: payoutCalculation.vatApplied,
          treatment: payoutCalculation.treatment,
        });

        // Atomically update ambassador balance using $inc for safety
        const updatePath = `${subRole}.payoutBalanceCents`;
        await User.findByIdAndUpdate(
          earning.athleteId,
          { $inc: { [updatePath]: grossAmountCents } },
          { new: true },
        );

        // Create balance credit record
        await AmbassadorBalanceCredit.create({
          ambassadorId: earning.athleteId,
          invoiceId: invoice._id,
          stripeInvoiceId: invoice.stripeInvoiceId,
          campaignId: invoice.campaignId,
          eventId: invoice.eventId,
          commissionAmountCents: commissionAmountCents,
          vatAmountCents: vatAmountCents,
          grossAmountCents: grossAmountCents,
          vatApplied: payoutCalculation.vatApplied,
          vatRate: payoutCalculation.vatRate,
          vatNumber: payoutCalculation.vatNumber,
          vatCountry: payoutCalculation.vatCountry,
          balanceBeforeCents: balanceBeforeCents,
          balanceAfterCents: balanceAfterCents,
          period: period,
          description: earning.description,
        });

        console.log(
          `💰 Credited ambassador ${earning.athleteId}: +${grossAmountCents} cents (balance: ${balanceBeforeCents} → ${balanceAfterCents})`,
        );
        creditedCount++;
      } catch (athleteError) {
        console.error(
          `Error crediting ambassador ${earning.athleteId}:`,
          athleteError.message,
        );
      }
    }

    // Mark invoice as credited
    await Invoice.findByIdAndUpdate(invoice._id, {
      ambassadorCreditedAt: new Date(),
    });

    console.log(
      `✅ Invoice ${invoice.stripeInvoiceId} credited to ${creditedCount} ambassador(s)`,
    );

    return { success: true, creditedCount };
  } catch (error) {
    console.error("Error crediting ambassador balance:", error);
    return { success: false, error: error.message };
  }
}
