import { connectDB } from "@/lib/db";
import Payout from "@/models/Payout";
import { NextResponse } from "next/server";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const ambassadorId = searchParams.get("ambassadorId");

  try {
    const payouts = await Payout.find({ ambassadorId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: payouts });
  } catch (error) {
    console.error("Fetch payouts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
