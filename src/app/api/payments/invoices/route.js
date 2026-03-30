import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
import { NextResponse } from "next/server";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");

  try {
    const invoices = await Invoice.find({ brandId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: invoices });
  } catch (error) {
    console.error("Fetch invoices error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
