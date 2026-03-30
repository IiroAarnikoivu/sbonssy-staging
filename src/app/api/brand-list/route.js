import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    await connectDB();
    const query = { role: "brand", isProfileCompleted: true };
    const brands = await User.find(query).select("brand").limit(10);

    const brandData = brands.map((brand) => {
      return {
        name: brand.brand.companyName,
        image: brand.brand.companyLogo,
      };
    });

    return NextResponse.json({ data: brandData }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
