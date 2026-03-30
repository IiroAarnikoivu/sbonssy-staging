import { connectDB } from "@/lib/db";
import stripe from "@/lib/stripe";
import Invoice from "@/models/Invoice";
import User from "@/models/User";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/sendEmail";
import Campaign from "@/models/Campaign";
import VisitorEvent from "@/models/VisitorEvent";
import {
  calculateBrandInvoice,
  generateInvoiceLineItems,
  FINNISH_VAT_RATE,
  calculateStripeProcessingFeeCents,
} from "@/lib/vat/vatCalculator";
import {
  getBrandInvoiceVATTreatment,
  calculateVATAmounts,
  getAmbassadorVATRules,
} from "@/lib/vat/viesValidator";

// Helper function to generate invoice for a conversion event
async function generateConversionInvoice(visitorEventId) {
  try {
    const response = await fetch(
      `${
        process.env.NEXTAUTH_URL || "http://localhost:3000"
      }/api/payments/invoice`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visitorEventId: visitorEventId,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Invoice generation failed:", errorData);
      return { success: false, error: errorData.error || "Unknown error" };
    }

    const result = await response.json();

    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function POST(request) {
  await connectDB();
  const {
    brandId,
    campaignId,
    periodStart,
    periodEnd,
    metrics,
    currency,
    lineItems,
    totalAmount,
    visitorEventId,
    perEvent = true,
    eventIds,
  } = await request.json();

  try {
    // New: per-event generation for a date range/campaign
    // If perEvent is true, generate one invoice per matching event by
    // reusing the per-event branch via generateConversionInvoice()
    if (!visitorEventId && perEvent) {
      // If explicit eventIds are provided, invoice exactly those events
      if (Array.isArray(eventIds) && eventIds.length > 0) {
        const results = [];
        for (const id of eventIds) {
          const r = await generateConversionInvoice(id);
          results.push({ eventId: id, ...r });
        }
        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.length - successCount;
        return NextResponse.json({
          data: {
            success: true,
            mode: "per_event",
            count: results.length,
            successes: successCount,
            failures: failureCount,
            results,
          },
        });
      }

      // Otherwise, require date range + identifiers and invoice all matches in the period
      if (!brandId || !campaignId || !periodStart || !periodEnd) {
        return NextResponse.json(
          {
            error:
              "perEvent mode requires brandId, campaignId, periodStart, and periodEnd (or provide eventIds)",
          },
          { status: 400 },
        );
      }

      const start = new Date(periodStart);
      const end = new Date(periodEnd);

      const events = await VisitorEvent.find({
        brandId,
        campaignId,
        eventType: "conversion",
        cancelledAt: { $exists: false },
        "eventData.eventName": { $ne: "refund" },
        createdAt: { $gte: start, $lte: end },
        $or: [
          { invoicedAt: { $exists: false } },
          { invoicedAt: null },
          { invoicedInvoiceId: { $exists: false } },
          { invoicedInvoiceId: null },
        ],
      })
        .select("_id createdAt eventData")
        .lean();

      if (!events.length) {
        return NextResponse.json({
          data: { success: true, mode: "per_event", count: 0, results: [] },
        });
      }

      const results = [];
      for (const ev of events) {
        const r = await generateConversionInvoice(ev._id);
        results.push({ eventId: ev._id, ...r });
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.length - successCount;

      return NextResponse.json({
        data: {
          success: true,
          mode: "per_event",
          count: results.length,
          successes: successCount,
          failures: failureCount,
          results,
        },
      });
    }

    // Per-event invoicing branch
    if (visitorEventId) {
      const event = await VisitorEvent.findById(visitorEventId).lean();
      if (!event) {
        return NextResponse.json(
          { error: "VisitorEvent not found" },
          { status: 404 },
        );
      }

      // Prevent duplicate invoicing
      if (event.invoicedAt || event.invoicedInvoiceId) {
        return NextResponse.json(
          { error: "This event has already been invoiced" },
          { status: 409 },
        );
      }

      // Load brand user
      const user = await User.findById(event.brandId);
      if (!user) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }
      if (user.role !== "brand") {
        return NextResponse.json(
          { error: "Only brand users can create invoices" },
          { status: 403 },
        );
      }

      // VAT logic: Snapshot-first approach
      const brandVatDetails = user?.brand?.vatDetails || {};

      let brandCountry = event.brandVatCountry; // Read raw to check for undefined
      let brandVatStatus = event.brandVatStatus;

      if (typeof brandVatStatus === "undefined") {
        brandCountry = (
          brandVatDetails.vatCountry ||
          user?.brand?.country ||
          ""
        )
          .toString()
          .toUpperCase();
        brandVatStatus = (brandVatDetails.vatStatus || "not_provided")
          .toString()
          .toLowerCase();
        console.log(
          "[API INVOICE] Legacy event: Using current brand VAT status",
        );
      } else {
        brandCountry = (brandCountry || "").toString().toUpperCase();
        brandVatStatus = (brandVatStatus || "not_provided")
          .toString()
          .toLowerCase();
        console.log(
          `[API INVOICE] Using event snapshot brand VAT: ${brandVatStatus} (${brandCountry})`,
        );
      }

      // Centralized VAT treatment: includes EU without valid VAT -> 25.5% VAT
      const vatTreatment = getBrandInvoiceVATTreatment(
        brandCountry,
        brandVatStatus,
        "FI",
      );

      // Fetch ambassador VAT details (snapshot-first)
      let athleteVatCountryAtInvoiceTime = event.athleteVatCountry;
      let athleteVatStatusAtInvoiceTime = event.athleteVatStatus;

      if (typeof athleteVatStatusAtInvoiceTime === "undefined") {
        try {
          const athlete = await User.findById(event.athleteId);
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
              "[API INVOICE] Legacy event: Fetched current ambassador VAT",
            );
          }
        } catch (athleteErr) {
          console.error(
            "[API INVOICE] Error fetching ambassador current VAT:",
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
          `[API INVOICE] Using event snapshot ambassador VAT: ${athleteVatStatusAtInvoiceTime} (${athleteVatCountryAtInvoiceTime})`,
        );
      }

      // Ensure Stripe customer exists
      if (!user.brand?.stripeCustomerId) {
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
      }

      // Verify default payment method
      const customer = await stripe.customers.retrieve(
        user.brand.stripeCustomerId,
      );
      if (!customer.invoice_settings.default_payment_method) {
        return NextResponse.json(
          { error: "No default payment method found. Please add a card." },
          { status: 400 },
        );
      }

      // Build line items and totals
      const earnings = Number(event.eventData?.amount || 0);
      const platformFee = Number(event.eventData?.platformFee || 0);
      const initialSubtotal = earnings + platformFee;
      const eventCurrency = (event.eventData?.currency || "EUR").toLowerCase();

      if (!Number.isFinite(initialSubtotal) || initialSubtotal <= 0) {
        return NextResponse.json(
          { error: "Event has no billable amount" },
          { status: 400 },
        );
      }

      const earningsCents = Math.round(earnings * 100);
      const platformFeeCents = Math.round(platformFee * 100);
      // Stripe processing fee is calculated on subtotal BEFORE fee (earnings + platformFee)
      const feeBaseCents = earningsCents + platformFeeCents;
      const stripeFeeCents = calculateStripeProcessingFeeCents(feeBaseCents);
      const stripeFeeAdjustedCents = stripeFeeCents;

      const vatBaseCents =
        earningsCents + platformFeeCents + stripeFeeAdjustedCents;
      const vatAmountCents = vatTreatment.chargeVat
        ? Math.round(vatBaseCents * vatTreatment.vatRate)
        : 0;
      const subtotalBeforeVatCents = vatBaseCents; // commission + platform fee + stripe fee
      const totalCents = subtotalBeforeVatCents + vatAmountCents;

      const periodStartIso = new Date(event.createdAt).toISOString();
      const periodEndIso = new Date(event.createdAt).toISOString();

      const vatNotesText = (vatTreatment.notes || [])
        .filter(Boolean)
        .join(" | ");

      // Create Stripe invoice with VAT-aware amounts and metadata (consistent with cron)
      const invoice = await stripe.invoices.create({
        customer: user.brand.stripeCustomerId,
        collection_method: "charge_automatically",
        auto_advance: true,
        currency: eventCurrency,
        description: `Manual Invoice for Event ${event._id} - ${new Date(
          event.createdAt,
        ).toISOString()}`,
        footer: vatNotesText,
        metadata: {
          campaignId: event.campaignId.toString(),
          periodStart: periodStartIso,
          periodEnd: periodEndIso,
          metrics: JSON.stringify({
            clicks: event.eventType === "click" ? 1 : 0,
            conversions: event.eventType === "conversion" ? 1 : 0,
          }),
          eventId: event._id.toString(),
          // VAT metadata (cron-aligned)
          vatTreatment: vatTreatment.vatTreatment,
          vatRate: vatTreatment.vatRate.toString(),
          vatAmount: (vatAmountCents / 100).toString(),
          baseAmount: (vatBaseCents / 100).toString(),
          // Retain for metadata shape; not used for VAT decision now
          brandCountry: user.brand?.country || user.brand?.vatCountry || "",
          brandVatStatus: (user.brand?.vatStatus || "not_provided")
            .toString()
            .toLowerCase(),
        },
      });

      // Create individual line items like cron does

      // Ambassador earnings line item
      if (earnings > 0) {
        await stripe.invoiceItems.create({
          customer: user.brand.stripeCustomerId,
          invoice: invoice.id,
          amount: earningsCents,
          currency: eventCurrency,
          description: `Ambassador earnings (${
            event.eventData?.eventName || "conversion"
          })`,
          metadata: {
            type: "ambassador_earnings",
            eventId: event._id.toString(),
            athleteId: event.athleteId.toString(),
            athleteVatCountry: athleteVatCountryAtInvoiceTime,
            athleteVatStatus: athleteVatStatusAtInvoiceTime,
          },
        });
      }

      // Platform fee line item (if VAT applies, this includes VAT on platform fee)
      if (platformFee > 0) {
        await stripe.invoiceItems.create({
          customer: user.brand.stripeCustomerId,
          invoice: invoice.id,
          amount: platformFeeCents,
          currency: eventCurrency,
          description: "Platform fee",
          metadata: {
            type: "platform_fee",
            eventId: event._id.toString(),
          },
        });
      }

      // VAT line item (charge VAT to brand when VAT is connected)
      if (vatAmountCents > 0) {
        await stripe.invoiceItems.create({
          customer: user.brand.stripeCustomerId,
          invoice: invoice.id,
          amount: vatAmountCents,
          currency: eventCurrency,
          description: `VAT ${(vatTreatment.vatRate * 100).toFixed(1)}% (${vatTreatment.vatTreatment})`,
          metadata: {
            type: "vat",
            vatTreatment: vatTreatment.vatTreatment,
            vatRate: vatTreatment.vatRate.toString(),
            eventId: event._id.toString(),
            baseAmount: (vatBaseCents / 100).toString(),
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

      const invoiceMetrics = {
        clicks: event.eventType === "click" ? 1 : 0,
        conversions: event.eventType === "conversion" ? 1 : 0,
      };
      // Persist VAT-aware invoice (cron-aligned)
      const savedInvoice = await Invoice.create({
        brandId: user._id,
        campaignId: event.campaignId.toString(),
        eventId: event._id,
        stripeInvoiceId: invoice.id,
        invoiceNumber: `INV-${Date.now()}`,
        // VAT-aware amounts (VAT on ambassador earnings only)
        subtotal: subtotalBeforeVatCents, // earnings + platform fee + stripe fee
        vatAmount: vatAmountCents,
        vatRate: vatTreatment.vatRate,
        vatTreatment: vatTreatment.vatTreatment,
        total: totalCents,
        baseAmount: vatBaseCents,
        // Retain for metadata shape; not used for VAT decision now
        ourVatNumber: process.env.COMPANY_VAT_NUMBER || "FI12345678",
        clientVatNumber:
          vatTreatment.vatTreatment === "reverse_charge"
            ? user.brand?.vatNumber || null
            : null,
        brandCountry: (user.brand?.country || user.brand?.vatCountry || "")
          .toString()
          .toUpperCase(),
        brandVatStatus: (user.brand?.vatStatus || "not_provided")
          .toString()
          .toLowerCase(),
        notes: vatTreatment.notes || [],

        // Legacy fields for backward compatibility
        amount: totalCents,
        currency: eventCurrency,
        periodStart: new Date(periodStartIso),
        periodEnd: new Date(periodEndIso),
        status: finalizedInvoice.status,
        lineItems: [
          // Ambassador earnings line item
          ...(earnings > 0
            ? [
                {
                  description: `Ambassador earnings (${
                    event.eventData?.eventName || "conversion"
                  })`,
                  amount: Math.round(earnings * 100),
                  metadata: {
                    type: "ambassador_earnings",
                    eventId: event._id.toString(),
                    athleteId: event.athleteId.toString(),
                    athleteVatCountry: athleteVatCountryAtInvoiceTime,
                    athleteVatStatus: athleteVatStatusAtInvoiceTime,
                  },
                },
              ]
            : []),
          // Platform fee line item
          ...(platformFee > 0
            ? [
                {
                  description: "Platform fee",
                  amount: platformFeeCents,
                  metadata: {
                    type: "platform_fee",
                    eventId: event._id.toString(),
                  },
                },
              ]
            : []),
          // VAT line item
          ...(vatAmountCents > 0
            ? [
                {
                  description: `VAT ${(vatTreatment.vatRate * 100).toFixed(1)}% (${vatTreatment.vatTreatment})`,
                  amount: vatAmountCents,
                  metadata: {
                    type: "vat",
                    vatTreatment: vatTreatment.vatTreatment,
                    vatRate: vatTreatment.vatRate.toString(),
                    eventId: event._id.toString(),
                    baseAmount: (vatBaseCents / 100).toString(),
                  },
                },
              ]
            : []),
          // Stripe processing fee line item (persisted)
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
        metrics: invoiceMetrics,
      });

      await VisitorEvent.updateOne(
        { _id: event._id },
        { invoicedAt: new Date(), invoicedInvoiceId: invoice.id },
      );

      // Email notification removed - will be sent after payment success instead

      return NextResponse.json({
        data: {
          success: true,
          invoice: {
            id: savedInvoice._id,
            stripeInvoiceId: savedInvoice.stripeInvoiceId,
            campaignId: savedInvoice.campaignId,
            amount: savedInvoice.amount,
            currency: savedInvoice.currency,
            periodStart: savedInvoice.periodStart,
            periodEnd: savedInvoice.periodEnd,
            status: savedInvoice.status,
            lineItems: savedInvoice.lineItems,
            metrics: savedInvoice.metrics,
            eventId: savedInvoice.eventId,
            createdAt: savedInvoice.createdAt,
          },
        },
      });
    }

    // Validate request body (bulk mode)
    if (
      !brandId ||
      !campaignId ||
      !periodStart ||
      !periodEnd ||
      !metrics ||
      !currency ||
      !lineItems ||
      !totalAmount
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(metrics.clicks) ||
      metrics.clicks < 0 ||
      !Number.isInteger(metrics.conversions) ||
      metrics.conversions < 0
    ) {
      return NextResponse.json(
        { error: "Metrics must be non-negative integers" },
        { status: 400 },
      );
    }

    if (isNaN(Date.parse(periodStart)) || isNaN(Date.parse(periodEnd))) {
      return NextResponse.json(
        { error: "Invalid periodStart or periodEnd date format" },
        { status: 400 },
      );
    }

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: "lineItems must be a non-empty array" },
        { status: 400 },
      );
    }

    for (const item of lineItems) {
      if (
        !item.description ||
        !Number.isInteger(item.amount) ||
        item.amount < 0
      ) {
        return NextResponse.json(
          { error: "Each line item must have a valid description and amount" },
          { status: 400 },
        );
      }
    }

    if (!Number.isInteger(totalAmount) || totalAmount <= 0) {
      return NextResponse.json(
        { error: "totalAmount must be a positive integer" },
        { status: 400 },
      );
    }

    // Validate user and role
    const user = await User.findById(brandId);
    if (!user) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }
    if (user.role !== "brand") {
      return NextResponse.json(
        { error: "Only brand users can create invoices" },
        { status: 403 },
      );
    }

    // Ensure stripeCustomerId exists
    if (!user.brand?.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: brandId },
      });
      await User.updateOne(
        { _id: brandId },
        { "brand.stripeCustomerId": customer.id },
      );
      user.brand = user.brand || {};
      user.brand.stripeCustomerId = customer.id;
    }

    // Verify customer has a default payment method
    const customer = await stripe.customers.retrieve(
      user.brand.stripeCustomerId,
    );
    if (!customer.invoice_settings.default_payment_method) {
      return NextResponse.json(
        { error: "No default payment method found. Please add a card." },
        { status: 400 },
      );
    }

    // Bulk mode: NO VAT added (no ambassador context)
    const subtotalAmount = totalAmount / 100; // Convert from cents to euros
    const invoiceCalculation = {
      subtotal: subtotalAmount,
      vatAmount: 0,
      vatRate: 0,
      vatTreatment: "reverse_charge",
      clientVatNumber: null,
      total: subtotalAmount,
      notes: ["No VAT (bulk invoice without ambassador context)"],
    };
    const vatAwareTotalCents = Math.round(invoiceCalculation.total * 100);
    // Stripe processing fee for bulk invoices: base is subtotal BEFORE fee
    const stripeFeeCents = calculateStripeProcessingFeeCents(
      Math.round(invoiceCalculation.subtotal * 100),
    );

    const brandVatNumberRaw = (user.brand?.vatNumber || "").toString().trim();
    const brandCountryRaw = (user.brand?.country || "").toString().trim();
    const brandVatRegistered = !!brandVatNumberRaw;
    const brandIsFinnishVat =
      brandCountryRaw.toUpperCase() === "FI" ||
      brandVatNumberRaw.toUpperCase().startsWith("FI");
    const chargeVatOnStripeFee = brandVatRegistered && brandIsFinnishVat;
    const stripeFeeAdjustedCents = chargeVatOnStripeFee
      ? Math.round(stripeFeeCents * (1 + FINNISH_VAT_RATE))
      : stripeFeeCents;

    // Create the invoice in Stripe with unique description and VAT metadata
    const invoice = await stripe.invoices.create({
      customer: user.brand.stripeCustomerId,
      collection_method: "charge_automatically",
      auto_advance: true,
      currency,
      description: `Bulk Invoice for Campaign ${campaignId} - ${new Date().toISOString()}`,
      metadata: {
        campaignId,
        periodStart,
        periodEnd,
        metrics: JSON.stringify(metrics),
        // VAT metadata (snapshot)
        subtotal: invoiceCalculation.subtotal.toString(),
        vatAmount: invoiceCalculation.vatAmount.toString(),
        vatRate: invoiceCalculation.vatRate.toString(),
        vatTreatment: invoiceCalculation.vatTreatment,
        clientVatNumber: invoiceCalculation.clientVatNumber || "",
        brandCountry: (user.brand?.country || user.brand?.vatCountry || "")
          .toString()
          .toUpperCase(),
        brandVatStatus: (user.brand?.vatStatus || "not_provided")
          .toString()
          .toLowerCase(),
      },
    });

    // Generate line items for bulk invoice (no VAT line will be added since vatAmount=0)
    const bulkLineItemsData = generateInvoiceLineItems(
      invoiceCalculation,
      `Bulk services for Campaign ${campaignId}`,
    );

    // Add VAT-aware invoice items
    for (const lineItem of bulkLineItemsData) {
      await stripe.invoiceItems.create({
        customer: user.brand.stripeCustomerId,
        invoice: invoice.id,
        amount: Math.round(lineItem.amount * 100),
        currency,
        description: lineItem.description,
        metadata: {
          ...lineItem.metadata,
          campaignId: campaignId,
          // Keep original line items in metadata for reference
          originalLineItems: JSON.stringify(
            lineItems.map((item) => ({
              description: item.description,
              amount: item.amount,
              metadata: item.metadata || {},
            })),
          ),
        },
      });
    }

    // Add Stripe processing fee line item (no VAT)
    if (stripeFeeAdjustedCents > 0) {
      await stripe.invoiceItems.create({
        customer: user.brand.stripeCustomerId,
        invoice: invoice.id,
        amount: stripeFeeAdjustedCents,
        currency,
        description: "Payment processing fee (Stripe)",
        metadata: {
          type: "stripe_processing_fee",
          campaignId: campaignId,
          vatIncluded: chargeVatOnStripeFee ? "true" : "false",
          vatRate: chargeVatOnStripeFee ? FINNISH_VAT_RATE.toString() : "0",
        },
      });
    }

    // Update total amount to include VAT
    const finalTotalAmount = vatAwareTotalCents + stripeFeeAdjustedCents;

    // Finalize the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    // Save VAT-aware invoice to MongoDB
    const savedInvoice = await Invoice.create({
      brandId,
      campaignId,
      stripeInvoiceId: invoice.id,
      invoiceNumber: `BULK-INV-${Date.now()}`,
      // VAT-aware amounts
      subtotal: Math.round(invoiceCalculation.subtotal * 100),
      vatAmount: Math.round(invoiceCalculation.vatAmount * 100),
      vatRate: invoiceCalculation.vatRate,
      vatTreatment: invoiceCalculation.vatTreatment,
      total: finalTotalAmount,
      ourVatNumber: process.env.COMPANY_VAT_NUMBER || "FI12345678",
      clientVatNumber: invoiceCalculation.clientVatNumber,
      notes: invoiceCalculation.notes || [],
      brandCountry: (user.brand?.country || user.brand?.vatCountry || "")
        .toString()
        .toUpperCase(),
      brandVatStatus: (user.brand?.vatStatus || "not_provided")
        .toString()
        .toLowerCase(),

      // Legacy fields for backward compatibility
      amount: finalTotalAmount,
      currency,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      status: finalizedInvoice.status,
      lineItems: [
        ...bulkLineItemsData.map((item) => ({
          description: item.description,
          amount: Math.round(item.amount * 100),
          metadata: {
            ...item.metadata,
            campaignId: campaignId,
            // Keep original line items in metadata for reference
            originalLineItems: JSON.stringify(
              lineItems.map((origItem) => ({
                description: origItem.description,
                amount: origItem.amount,
                metadata: origItem.metadata || {},
              })),
            ),
          },
        })),
        ...(stripeFeeCents > 0
          ? [
              {
                description: "Payment processing fee (Stripe)",
                amount: stripeFeeCents,
                metadata: {
                  type: "stripe_processing_fee",
                  campaignId: campaignId,
                },
              },
            ]
          : []),
      ],
      metrics,
    });

    // Email notification removed - will be sent after payment success instead

    return NextResponse.json({
      data: {
        success: true,
        invoice: {
          id: savedInvoice._id,
          stripeInvoiceId: savedInvoice.stripeInvoiceId,
          campaignId: savedInvoice.campaignId,
          amount: savedInvoice.amount,
          currency: savedInvoice.currency,
          periodStart: savedInvoice.periodStart,
          periodEnd: savedInvoice.periodEnd,
          status: savedInvoice.status,
          lineItems: savedInvoice.lineItems,
          metrics: savedInvoice.metrics,
          createdAt: savedInvoice.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Invoice creation error:", error);
    return NextResponse.json(
      { error: `Failed to create invoice: ${error.message}` },
      { status: 500 },
    );
  }
}
