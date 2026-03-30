import VisitorEvent from "@/models/VisitorEvent";
import Invoice from "@/models/Invoice";
import PostbackAudit from "@/models/PostbackAudit";
import User from "@/models/User";
import AmbassadorBalanceCredit from "@/models/AmbassadorBalanceCredit";
import Stripe from "stripe";
import { toCamelCase } from "@/lib/helper";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Process a full refund/cancellation — cancel the commission entirely
 */
export async function processFullRefund(
  purchaseEvent,
  { reason, webhookId, source = "manual" },
) {
  const updateData = {
    commissionStatus: "cancelled",
    cancelledAt: new Date(),
    cancellationReason: reason,
    refundedAt: new Date(),
    refundType: "full",
    refundAmount:
      purchaseEvent.eventData.originalSaleAmount ||
      purchaseEvent.eventData.amount ||
      0,
    originalCommissionAmount: purchaseEvent.eventData.amount,
  };

  // If already invoiced, handle the invoice
  let invoiceCancellation = null;
  if (
    purchaseEvent.invoicedAt &&
    purchaseEvent.invoicedInvoiceId &&
    !purchaseEvent.invoiceCancelledAt
  ) {
    invoiceCancellation = await cancelInvoice(purchaseEvent, reason);
  }

  // If balance was already credited, debit it back
  let balanceDebit = null;
  if (purchaseEvent.invoicedAt) {
    balanceDebit = await debitAmbassadorBalance(purchaseEvent, {
      debitAmountEuros: purchaseEvent.eventData.amount,
      source,
    });
  }

  await VisitorEvent.findByIdAndUpdate(purchaseEvent._id, updateData);
  console.log(
    `[REFUND_UTILS] Full refund applied for event ${purchaseEvent._id} via ${source}`,
  );

  return {
    action: "full_cancellation",
    message: "Commission fully cancelled",
    details: { invoiceCancellation, balanceDebit },
  };
}

/**
 * Process a partial refund — proportionally reduce the commission
 */
export async function processPartialRefund(
  purchaseEvent,
  { refundAmount, orderTotal, reason, webhookId, source = "manual" },
) {
  if (!orderTotal || orderTotal <= 0) {
    return {
      action: "skipped",
      message: "Cannot calculate partial refund: unknown order total",
    };
  }

  const reductionRatio = Math.min(refundAmount / orderTotal, 1);
  const originalCommission = purchaseEvent.eventData.amount || 0;
  const originalPlatformFee = purchaseEvent.eventData.platformFee || 0;
  const originalSale = purchaseEvent.eventData.originalSaleAmount || 0;
  const originalCartTotal = purchaseEvent.eventData.cartTotal || 0;
  const commissionReduction = originalCommission * reductionRatio;
  const platformFeeReduction = originalPlatformFee * reductionRatio;
  const saleReduction = originalSale * reductionRatio;
  const cartTotalReduction = originalCartTotal * reductionRatio;

  const newCommission = Math.max(0, originalCommission - commissionReduction);
  const newPlatformFee = Math.max(
    0,
    originalPlatformFee - platformFeeReduction,
  );
  const newSaleAmount = Math.max(0, originalSale - saleReduction);
  const newCartTotal = Math.max(0, originalCartTotal - cartTotalReduction);

  // If refund covers the entire amount, treat as full
  if (reductionRatio >= 1) {
    return processFullRefund(purchaseEvent, {
      reason: reason || "Full refund via partial refund (100%)",
      webhookId,
      source,
    });
  }

  const updateData = {
    "eventData.amount": Math.round(newCommission * 100) / 100,
    "eventData.platformFee": Math.round(newPlatformFee * 100) / 100,
    originalCommissionAmount: originalCommission,
    refundedAt: new Date(),
    refundAmount,
    refundType: "partial",
  };

  // If already invoiced, cancel old invoice
  let invoiceCancellation = null;
  if (
    purchaseEvent.invoicedAt &&
    purchaseEvent.invoicedInvoiceId &&
    !purchaseEvent.invoiceCancelledAt
  ) {
    invoiceCancellation = await cancelInvoice(
      purchaseEvent,
      `Partial refund: ${refundAmount} ${purchaseEvent.eventData.currency || "EUR"}`,
    );
    // Clear invoice markers so a new invoice can be generated
    updateData.invoicedAt = null;
    updateData.invoicedInvoiceId = null;
    updateData.invoiceCancelledAt = null;
  }

  // If balance was already credited, debit the reduced portion
  let balanceDebit = null;
  if (purchaseEvent.invoicedAt) {
    balanceDebit = await debitAmbassadorBalance(purchaseEvent, {
      debitAmountEuros: commissionReduction,
      source,
    });
  }

  await VisitorEvent.findByIdAndUpdate(purchaseEvent._id, { $set: updateData });
  console.log(
    `[REFUND_UTILS] Partial refund applied for event ${purchaseEvent._id}: ` +
      `commission ${originalCommission.toFixed(2)} → ${newCommission.toFixed(2)} (${(reductionRatio * 100).toFixed(1)}% reduction)`,
  );

  return {
    action: "partial_reduction",
    message: `Commission reduced by ${(reductionRatio * 100).toFixed(1)}%`,
    details: {
      reductionRatio,
      originalCommission,
      newCommission,
      commissionReduction,
      invoiceCancellation,
      balanceDebit,
    },
  };
}

