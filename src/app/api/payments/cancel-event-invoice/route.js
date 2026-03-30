import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VisitorEvent from "@/models/VisitorEvent";
import Invoice from "@/models/Invoice";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    await connectDB();
    const { eventId, reason = "Product returned" } = await req.json();

    if (!eventId) {
      return NextResponse.json(
        { message: "Event ID is required" },
        { status: 400 }
      );
    }

    // Find the visitor event
    const visitorEvent = await VisitorEvent.findById(eventId);
    if (!visitorEvent) {
      return NextResponse.json(
        { message: "Visitor event not found" },
        { status: 404 }
      );
    }

    // Check if event is invoiced
    if (!visitorEvent.invoicedAt || !visitorEvent.invoicedInvoiceId) {
      return NextResponse.json(
        { message: "Event is not invoiced, cannot cancel invoice" },
        { status: 400 }
      );
    }

    // Find the local invoice
    const localInvoice = await Invoice.findOne({ eventId });
    if (!localInvoice) {
      return NextResponse.json(
        { message: "Local invoice record not found" },
        { status: 404 }
      );
    }

    // Get Stripe invoice
    const stripeInvoice = await stripe.invoices.retrieve(visitorEvent.invoicedInvoiceId);
    
    let cancellationResult = null;

    // Handle different invoice statuses
    if (stripeInvoice.status === 'draft') {
      // Delete draft invoice
      await stripe.invoices.del(stripeInvoice.id);
      cancellationResult = { action: 'deleted', status: 'deleted' };
    } else if (stripeInvoice.status === 'open') {
      // Void open invoice
      const voidedInvoice = await stripe.invoices.voidInvoice(stripeInvoice.id);
      cancellationResult = { action: 'voided', status: voidedInvoice.status };
    } else if (stripeInvoice.status === 'paid') {
      // Create credit note for paid invoice
      const creditNote = await stripe.creditNotes.create({
        invoice: stripeInvoice.id,
        reason: 'product_unsatisfactory',
        memo: reason,
        refund_amount: stripeInvoice.amount_paid,
      });
      cancellationResult = { 
        action: 'credit_note_created', 
        status: 'credited',
        creditNoteId: creditNote.id,
        refundAmount: creditNote.amount / 100 // Convert from cents
      };
    } else {
      return NextResponse.json(
        { message: `Cannot cancel invoice with status: ${stripeInvoice.status}` },
        { status: 400 }
      );
    }

    // Update local invoice status
    await Invoice.findByIdAndUpdate(localInvoice._id, {
      status: cancellationResult.status === 'deleted' ? 'void' : cancellationResult.status,
      cancelledAt: new Date(),
      cancellationReason: reason,
    });

    // Update visitor event
    await VisitorEvent.findByIdAndUpdate(eventId, {
      invoiceCancelledAt: new Date(),
      invoiceCancellationReason: reason,
    });

    return NextResponse.json({
      message: "Invoice cancelled successfully",
      cancellation: {
        eventId,
        action: cancellationResult.action,
        status: cancellationResult.status,
        reason,
        timestamp: new Date().toISOString(),
        ...(cancellationResult.creditNoteId && {
          creditNoteId: cancellationResult.creditNoteId,
          refundAmount: cancellationResult.refundAmount,
        }),
      },
    });

  } catch (error) {
    console.error("Error cancelling invoice:", error);
    return NextResponse.json(
      { message: error.message || "Error cancelling invoice" },
      { status: 500 }
    );
  }
}

// GET endpoint to check if an invoice can be cancelled
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { message: "Event ID is required" },
        { status: 400 }
      );
    }

    const visitorEvent = await VisitorEvent.findById(eventId);
    if (!visitorEvent) {
      return NextResponse.json(
        { message: "Visitor event not found" },
        { status: 404 }
      );
    }

    if (!visitorEvent.invoicedAt || !visitorEvent.invoicedInvoiceId) {
      return NextResponse.json({
        canCancel: false,
        reason: "Event is not invoiced",
      });
    }

    if (visitorEvent.invoiceCancelledAt) {
      return NextResponse.json({
        canCancel: false,
        reason: "Invoice already cancelled",
        cancelledAt: visitorEvent.invoiceCancelledAt,
        cancellationReason: visitorEvent.invoiceCancellationReason,
      });
    }

    // Check Stripe invoice status
    const stripeInvoice = await stripe.invoices.retrieve(visitorEvent.invoicedInvoiceId);
    
    const cancellableStatuses = ['draft', 'open', 'paid'];
    const canCancel = cancellableStatuses.includes(stripeInvoice.status);

    return NextResponse.json({
      canCancel,
      invoiceStatus: stripeInvoice.status,
      reason: canCancel ? "Invoice can be cancelled" : `Cannot cancel invoice with status: ${stripeInvoice.status}`,
      possibleActions: {
        draft: "Delete invoice",
        open: "Void invoice", 
        paid: "Create credit note and refund",
      }[stripeInvoice.status] || "No action available",
    });

  } catch (error) {
    console.error("Error checking invoice cancellation status:", error);
    return NextResponse.json(
      { message: error.message || "Error checking cancellation status" },
      { status: 500 }
    );
  }
}
