import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(request) {
  await connectDB();
  const body = await request.json();
  const { brandId, page = 1, limit = 10 } = body || {};

  try {
    // Validate request body
    if (!brandId) {
      return NextResponse.json(
        { error: "Missing required field: brandId" },
        { status: 400 }
      );
    }

    // Validate user and role
    const user = await User.findById(brandId);
    if (!user) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }
    if (user.role !== "brand") {
      return NextResponse.json(
        { error: "Only brand users can retrieve invoices" },
        { status: 403 }
      );
    }

    // Pagination params
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Count total and fetch current page (exclude cancelled invoices)
    const query = { brandId, status: { $ne: "cancelled" } };
    const [total, invoices] = await Promise.all([
      Invoice.countDocuments(query),
      Invoice.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    // Format invoices for response
    const invoiceDetails = invoices.map((invoice) => ({
      id: invoice._id,
      stripeInvoiceId: invoice.stripeInvoiceId,
      campaignId: invoice.campaignId,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      lineItems: invoice.lineItems,
      metrics: invoice.metrics,
      createdAt: invoice.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: invoiceDetails,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("List Invoices error:", error);
    return NextResponse.json(
      { error: `Failed to retrieve invoices: ${error.message}` },
      { status: 500 }
    );
  }
}