/**
 * Cancel a Stripe invoice for a visitor event
 */
export async function cancelInvoice(purchaseEvent, reason) {
  try {
    const stripeInvoiceId = purchaseEvent.invoicedInvoiceId;
    const stripeInvoice = await stripe.invoices.retrieve(stripeInvoiceId);
    let result = null;

    if (stripeInvoice.status === "draft") {
      await stripe.invoices.del(stripeInvoiceId);
      result = { action: "deleted", stripeInvoiceId };
    } else if (stripeInvoice.status === "open") {
      await stripe.invoices.voidInvoice(stripeInvoiceId);
      result = { action: "voided", stripeInvoiceId };
    } else if (stripeInvoice.status === "paid") {
      const creditNote = await stripe.creditNotes.create({
        invoice: stripeInvoiceId,
        reason: "product_unsatisfactory",
        memo: reason,
        refund_amount: stripeInvoice.amount_paid,
      });
      result = {
        action: "credit_note",
        stripeInvoiceId,
        creditNoteId: creditNote.id,
        refundAmount: creditNote.amount / 100,
      };
    } else {
      result = {
        action: "skipped",
        reason: `Invoice status: ${stripeInvoice.status}`,
      };
    }

    // Update local Invoice record
    if (result.action !== "skipped") {
      await Invoice.findOneAndUpdate(
        { eventId: purchaseEvent._id },
        {
          status: result.action === "deleted" ? "void" : "credited",
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
      );

      // Update event with invoice cancellation markers
      await VisitorEvent.findByIdAndUpdate(purchaseEvent._id, {
        invoiceCancelledAt: new Date(),
        invoiceCancellationReason: reason,
      });
    }

    console.log(
      `[REFUND_UTILS] Invoice ${stripeInvoiceId} handled: ${result.action}`,
    );
    return result;
  } catch (error) {
    console.error(`[REFUND_UTILS] Invoice cancellation error:`, error.message);
    return { action: "error", error: error.message };
  }
}

/**
 * Debit ambassador balance if commission was already credited
 */
export async function debitAmbassadorBalance(
  purchaseEvent,
  { debitAmountEuros, source },
) {
  try {
    if (!debitAmountEuros || debitAmountEuros <= 0) return null;

    const ambassador = await User.findById(purchaseEvent.athleteId);
    if (!ambassador) return null;

    const subRole = toCamelCase(ambassador.subRole || "") || "athlete";
    const profile = ambassador[subRole];
    if (!profile) return null;

    // Check if a credit exists for this event
    const existingCredit = await AmbassadorBalanceCredit.findOne({
      eventId: purchaseEvent._id,
    });

    if (!existingCredit) {
      console.log(
        `[REFUND_UTILS] No balance credit found for event ${purchaseEvent._id}, skip debit`,
      );
      return null;
    }

    const debitAmountCents = Math.round(debitAmountEuros * 100);
    const currentBalance = profile.payoutBalanceCents || 0;
    const updatePath = `${subRole}.payoutBalanceCents`;

    // Don't go below zero
    const actualDebit = Math.min(debitAmountCents, currentBalance);

    if (actualDebit > 0) {
      await User.findByIdAndUpdate(ambassador._id, {
        $inc: { [updatePath]: -actualDebit },
      });

      // Record the debit
      await AmbassadorBalanceCredit.create({
        ambassadorId: ambassador._id,
        invoiceId: existingCredit.invoiceId,
        stripeInvoiceId: existingCredit.stripeInvoiceId,
        campaignId: purchaseEvent.campaignId,
        eventId: purchaseEvent._id,
        commissionAmountCents: -actualDebit,
        vatAmountCents: 0,
        grossAmountCents: -actualDebit,
        vatApplied: false,
        vatRate: 0,
        balanceBeforeCents: currentBalance,
        balanceAfterCents: currentBalance - actualDebit,
        description: `Commission reversal - ${source} for order ${purchaseEvent.shopifyOrderId || purchaseEvent.eventData?.transactionId || purchaseEvent._id}`,
        note: "refund_debit",
      });

      console.log(
        `[REFUND_UTILS] Debited ${actualDebit} cents from ${ambassador.email} ` +
          `(${currentBalance} → ${currentBalance - actualDebit})`,
      );
    }

    return { debitedCents: actualDebit, previousBalance: currentBalance };
  } catch (error) {
    console.error(`[REFUND_UTILS] Balance debit error:`, error.message);
    return { error: error.message };
  }
}

/**
 * Create PostbackAudit record for refund tracking
 */
export async function createAudit(
  campaignId,
  ambassadorId,
  requestData,
  responseStatus,
  responseMessage,
) {
  try {
    if (!campaignId) return; // Skip if no campaign context
    await PostbackAudit.create({
      campaignId,
      ambassadorId,
      visitorId:
        requestData.orderId ||
        requestData.shopifyOrderId ||
        requestData.transactionId ||
        "refund",
      requestData,
      responseStatus,
      responseMessage,
    });
  } catch (e) {
    console.warn("[REFUND_UTILS] Audit creation failed:", e?.message);
  }
}
