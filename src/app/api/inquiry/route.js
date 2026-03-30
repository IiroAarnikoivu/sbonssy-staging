import { connectDB } from "@/lib/db";
import Inquiry from "@/models/Inquiry";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    await connectDB();

    const { firstName, lastName, email, phone, role, message, agree } =
      await request.json();

    const inquiry = new Inquiry({
      firstName,
      lastName,
      email,
      phone,

      role,
      message,
      agree,
    });
    await inquiry.save();
    return NextResponse.json({
      data: { data: inquiry, message: "inquiry sent successfully" },
    });
  } catch (error) {

    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}
