import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "userId is required" },
      { status: 400 }
    );
  }

  try {
    const distinctSenders = await Message.distinct("sender", {
      receiver: userId,
      read: false,
    });

    return NextResponse.json({ success: true, count: distinctSenders.length });
  } catch (err) {
    console.error("unread-count error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
