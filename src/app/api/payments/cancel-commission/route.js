import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import Invoice from "@/models/Invoice";
import User from "@/models/User";
import VisitorEvent from "@/models/VisitorEvent";

// POST /api/payments/cancel-commission
// Body: { brandId, recordId }
// recordId format: `${invoiceId}:${athleteId}` as sent from UI
export async function POST(request) {
  await connectDB();
  try {
    const body = await request.json();
    const { brandId, recordId, reason } = body || {};

    if (!brandId || !recordId) {
      return NextResponse.json(
        { error: "Missing brandId or recordId" },
        { status: 400 },
      );
    }

    const brand = await User.findById(brandId).lean();
    if (!brand || brand.role !== "brand") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [invoiceId, athleteId] = String(recordId).split(":");
    if (!invoiceId || !athleteId) {
      return NextResponse.json({ error: "Invalid recordId" }, { status: 400 });
    }

    const invoice = await Invoice.findOne({ _id: invoiceId, brandId }).exec();
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (invoice.status === "paid") {
      return NextResponse.json(
        { error: "Invoice already paid; cannot cancel here" },
        { status: 400 },
      );
    }

    const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    // Sum all athlete-specific items (in cents)
    let athleteCents = 0;
    for (const li of items) {
      const meta =
        li?.metadata instanceof Map
          ? Object.fromEntries(li.metadata)
          : li?.metadata || {};
      if (String(meta.athleteId || "") === String(athleteId)) {
        athleteCents += Number(li.amount || 0);
      }
    }

    if (athleteCents <= 0) {
      return NextResponse.json(
        { error: "No positive commission found for this athlete line" },
        { status: 400 },
      );
    }

    // Append a negative adjustment line item
    const adjustment = {
      description:
        `Cancellation of commission for athlete ${athleteId}` +
        (reason ? `: ${reason}` : ""),
      amount: -Math.abs(athleteCents),
      metadata: { athleteId: String(athleteId), cancelled: "true" },
    };
    invoice.lineItems = [...items, adjustment];

    // Update invoice total amount (stored in cents per model)
    invoice.amount = Number(invoice.amount || 0) - Math.abs(athleteCents);
    await invoice.save();

    // Update associated VisitorEvents to mark them as cancelled
    // This allows them to show as "Cancelled" in Ambassador and Brand history
    await VisitorEvent.updateMany(
      {
        brandId: brand._id,
        campaignId: invoice.campaignId,
        athleteId: new mongoose.Types.ObjectId(athleteId),
        $or: [
          { invoicedInvoiceId: invoice.stripeInvoiceId },
          { invoicedInvoiceId: { $regex: invoiceId } },
          { invoicedInvoiceId: invoiceId },
        ],
      },
      { $set: { commissionStatus: "cancelled" } },
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("/api/payments/cancel-commission error", e);
    return NextResponse.json(
      { error: e.message || "Server error" },
      { status: 500 },
    );
  }
}
