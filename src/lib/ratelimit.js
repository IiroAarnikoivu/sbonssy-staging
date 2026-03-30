import rateLimit from "express-rate-limit";
import { NextResponse } from "next/server";

export default function createRateLimit({ windowMs, max }) {
  return rateLimit({
    windowMs, // Time window in milliseconds
    max, // Max number of requests allowed in window
    keyGenerator: (req) => {
      // Use client IP as the key for rate limiting
      return req.headers.get("x-forwarded-for") || req.ip || "unknown";
    },
    handler: (req, res) => {
      // Return a JSON response when limit is exceeded
      return NextResponse.json(
        { message: "Too many requests, please try again later" },
        { status: 429 }
      );
    },
    skip: () => {
      // Optionally skip rate limiting in development
      return process.env.NODE_ENV === "development";
    },
  });
}
