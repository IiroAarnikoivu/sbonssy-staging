import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VisitorEvent from "@/models/VisitorEvent";
import Invoice from "@/models/Invoice";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import Stripe from "stripe";
import { calculateStripeProcessingFeeCents } from "@/lib/vat/vatCalculator";
import { calculateVATAmounts } from "@/lib/vat/viesValidator";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    await connectDB();
    const { eventId, forceRegenerate = false } = await req.json();

    if (!eventId) {
      return NextResponse.json(
        { message: "Event ID is required" },
        { status: 400 },
      );
    }

    // Find the visitor event
    const visitorEvent = await VisitorEvent.findById(eventId)
      .populate("campaignId")
      .populate("athleteId")
      .populate("brandId");

    if (!visitorEvent) {
      return NextResponse.json(
        { message: "Visitor event not found" },
        { status: 404 },
      );
    }

    // Do not invoice cancelled events
    if (visitorEvent.cancelledAt) {
      return NextResponse.json(
        { message: "Event was cancelled; no invoice will be generated" },
        { status: 400 },
      );
    }

    // Do not invoice cancelled commissions (refund/cancellation)
    if (visitorEvent.commissionStatus === "cancelled") {
      return NextResponse.json(
        { message: "Commission cancelled; no invoice will be generated" },
        { status: 400 },
      );
    }

    // Check if already invoiced (unless force regenerate)
    if (visitorEvent.invoicedAt && !forceRegenerate) {
      return NextResponse.json(
        {
          message: "Event already invoiced",
          invoiceId: visitorEvent.invoicedInvoiceId,
          invoicedAt: visitorEvent.invoicedAt,
        },
        { status: 400 },
      );
    }

    // Skip invoice generation for zero-amount events (like clicks in pay-per-sale)
    if (
      visitorEvent.eventData.amount === 0 &&
      visitorEvent.eventData.platformFee === 0
    ) {
      return NextResponse.json(
        { message: "No invoice needed for zero-amount event" },
        { status: 200 },
      );
    }

    // Get brand's Stripe customer ID
    const brand = visitorEvent.brandId;
    if (!brand.stripeCustomerId) {
      return NextResponse.json(
        { message: "Brand does not have a Stripe customer ID" },
        { status: 400 },
      );
    }

    // Calculate total amount (ambassador earnings + platform fee)
    const ambassadorAmount = Math.abs(visitorEvent.eventData.amount || 0);
    const platformFee = Math.abs(visitorEvent.eventData.platformFee || 0);
    const eventCurrency = (
      visitorEvent.eventData.currency || "EUR"
    ).toLowerCase();

    // VAT logic: Use snapshots from the event or fall back to current brand profile
    const FINNISH_VAT_RATE = 0.255;
    let vatTreatment = {
      vatTreatment: "reverse_charge",
      vatRate: 0,
      chargeVat: false,
      notes: ["[MANUAL] No VAT (non-FI or not valid)"],
    };

    try {
      const brandVatDetails = brand?.brand?.vatDetails || {};

      let brandCountry = visitorEvent.brandVatCountry; // Read raw values to check for undefined
      let brandVatStatus = visitorEvent.brandVatStatus;

      // Only fall back to profile if the fields are COMPLETELY missing (legacy events)
      // "not_provided" is a valid snapshot meaning the brand HAD no VAT at event time
      if (typeof brandVatStatus === "undefined") {
        brandCountry = (
          brandVatDetails.vatCountry ||
          brand?.brand?.country ||
          ""
        )
          .toString()
          .toUpperCase();
        brandVatStatus = (brandVatDetails.vatStatus || "not_provided")
          .toString()
          .toLowerCase();
        console.log(
          "[MANUAL INVOICE] Legacy event: Using current brand VAT status",
        );
      } else {
        brandCountry = (brandCountry || "").toString().toUpperCase();
        brandVatStatus = (brandVatStatus || "not_provided")
          .toString()
          .toLowerCase();
        console.log(
          `[MANUAL INVOICE] Using event snapshot brand VAT: ${brandVatStatus} (${brandCountry})`,
        );
      }

      if (brandVatStatus === "valid" && brandCountry === "FI") {
        vatTreatment = {
          vatTreatment: "domestic",
          vatRate: FINNISH_VAT_RATE,
          chargeVat: true,
          notes: [
            "[MANUAL] Finnish domestic supply - 25.5% VAT applied (based on status at event time)",
          ],
        };
      }
    } catch (vatErr) {
      console.error("[MANUAL INVOICE] Error checking brand VAT:", vatErr);
    }

    // Capture ambassador VAT details (snapshot-first)
    let athleteVatCountryAtInvoiceTime = visitorEvent.athleteVatCountry;
    let athleteVatStatusAtInvoiceTime = visitorEvent.athleteVatStatus;

    if (typeof athleteVatStatusAtInvoiceTime === "undefined") {
      try {
        const athlete = visitorEvent.athleteId;
        if (athlete) {
          const subRole = athlete.subRole || "athlete";
          const subRoleCamel = subRole.replace(/-([a-z])/g, (g) =>
            g[1].toUpperCase(),
          );
          const athleteProfile = athlete[subRoleCamel];
          const athleteVatDetails = athleteProfile?.vatDetails || {};
          athleteVatCountryAtInvoiceTime = (
            athleteVatDetails.vatCountry ||
            athleteVatDetails.registrationCountry ||
            athleteProfile?.vatCountry ||
            athleteProfile?.registrationCountry ||
            ""
          )
            .toString()
            .toUpperCase();
          athleteVatStatusAtInvoiceTime = (
            athleteVatDetails.vatStatus ||
            athleteProfile?.vatStatus ||
            "not_provided"
          )
            .toString()
            .toLowerCase();

          console.log(
            "[MANUAL INVOICE] Legacy event: Fetched current ambassador VAT",
          );
        }
      } catch (athleteErr) {
        console.error(
          "[MANUAL INVOICE] Error fetching current ambassador VAT:",
          athleteErr,
        );
      }
    } else {
      athleteVatCountryAtInvoiceTime = (athleteVatCountryAtInvoiceTime || "")
        .toString()
        .toUpperCase();
      athleteVatStatusAtInvoiceTime = (
        athleteVatStatusAtInvoiceTime || "not_provided"
      )
        .toString()
        .toLowerCase();
      console.log(
        `[MANUAL INVOICE] Using event snapshot ambassador VAT: ${athleteVatStatusAtInvoiceTime} (${athleteVatCountryAtInvoiceTime})`,
      );
    }

    // Calculate VAT on full invoice amount (earnings + platformFee)
    const baseAmount = ambassadorAmount + platformFee;
    const vatCalculation = calculateVATAmounts(
      baseAmount,
      vatTreatment.vatRate,
    );

    // Calculate Stripe processing fee
    const feeBaseCents = Math.round(baseAmount * 100);
    const stripeFeeCents = calculateStripeProcessingFeeCents(feeBaseCents);

    const totalAmount = baseAmount + vatCalculation.vatAmount;
    const totalCents = Math.round(totalAmount * 100) + stripeFeeCents;

    console.log("[MANUAL INVOICE] Amount calculation:", {
      ambassadorAmount,
      platformFee,
      baseAmount,
      vatAmount: vatCalculation.vatAmount,
      stripeFeeCents,
      totalAmount,
      totalCents,
      vatTreatment: vatTreatment.vatTreatment,
    });

    if (totalCents <= 0) {
      return NextResponse.json(
        { message: "No invoice needed for zero-amount event" },
        { status: 200 },
      );
    }

    // Create line items for the invoice (no longer used with invoiceItems approach)
    // Keeping for reference but will use stripe.invoiceItems.create instead

    // Create Stripe invoice
    const stripeInvoice = await stripe.invoices.create({
      customer: brand.stripeCustomerId,
      collection_method: "send_invoice",
      days_until_due: 30,
      auto_advance: true,
      currency: eventCurrency,
      metadata: {
        eventId: eventId,
        campaignId: visitorEvent.campaignId._id.toString(),
        ambassadorId: visitorEvent.athleteId._id.toString(),
        eventType: visitorEvent.eventData.eventName,
        transactionId: visitorEvent.eventData.transactionId || "",
        compensationType: visitorEvent.campaignId.compensation.type,
        visitorId: visitorEvent.visitorId,
        vatTreatment: vatTreatment.vatTreatment,
        vatRate: vatTreatment.vatRate.toString(),
        vatAmount: vatCalculation.vatAmount.toString(),
      },
      description: `Manual Invoice for ${visitorEvent.eventData.eventName} event - Campaign: ${visitorEvent.campaignId.name}`,
    });

    // Ambassador earnings line item
    if (ambassadorAmount > 0) {
      await stripe.invoiceItems.create({
        customer: brand.stripeCustomerId,
        invoice: stripeInvoice.id,
        amount: Math.round(ambassadorAmount * 100),
        currency: eventCurrency,
        description: `Ambassador Commission - ${visitorEvent.athleteId.firstName} ${visitorEvent.athleteId.lastName}`,
        metadata: {
          type: "ambassador_earnings",
          eventId: eventId,
          athleteId: visitorEvent.athleteId._id.toString(),
          athleteVatCountry: athleteVatCountryAtInvoiceTime,
          athleteVatStatus: athleteVatStatusAtInvoiceTime,
        },
      });
    }

    // Platform fee line item
    if (platformFee > 0) {
      await stripe.invoiceItems.create({
        customer: brand.stripeCustomerId,
        invoice: stripeInvoice.id,
        amount: Math.round(platformFee * 100),
        currency: eventCurrency,
        description: "Platform Service Fee",
        metadata: {
          type: "platform_fee",
          eventId: eventId,
        },
      });
    }

    // VAT line item (when brand has valid FI VAT)
    if (vatCalculation.vatAmount > 0) {
      await stripe.invoiceItems.create({
        customer: brand.stripeCustomerId,
        invoice: stripeInvoice.id,
        amount: Math.round(vatCalculation.vatAmount * 100),
        currency: eventCurrency,
        description: `VAT ${(vatTreatment.vatRate * 100).toFixed(1)}% (${vatTreatment.vatTreatment})`,
        metadata: {
          type: "vat",
          eventId: eventId,
          vatRate: vatTreatment.vatRate.toString(),
          vatTreatment: vatTreatment.vatTreatment,
        },
      });
    }

    // Stripe processing fee line item
    if (stripeFeeCents > 0) {
      await stripe.invoiceItems.create({
        customer: brand.stripeCustomerId,
        invoice: stripeInvoice.id,
        amount: stripeFeeCents,
        currency: eventCurrency,
        description: "Payment processing fee (Stripe)",
        metadata: {
          type: "stripe_processing_fee",
          eventId: eventId,
          vatIncluded: "false",
          vatRate: "0",
        },
      });
    }

    // Finalize the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(
      stripeInvoice.id,
    );

    // Create local invoice record with VAT information
    const localInvoice = await Invoice.create({
      brandId: brand._id,
      campaignId: visitorEvent.campaignId._id.toString(),
      eventId: visitorEvent._id,
      stripeInvoiceId: finalizedInvoice.id,
      amount: totalCents,
      currency: eventCurrency,
      periodStart: new Date(visitorEvent.createdAt),
      periodEnd: new Date(visitorEvent.createdAt),
      status: finalizedInvoice.status,
      // VAT information
      subtotal: Math.round(baseAmount * 100),
      vatAmount: Math.round(vatCalculation.vatAmount * 100),
      vatRate: vatTreatment.vatRate,
      vatTreatment: vatTreatment.vatTreatment,
      total: totalCents,
      baseAmount: Math.round(baseAmount * 100),
      brandCountry: (
        brand?.brand?.vatDetails?.vatCountry ||
        brand?.brand?.country ||
        ""
      )
        .toString()
        .toUpperCase(),
      brandVatStatus: (brand?.brand?.vatDetails?.vatStatus || "not_provided")
        .toString()
        .toLowerCase(),
      notes: vatTreatment.notes || [],
      lineItems: [
        {
          description: `${visitorEvent.eventData.eventName} commission for ${visitorEvent.athleteId.firstName} ${visitorEvent.athleteId.lastName}`,
          amount: Math.round(ambassadorAmount * 100),
          metadata: {
            type: "ambassador_earnings",
            eventId: eventId,
            athleteId: visitorEvent.athleteId._id.toString(),
            athleteVatCountry: athleteVatCountryAtInvoiceTime,
            athleteVatStatus: athleteVatStatusAtInvoiceTime,
          },
        },
        ...(platformFee > 0
          ? [
              {
                description: "Platform service fee",
                amount: Math.round(platformFee * 100),
                metadata: {
                  type: "platform_fee",
                  eventId: eventId,
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
                  eventId: eventId,
                  vatRate: vatTreatment.vatRate.toString(),
                  vatTreatment: vatTreatment.vatTreatment,
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
                  eventId: eventId,
                  vatIncluded: "false",
                  vatRate: "0",
                },
              },
            ]
          : []),
      ],
      metrics: {
        clicks:
          visitorEvent.eventType === "click" ||
          (visitorEvent.eventType === "conversion" &&
            visitorEvent.eventData.eventName === "click")
            ? 1
            : 0,
        conversions: visitorEvent.eventType === "conversion" ? 1 : 0,
      },
    });

    console.log("[MANUAL INVOICE] Invoice created:", {
      invoiceId: localInvoice._id,
      stripeInvoiceId: finalizedInvoice.id,
      totalCents,
      vatAmount: vatCalculation.vatAmount,
      vatTreatment: vatTreatment.vatTreatment,
    });

    // Update visitor event with invoice information
    await VisitorEvent.findByIdAndUpdate(eventId, {
      invoicedAt: new Date(),
      invoicedInvoiceId: finalizedInvoice.id,
      commissionStatus: "invoiced", // Progress from 'pending'
    });

    return NextResponse.json({
      message: "Invoice generated successfully",
      invoice: {
        id: localInvoice._id,
        stripeInvoiceId: finalizedInvoice.id,
        amount: totalCents,
        currency: eventCurrency,
        status: finalizedInvoice.status,
        invoiceUrl: finalizedInvoice.hosted_invoice_url,
        pdfUrl: finalizedInvoice.invoice_pdf,
        vatAmount: vatCalculation.vatAmount,
        vatTreatment: vatTreatment.vatTreatment,
      },
      event: {
        id: visitorEvent._id,
        eventType: visitorEvent.eventData.eventName,
        ambassadorAmount,
        platformFee,
        totalAmount,
        vatAmount: vatCalculation.vatAmount,
      },
    });
  } catch (error) {
    console.error("Error generating event invoice:", error);
    return NextResponse.json(
      { message: error.message || "Error generating invoice" },
      { status: 500 },
    );
  }
}

// GET endpoint to check invoice status for an event
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { message: "Event ID is required" },
        { status: 400 },
      );
    }

    const visitorEvent = await VisitorEvent.findById(eventId);
    if (!visitorEvent) {
      return NextResponse.json(
        { message: "Visitor event not found" },
        { status: 404 },
      );
    }

    const invoice = await Invoice.findOne({ eventId });

    return NextResponse.json({
      eventId,
      isInvoiced: !!visitorEvent.invoicedAt,
      invoicedAt: visitorEvent.invoicedAt,
      stripeInvoiceId: visitorEvent.invoicedInvoiceId,
      localInvoice: invoice,
    });
  } catch (error) {
    console.error("Error checking invoice status:", error);
    return NextResponse.json(
      { message: error.message || "Error checking invoice status" },
      { status: 500 },
    );
  }
}
