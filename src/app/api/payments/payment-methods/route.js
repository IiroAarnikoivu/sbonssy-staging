// File: @/pages/api/payment-methods.js (or wherever your API routes are defined)
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import PaymentMethod from "@/models/PaymentMethod";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(request) {
  await connectDB();

  try {
    // Assuming you have a way to get the authenticated user's ID (e.g., from a session or token)
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const brandUser = await User.findOne({ supabaseId: user.id });
    if (!brandUser || brandUser.role !== "brand") {
      return NextResponse.json(
        { message: "Unauthorized: Must be a brand" },
        { status: 403 },
      );
    }

    // If this brand user is invited by another brand owner, use inviter's userId
    const userId = brandUser?.invitedBy ? brandUser.invitedBy : brandUser?._id;

    // Verify the user exists and has the 'brand' role
    // const brandUserData = await User.findById(userId);

    // Fetch payment methods for the user
    const paymentMethods = await PaymentMethod.find({ userId });

    return NextResponse.json({ data: { data: paymentMethods } });
  } catch (error) {
    console.error("Get Payment Methods error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 },
    );
  }
}
