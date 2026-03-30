import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
import User from "@/models/User";
import { generateVATInvoicePDF } from "@/lib/pdf/invoiceGenerator";
import createClient from "@/lib/supabase/server";

export async function GET(request, { params }) {
  try {
    const { invoiceId } = params;
    
    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // Authentication check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Find invoice
    const invoice = await Invoice.findOne({
      $or: [
        { _id: invoiceId },
        { stripeInvoiceId: invoiceId },
        { invoiceNumber: invoiceId }
      ]
    }).lean();

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Find brand/customer
    const brand = await User.findById(invoice.brandId).lean();
    if (!brand) {
      return NextResponse.json(
        { error: "Brand not found" },
        { status: 404 }
      );
    }

    // Authorization check - only allow brand owner or admin
    const isOwner = brand.supabaseId === user.id;
    const isAdmin = user.user_metadata?.is_super_admin;
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Generate PDF
    const pdfBuffer = await generateVATInvoicePDF(invoice, brand);

    // Set headers for PDF download
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber || invoice.stripeInvoiceId}.pdf"`);
    headers.set('Content-Length', pdfBuffer.length.toString());

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error.message },
      { status: 500 }
    );
  }
}
