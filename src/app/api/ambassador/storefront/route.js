import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Storefront API has been removed. Please use profile-based product sharing." },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { message: "Storefront API has been removed. Please use profile-based product sharing." },
    { status: 410 }
  );
}
