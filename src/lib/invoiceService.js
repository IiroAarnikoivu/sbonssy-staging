import VisitorEvent from "@/models/VisitorEvent";
import Invoice from "@/models/Invoice";

/**
 * Service class for handling invoice-related operations
 */
export class InvoiceService {
  /**
   * Handle refund processing - automatically cancel invoices for refunded purchases
   */
  static async handleRefundEvent(refundEventId) {
    try {
      const refundEvent = await VisitorEvent.findById(refundEventId)
        .populate("campaignId")
        .populate("athleteId")
        .populate("brandId");

      if (!refundEvent || refundEvent.eventData.eventName !== "refund") {
        throw new Error("Invalid refund event");
      }

      // Find the original purchase event
      const originalPurchaseEvent = await VisitorEvent.findOne({
        "eventData.transactionId": refundEvent.eventData.transactionId,
        "eventData.eventName": "purchase",
        campaignId: refundEvent.campaignId._id,
        athleteId: refundEvent.athleteId._id,
      });

      if (!originalPurchaseEvent) {
        console.warn(`No original purchase found for refund ${refundEventId}`);
        return null;
      }

      // Check if original purchase was invoiced
      if (
        !originalPurchaseEvent.invoicedAt ||
        !originalPurchaseEvent.invoicedInvoiceId
      ) {
        return null;
      }

      // Cancel the original invoice
      const response = await fetch(
        `${
          process.env.NEXTAUTH_URL || "http://localhost:3000"
        }/api/payments/cancel-event-invoice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId: originalPurchaseEvent._id.toString(),
            reason: "Product returned - refund processed",
          }),
        }
      );

      if (response.ok) {
        const cancellationResult = await response.json();

        return cancellationResult;
      } else {
        const errorData = await response.json();
        console.error(
          `Failed to cancel invoice for refunded purchase: ${errorData.message}`
        );
        throw new Error(errorData.message);
      }
    } catch (error) {
      console.error("Error handling refund event:", error);
      throw error;
    }
  }

  /**
   * Get invoice status for a visitor event
   */
  static async getInvoiceStatus(eventId) {
    try {
      const visitorEvent = await VisitorEvent.findById(eventId);
      if (!visitorEvent) {
        throw new Error("Visitor event not found");
      }

      const invoice = await Invoice.findOne({ eventId });

      return {
        eventId,
        isInvoiced: !!visitorEvent.invoicedAt,
        invoicedAt: visitorEvent.invoicedAt,
        stripeInvoiceId: visitorEvent.invoicedInvoiceId,
        isCancelled: !!visitorEvent.invoiceCancelledAt,
        cancelledAt: visitorEvent.invoiceCancelledAt,
        cancellationReason: visitorEvent.invoiceCancellationReason,
        localInvoice: invoice,
      };
    } catch (error) {
      console.error("Error getting invoice status:", error);
      throw error;
    }
  }

  /**
   * Validate if an event should be invoiced
   */
  static shouldInvoiceEvent(visitorEvent) {
    // Skip if already invoiced
    if (visitorEvent.invoicedAt) {
      return false;
    }

    // Skip if event was cancelled (e.g., refund voided purchase before invoicing)
    if (visitorEvent.cancelledAt) {
      return false;
    }

    // Skip zero-amount events
    const amount = Math.abs(visitorEvent.eventData.amount || 0);
    const platformFee = Math.abs(visitorEvent.eventData.platformFee || 0);

    if (amount === 0 && platformFee === 0) {
      return false;
    }

    // Skip refund events (they should cancel original invoices instead)
    if (visitorEvent.eventData.eventName === "refund") {
      return false;
    }

    return true;
  }

  /**
   * Get uninvoiced events that should be invoiced
   */
  static async getUninvoicedEvents(filters = {}) {
    const query = {
      invoicedAt: { $exists: false },
      cancelledAt: { $exists: false },
      $or: [
        { "eventData.amount": { $gt: 0 } },
        { "eventData.platformFee": { $gt: 0 } },
        { "eventData.amount": { $lt: 0 } }, // Include negative amounts for refunds
        { "eventData.platformFee": { $lt: 0 } },
      ],
    };

    // Apply filters
    if (filters.campaignId) query.campaignId = filters.campaignId;
    if (filters.brandId) query.brandId = filters.brandId;
    if (filters.athleteId) query.athleteId = filters.athleteId;
    if (filters.eventType) query.eventType = filters.eventType;
    if (filters.eventName) query["eventData.eventName"] = filters.eventName;

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    // Exclude refund events from auto-invoicing
    query["eventData.eventName"] = { $ne: "refund" };

    const events = await VisitorEvent.find(query)
      .populate("campaignId", "name trackingId compensation")
      .populate("athleteId", "firstName lastName email")
      .populate("brandId", "firstName lastName email businessName")
      .sort({ createdAt: 1 })
      .limit(filters.limit || 100);

    return events.filter((event) => this.shouldInvoiceEvent(event));
  }

  /**
   * Generate summary statistics for invoicing
   */
  static async getInvoicingSummary(filters = {}) {
    const uninvoicedEvents = await this.getUninvoicedEvents(filters);

    const summary = {
      totalUninvoiced: uninvoicedEvents.length,
      totalAmount: 0,
      totalPlatformFee: 0,
      byEventType: {},
      byCompensationType: {},
      byCampaign: {},
    };

    uninvoicedEvents.forEach((event) => {
      const amount = event.eventData.amount || 0;
      const platformFee = event.eventData.platformFee || 0;

      summary.totalAmount += amount;
      summary.totalPlatformFee += platformFee;

      // Group by event type
      const eventType = event.eventData.eventName;
      if (!summary.byEventType[eventType]) {
        summary.byEventType[eventType] = {
          count: 0,
          amount: 0,
          platformFee: 0,
        };
      }
      summary.byEventType[eventType].count++;
      summary.byEventType[eventType].amount += amount;
      summary.byEventType[eventType].platformFee += platformFee;

      // Group by compensation type
      const compensationType = event.campaignId?.compensation?.type;
      if (compensationType) {
        if (!summary.byCompensationType[compensationType]) {
          summary.byCompensationType[compensationType] = {
            count: 0,
            amount: 0,
            platformFee: 0,
          };
        }
        summary.byCompensationType[compensationType].count++;
        summary.byCompensationType[compensationType].amount += amount;
        summary.byCompensationType[compensationType].platformFee += platformFee;
      }

      // Group by campaign
      const campaignName = event.campaignId?.name || "Unknown";
      if (!summary.byCampaign[campaignName]) {
        summary.byCampaign[campaignName] = {
          count: 0,
          amount: 0,
          platformFee: 0,
        };
      }
      summary.byCampaign[campaignName].count++;
      summary.byCampaign[campaignName].amount += amount;
      summary.byCampaign[campaignName].platformFee += platformFee;
    });

    return summary;
  }
}
