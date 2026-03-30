import createClient from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Handles a POST request to initiate Google OAuth flow with a given user role.
 * Generates a secure state token, stores the role temporarily in MongoDB, and
 * returns the Google OAuth URL for redirection.
 *
 * @param {Request} request - The incoming request object
 * @returns {NextResponse} - A JSON response with the OAuth URL or error message
 */

export async function GET(request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const role = searchParams.get("role");
  const redirectTo = `${process.env.NEXTAUTH_URL}/api/auth/callback${
    role ? `?role=${encodeURIComponent(role)}` : ""
  }`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      ...(role ? { queryParams: { role } } : {}), // Pass role only if provided
    },
  });

  if (error) {
    console.error("Error initiating OAuth:", error.message);
    return NextResponse.redirect(new URL("/error", request.url));
  }

  return NextResponse.redirect(new URL(data.url));
}
