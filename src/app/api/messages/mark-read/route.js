import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";

export async function POST(request) {
  await connectDB();
  try {
    const { userId, partnerId } = await request.json();
    if (!userId || !partnerId) {
      return NextResponse.json(
        { success: false, error: "userId and partnerId are required" },
        { status: 400 }
      );
    }

    const result = await Message.updateMany(
      { receiver: userId, sender: partnerId, read: false },
      { $set: { read: true } }
    );

    return NextResponse.json({
      success: true,
      modified: result.modifiedCount || 0,
    });
  } catch (err) {
    console.error("mark-read error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to mark as read" },
      { status: 500 }
    );
  }
}
