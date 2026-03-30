import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import Transaction from "@/models/Transaction";
import Transfer from "@/models/Transfer";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(request) {
  await connectDB();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.user_metadata?.is_super_admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const userData = await User.findOne({ supabaseId: user.id });
  const adminId = userData?._id;

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  const limit = parseInt(searchParams.get("limit") || 10);
  const page = parseInt(searchParams.get("page") || 1);

  try {
    // Validate parameters
    if (!adminId) {
      return NextResponse.json(
        { error: "Missing or invalid admin ID" },
        { status: 400 },
      );
    }
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 100" },
        { status: 400 },
      );
    }
    if (page < 1) {
      return NextResponse.json(
        { error: "Page must be a positive integer" },
        { status: 400 },
      );
    }

    // Find the user by ID and validate role
    const adminUser = await User.findById(adminId);
    if (!adminUser) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }
    if (adminUser.role !== "admin") {
      return NextResponse.json(
        { error: "Only admin users can access transactions" },
        { status: 403 },
      );
    }

    // If customerId is provided, validate it
    if (customerId) {
      const brandUser = await User.findOne({
        "brand.stripeCustomerId": customerId,
      });
      if (!brandUser) {
        return NextResponse.json(
          { error: "Customer ID does not belong to any brand on the platform" },
          { status: 403 },
        );
      }
    }

    // Build Aggregation Pipeline
    const matchStage = customerId ? { customerId } : {};
    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // 1. Lookup Invoice
      {
        $lookup: {
          from: "invoices",
          localField: "invoiceId",
          foreignField: "stripeInvoiceId",
          as: "invoice",
        },
      },
      { $unwind: { path: "$invoice", preserveNullAndEmptyArrays: true } },
      // 2. Lookup VisitorEvent (to get athleteId) - Only if invoice exists
      {
        $lookup: {
          from: "visitorevents",
          localField: "invoice.eventId",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } },
      // 3. Lookup User (Ambassador) using athleteId from Event OR from Invoice metadata if we had it (fallback logic mainly)
      {
        $lookup: {
          from: "users",
          localField: "event.athleteId",
          foreignField: "_id",
          as: "ambassador",
        },
      },
      { $unwind: { path: "$ambassador", preserveNullAndEmptyArrays: true } },
      // 4. Lookup AmbassadorBalanceCredit (to confirm credit)
      {
        $lookup: {
          from: "ambassadorbalancecredits",
          localField: "invoiceId",
          foreignField: "stripeInvoiceId",
          as: "creditRecord",
        },
      },
      { $unwind: { path: "$creditRecord", preserveNullAndEmptyArrays: true } },
    ];

    const transactions = await Transaction.aggregate(pipeline);
    const total = await Transaction.countDocuments(matchStage);

    return NextResponse.json({
      data: {
        success: true,
        data: transactions.map((t) => {
          // Determine ambassador name from user record
          let ambassadorName = "N/A";
          let ambassadorEmail = "N/A";

          if (t.ambassador) {
            const subRole = t.ambassador.subRole || "athlete";
            ambassadorName =
              t.ambassador[subRole]?.name || t.ambassador.name || "N/A";
            ambassadorEmail = t.ambassador.email;
          }

          // Determine if truly credited
          // Logic: If there is a creditRecord, it is credited.
          // OR if legacy status says 'succeeded' and we assume (but we prefer explicit record)
          const isCredited =
            !!t.creditRecord ||
            (t.status === "succeeded" && !!t.invoice?.ambassadorCreditedAt);

          return {
            transactionId: t.transactionId,
            amount: t.amount,
            currency: t.currency,
            status: t.status,
            paymentMethod: t.paymentMethod,
            invoiceId: t.invoiceId,
            customerId: t.customerId,
            brandId: t.brandId,
            campaignId: t.campaignId,
            createdAt: t.createdAt,
            description: t.description,
            ambassadorName,
            ambassadorEmail,
            isCredited,
            commissionStatus: t.event?.commissionStatus || "pending",
            creditDate:
              t.creditRecord?.createdAt ||
              t.invoice?.ambassadorCreditedAt ||
              null,
          };
        }),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("List Transactions error:", error);
    let errorMessage = "Failed to retrieve transactions";
    if (error.name === "MongoError") {
      errorMessage = `Database error: ${error.message}`;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
