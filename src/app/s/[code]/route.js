import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ShortLink from "@/models/ShortLink";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { code } = await params;
    console.log("[s/redirect] Looking up code:", code);
    const shortLink = await ShortLink.findOne({ code }).lean();

    if (!shortLink) {
      console.warn("[s/redirect] Code not found:", code);
      return NextResponse.json({ message: "Link not found" }, { status: 404 });
    }

    console.log("[s/redirect] Redirecting to:", shortLink.longUrl);
    return NextResponse.redirect(shortLink.longUrl, { status: 302 });
  } catch (error) {
    console.error("Short link redirect error:", error.message);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
