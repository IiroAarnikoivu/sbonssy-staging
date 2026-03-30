import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import VisitorEvent from "@/models/VisitorEvent";
import mongoose from "mongoose";
import {
  FINNISH_VAT_RATE,
  calculateStripeProcessingFeeCents,
} from "@/lib/vat/vatCalculator";

// All monetary amounts in the Invoice collection are in cents.
// Convert to major currency units (e.g., EUR) consistently.
function centsToMajor(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n) / 100;
}

export async function GET(request) {
  await connectDB();
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const campaignIdFilter = searchParams.get("campaignId");

    // Auth (brand only)
    // Expect Supabase session attached upstream; fallback to query brandId for now
    const brandId = searchParams.get("brandId");

    if (!brandId) {
      return NextResponse.json({ error: "Missing brandId" }, { status: 400 });
    }

    const brand = await User.findById(brandId);
    if (!brand || brand.role !== "brand") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Build query: invoices for brand, overlapping date range
    // Ensure ObjectId types for DB queries
    const brandObjectId = new mongoose.Types.ObjectId(brandId);
    const match = { brandId: brandObjectId };
    if (status) match.status = status;
    if (campaignIdFilter)
      match.campaignId = new mongoose.Types.ObjectId(campaignIdFilter);

    let invoices = await Invoice.find(match).sort({ createdAt: -1 }).lean();

    // Handle unlinked invoices - match them with uninvoiced events
    const unlinkedInvoices = invoices.filter((inv) => !inv.eventId);
    if (unlinkedInvoices.length > 0) {
      // Get all uninvoiced events for potential matching
      const potentialEvents = await VisitorEvent.find({
        brandId: brandObjectId,
        $or: [{ invoicedAt: { $exists: false } }, { invoicedAt: null }],
      }).lean();

      // Process all linking operations and wait for completion
      const linkingPromises = [];

      for (const invoice of unlinkedInvoices) {
        // Try to find a matching event based on amount and timing
        const invoiceAmount = invoice.amount; // in cents
        const invoiceDate = new Date(invoice.createdAt);

        // Look for events created within 24 hours before the invoice
        const matchingEvent = potentialEvents.find((event) => {
          const eventAmount = Math.round(
            (Number(event?.eventData?.amount || 0) +
              Number(event?.eventData?.platformFee || 0)) *
              100,
          );
          const eventDate = new Date(event.createdAt);
          const timeDiff = invoiceDate.getTime() - eventDate.getTime();

          return (
            eventAmount === invoiceAmount &&
            timeDiff >= 0 &&
            timeDiff <= 24 * 60 * 60 * 1000 // 24 hours
          );
        });

        if (matchingEvent) {
          // Create a promise for the linking operations
          const linkingPromise = async () => {
            try {
              // Update the invoice with eventId
              // Update the invoice with eventId
              const invoiceUpdateResult = await Invoice.findByIdAndUpdate(
                new mongoose.Types.ObjectId(invoice._id),
                { eventId: new mongoose.Types.ObjectId(matchingEvent._id) },
                { new: true },
              );

              // Mark the event as invoiced
              const eventUpdateResult = await VisitorEvent.findByIdAndUpdate(
                new mongoose.Types.ObjectId(matchingEvent._id),
                {
                  invoicedAt: new Date(),
                  invoicedInvoiceId:
                    invoice.stripeInvoiceId || `manual_${invoice._id}`,
                },
                { new: true },
              );

              // Verify the update worked with a fresh query
              const updatedEvent = await VisitorEvent.findById(
                matchingEvent._id,
              ).lean();
            } catch (error) {
              throw error;
            }
          };

          linkingPromises.push(linkingPromise());

          // Update the invoice object for further processing
          invoice.eventId = matchingEvent._id;

          // Remove this event from potential matches
          const eventIndex = potentialEvents.indexOf(matchingEvent);
          if (eventIndex > -1) {
            potentialEvents.splice(eventIndex, 1);
          }
        }
      }

      // Wait for all linking operations to complete
      if (linkingPromises.length > 0) {
        await Promise.all(linkingPromises);
      }
    }

    // Refresh invoices list after linking
    invoices = await Invoice.find(match).sort({ createdAt: -1 }).lean();

    // Totals
    let totalPaid = 0;
    let totalPending = 0;
    let upcomingPayment = 0;

    const byCampaignMap = new Map();
    const byMonthMap = new Map();

    const detailed = [];

    // Collect IDs for enrichment
    const athleteIdSet = new Set();
    const campaignIdSet = new Set();

    // First pass: scan invoices to collect athlete IDs present in line items
    for (const inv of invoices) {
      const lineItems = Array.isArray(inv.lineItems) ? inv.lineItems : [];
      for (const li of lineItems) {
        const meta =
          li?.metadata instanceof Map
            ? Object.fromEntries(li.metadata)
            : li?.metadata || {};
        const athleteId = meta?.athleteId;
        if (athleteId) {
          try {
            athleteIdSet.add(String(athleteId));
          } catch (_) {}
        }
      }
      if (inv.campaignId) campaignIdSet.add(String(inv.campaignId));
    }

    // Fetch upcoming events grouped to avoid duplicates; also collect athlete IDs for VAT
    const upcomingAgg = await VisitorEvent.aggregate([
      {
        $match: {
          brandId: brandObjectId,
          $or: [{ invoicedAt: { $exists: false } }, { invoicedAt: null }],
          eventType: "conversion",
          isTest: { $ne: true },
        },
      },
      {
        $group: {
          _id: {
            campaignId: "$campaignId",
            athleteId: "$athleteId",
            visitorId: "$visitorId",
            commissionStatus: "$commissionStatus",
          },
          totalAmount: { $sum: { $ifNull: ["$eventData.amount", 0] } },
          totalPlatformFee: {
            $sum: { $ifNull: ["$eventData.platformFee", 0] },
          },
          refundAmount: { $max: { $ifNull: ["$refundAmount", 0] } },
          originalSaleAmount: {
            $max: { $ifNull: ["$eventData.originalSaleAmount", 0] },
          },
          firstCreatedAt: { $min: "$createdAt" },
        },
      },
      { $sort: { firstCreatedAt: 1 } },
    ]).catch(() => []);

    for (const ev of upcomingAgg) {
      const athleteIdStr = ev?._id?.athleteId ? String(ev._id.athleteId) : null;
      if (athleteIdStr) athleteIdSet.add(athleteIdStr);
      if (ev?._id?.campaignId) campaignIdSet.add(String(ev._id.campaignId));
    }

    // Fetch Campaign details for commissionRate enrichment
    const rateCampaigns = await Campaign.find(
      { _id: { $in: Array.from(campaignIdSet) } },
      { compensation: 1 },
    ).lean();
    const campaignInfoMap = new Map(
      rateCampaigns.map((c) => [
        String(c._id),
        c.compensation?.commission || c.compensation?.amount || 0,
      ]),
    );

    // Build VAT charge map for BRAND
    const brandVatDetails = brand?.brand?.vatDetails || {};
    const brandCountry = (
      brandVatDetails.vatCountry ||
      brand?.brand?.country ||
      ""
    )
      .toString()
      .toUpperCase();
    const brandVatStatus = (brandVatDetails.vatStatus || "not_provided")
      .toString()
      .toLowerCase();
    const chargeVatOnBrand =
      brandVatStatus === "valid" && brandCountry === "FI";

    // Build event map for refundAmount lookup (including invoiced events)
    const allEvents = await VisitorEvent.find({
      brandId: brandObjectId,
      eventType: "conversion",
    }).lean();

    const eventLookupMap = new Map(); // key: athleteId + campaignId + visitorId (approximated for invoiced)
    for (const ev of allEvents) {
      const key = `${ev.athleteId}_${ev.campaignId}_${ev.shopifyOrderId || ev.eventData?.transactionId}`;
      eventLookupMap.set(key, ev);
    }
    for (const inv of invoices) {
      const status = inv.status || "open";
      const lineItems = Array.isArray(inv.lineItems) ? inv.lineItems : [];
      const athleteItems = lineItems.filter((li) => {
        const meta =
          li?.metadata instanceof Map
            ? Object.fromEntries(li.metadata)
            : li?.metadata || {};
        return !!meta?.athleteId;
      });
      const platformItems = lineItems.filter((li) => {
        if (!li?.metadata) return false;
        const meta =
          li.metadata instanceof Map
            ? Object.fromEntries(li.metadata)
            : li.metadata;
        return (
          (meta?.type || meta?.Type || "").toString().toLowerCase() ===
          "platform_fee"
        );
      });

      const stripeFeeItems = lineItems.filter((li) => {
        if (!li?.metadata) return false;
        const meta =
          li.metadata instanceof Map
            ? Object.fromEntries(li.metadata)
            : li.metadata;
        return (
          (meta?.type || meta?.Type || "").toString().toLowerCase() ===
          "stripe_processing_fee"
        );
      });

      let invoiceDisplayTotalCents = Math.round(Number(inv.amount) || 0);

      const amtNorm = centsToMajor(invoiceDisplayTotalCents);
      if (status === "paid") totalPaid += amtNorm;
      else if (status === "open") totalPending += amtNorm;

      // per-campaign
      const key = String(inv.campaignId || "unknown");
      byCampaignMap.set(key, (byCampaignMap.get(key) || 0) + amtNorm);

      // over time (YYYY-MM)
      const d = inv.createdAt ? new Date(inv.createdAt) : new Date();
      const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
        2,
        "0",
      )}`;
      byMonthMap.set(ym, (byMonthMap.get(ym) || 0) + amtNorm);

      // Detailed rows with VAT-inclusive ambassador parts
      if (!athleteItems.length) {
        detailed.push({
          id: String(inv._id),
          date: inv.createdAt,
          campaignId: inv.campaignId,
          saleAmount: amtNorm,
          commissionPaid: status === "paid" ? amtNorm : 0,
          status,
          commissionStatus:
            status === "paid"
              ? "paid"
              : status === "open"
                ? "locked"
                : "pending",
          affiliateId: null,
          affiliateName: "—",
        });
      } else {
        // Even for detailed breakdown, we should use the stored line items values directly
        // rather than recalculating VAT based on a side-map.
        const provisional = [];
        let totalNormalizedCents = 0;

        for (const item of athleteItems) {
          const liCents = Number(item.amount) || 0;
          const meta =
            item.metadata instanceof Map
              ? Object.fromEntries(item.metadata)
              : item.metadata || {};
          const athleteId = String(meta.athleteId || "");

          const isCancelled = lineItems.some((li) => {
            const m =
              li.metadata instanceof Map
                ? Object.fromEntries(li.metadata)
                : li.metadata;
            return (
              String(m?.athleteId || "") === athleteId &&
              (m?.cancelled === "true" || m?.cancelled === true)
            );
          });

          // Re-calculate allocation of platform/stripe fees proportional to athlete amounts
          // but we'll use a simpler approach: just show the athlete portion of the invoice total
          // For consistency with analytics, we'll keep the allocation logic but use stored values.
          provisional.push({ li: item, liCents, athleteId, isCancelled });
        }

        const platformCents = platformItems.reduce(
          (s, i) => s + (Number(i.amount) || 0),
          0,
        );
        const stripeCents = stripeFeeItems.reduce(
          (s, i) => s + (Number(i.amount) || 0),
          0,
        );
        const vatCents = inv.vatAmount || 0;

        const totalPool = platformCents + stripeCents + vatCents;
        const athleteTotalCents = provisional.reduce(
          (s, p) => s + (p.isCancelled ? 0 : p.liCents),
          0,
        );

        provisional.forEach((p, idx) => {
          // Try to find refundAmount from VisitorEvent
          const athleteIdStr = String(p.athleteId);
          const campaignIdStr = String(inv.campaignId);
          // Lookup by eventId if available or composite key
          const ev =
            inv.eventId && String(inv.eventId) === athleteIdStr // This logic is flawed, eventId is only one event
              ? allEvents.find((e) => String(e._id) === String(inv.eventId))
              : allEvents.find(
                  (e) =>
                    (e.invoicedInvoiceId === inv.stripeInvoiceId ||
                      String(e.invoicedInvoiceId) === `manual_${inv._id}`) &&
                    String(e.athleteId) === athleteIdStr,
                );
          const alloc =
            athleteTotalCents > 0
              ? Math.round((totalPool * p.liCents) / athleteTotalCents)
              : 0;
          const lineTotalMajor = centsToMajor(p.liCents + alloc);

          detailed.push({
            id: `${inv._id}:${p.athleteId}`,
            date: inv.createdAt,
            campaignId: inv.campaignId,
            customerSaleAmount: ev?.eventData?.originalSaleAmount || 0,
            saleAmount: lineTotalMajor,
            refundAmount: ev?.refundAmount || 0,
            commissionPaid:
              status === "paid" && !p.isCancelled ? lineTotalMajor : 0,
            status,
            commissionStatus: p.isCancelled
              ? "cancelled"
              : status === "paid"
                ? "paid"
                : status === "open"
                  ? "locked"
                  : "pending",
            affiliateId: p.athleteId || null,
            commissionRate: campaignInfoMap.get(String(inv.campaignId)) || 0,
          });
        });
      }
    }

    // Compute UPCOMING amounts from grouped uninvoiced events with VAT applied
    let upcomingTotalMajor = 0;
    for (const ev of upcomingAgg) {
      const athleteIdStr = ev?._id?.athleteId ? String(ev._id.athleteId) : "";
      const campIdStr = ev?._id?.campaignId ? String(ev._id.campaignId) : "";
      const ambMajor = Number(ev?.totalAmount || 0);
      const pfMajor = Number(ev?.totalPlatformFee || 0);
      const ambCents = Math.round(ambMajor * 100);
      const pfCents = Math.round(pfMajor * 100);
      const stripeFeeCents = calculateStripeProcessingFeeCents(
        ambCents + pfCents,
      );

      const subtotalCents = ambCents + pfCents + stripeFeeCents;
      const vatCents = chargeVatOnBrand
        ? Math.round(subtotalCents * FINNISH_VAT_RATE)
        : 0;

      const sumCents = subtotalCents + vatCents;
      if (sumCents === 0) continue;
      const sumMajor = centsToMajor(sumCents);
      const commissionStatus = ev?._id?.commissionStatus || "pending";

      // Only count non-cancelled events toward upcoming payment total
      if (commissionStatus !== "cancelled") {
        upcomingTotalMajor += sumMajor;
      }

      // detailed record per event, with debit/credit entry type
      detailed.push({
        id: `upcoming:${String(ev?._id?.campaignId || "")}:${String(
          ev?._id?.visitorId || "",
        )}`,
        date: ev.firstCreatedAt,
        campaignId: ev?._id?.campaignId,
        saleAmount: sumMajor,
        customerSaleAmount: Number(ev.originalSaleAmount || 0),
        refundAmount: Number(ev.refundAmount || 0),
        commissionPaid: 0,
        status: commissionStatus,
        commissionStatus,
        affiliateId: athleteIdStr || null,
        entryType: sumCents > 0 ? "debit" : "credit",
        commissionRate: campaignInfoMap.get(campIdStr) || 0,
      });
    }

    // Set upcomingPayment to reflect uninvoiced totals in the summary
    upcomingPayment = upcomingTotalMajor;

    // Resolve campaign titles
    const campaignIds = [
      ...new Set([
        ...byCampaignMap.keys(),
        ...detailed.map((r) => String(r.campaignId || "")),
        ...upcomingAgg.map((e) => String(e?._id?.campaignId || "")),
      ]),
    ].filter((k) => k && k !== "unknown" && mongoose.Types.ObjectId.isValid(k));

    // Fetch basics.title and tracking info
    const metaCampaigns = await Campaign.find(
      { _id: { $in: campaignIds } },
      {
        _id: 1,
        "basics.title": 1,
        trackingId: 1,
        "basics.campaign_url": 1,
        "compensation.affiliateLinkDestination": 1,
        "compensation.type": 1,
      },
    )
      .lean()
      .catch(() => []);
    const campaignMetaMap = new Map(
      metaCampaigns.map((c) => [
        String(c._id),
        {
          title: c?.basics?.title,
          trackingId: c?.trackingId,
          trackingUrl:
            c?.compensation?.affiliateLinkDestination ||
            c?.basics?.campaign_url ||
            null,
          compensationType: c?.compensation?.type || null,
        },
      ]),
    );
    const titleMap = new Map(
      metaCampaigns.map((c) => [String(c._id), c?.basics?.title]),
    );

    const paymentsByCampaign = [...byCampaignMap.entries()].map(
      ([id, amount]) => ({
        campaignId: id,
        campaignTitle: titleMap.get(id) || id,
        amount,
      }),
    );

    const paymentsOverTime = [...byMonthMap.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([period, amount]) => ({ period, amount }));

    // Resolve affiliate names in bulk
    const athleteIds = [...athleteIdSet];
    const athletes = athleteIds.length
      ? await User.find(
          { _id: { $in: athleteIds } },
          {
            _id: 1,
            "athlete.name": 1,
            "team.name": 1,
            "influencer.name": 1,
            "coach.name": 1,
            "exAthlete.name": 1,
            "paraAthlete.name": 1,
          },
        ).lean()
      : [];
    const nameOf = (u) =>
      u?.athlete?.name ||
      u?.team?.name ||
      u?.influencer?.name ||
      u?.coach?.name ||
      u?.exAthlete?.name ||
      u?.paraAthlete?.name ||
      "Unknown";
    const athleteNameMap = new Map(
      athletes.map((a) => [String(a._id), nameOf(a)]),
    );

    const enrichedDetailed = detailed
      .map((r) => {
        const cMeta = campaignMetaMap.get(String(r.campaignId)) || {};
        return {
          ...r,
          affiliateName: r.affiliateId
            ? athleteNameMap.get(String(r.affiliateId)) || "Unknown"
            : r.affiliateName || "—",
          campaignTitle: cMeta.title || String(r.campaignId || ""),
          campaignTrackingId: cMeta.trackingId || null,
          trackingUrl: cMeta.trackingUrl || null,
          compensationType: cMeta.compensationType || null,
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    const totalRecords = enrichedDetailed.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const paginatedRecords = enrichedDetailed.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalPaid,
          pendingPayments: totalPending,
          upcomingPayment: upcomingPayment,
        },
        breakdowns: {
          paymentsByCampaign,
          paymentsOverTime,
        },
        records: paginatedRecords,
        pagination: {
          totalRecords,
          totalPages,
          currentPage: page,
          limit,
        },
      },
    });
  } catch (e) {
    console.error("/api/payments/brand error", e);
    return NextResponse.json(
      { error: e.message || "Server error" },
      { status: 500 },
    );
  }
}
