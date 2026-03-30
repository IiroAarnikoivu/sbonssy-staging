import { NextResponse } from "next/server";
import User from "@/models/User";

export async function GET(_req, { params }) {
  try {
    const { id } = params || {};
    if (!id) {
      return NextResponse.json({ success: false, message: "Missing brand id" }, { status: 400 });
    }

    const user = await User.findById(id).select({
      "brand.companyName": 1,
      "brand.name": 1,
      name: 1,
      role: 1,
    });

    if (!user || user.role !== "brand") {
      return NextResponse.json({ success: false, message: "Brand not found" }, { status: 404 });
    }

    const brandName = user.brand?.companyName || user.brand?.name || user.name || "";

    return NextResponse.json({ success: true, data: { brandName } }, { status: 200 });
  } catch (error) {
    console.error("GET /api/brand/[id] error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
