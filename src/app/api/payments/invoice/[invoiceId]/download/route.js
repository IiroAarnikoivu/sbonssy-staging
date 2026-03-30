import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";

export async function GET(request, { params }) {
  const { invoiceId } = await params;

  try {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    const pdfUrl = invoice.invoice_pdf;
    return NextResponse.json({ data: { success: true, url: pdfUrl } });
  } catch (error) {
    console.error("Download invoice error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
