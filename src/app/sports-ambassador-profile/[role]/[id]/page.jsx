import AthleteProfile from "@/components/AmbassadorProfile";
import { SocketProvider } from "@/context/SocketContext";
import React from "react";

import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

async function getUserById(id) {
  try {
    await connectDB();
    // id is supabaseId in our system
    const user = await User.findOne({ supabaseId: id }).lean();
    return user || null;
  } catch (_) {
    return null;
  }
}

function toSlug(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default async function Profile({ params }) {
  const { id } = params;
  // Fetch user and compute preferred display name for slug
  const user = await getUserById(id);

  if (user) {
    const subRole = (user.subRole || "").toLowerCase();
    let name = "";
    let trackingKey = "";
    if (subRole === "team") {
      name = user?.team?.teamClubName || user?.team?.name || "";
      trackingKey = user?.team?.tracking_key || "";
    } else if (subRole === "ex-athlete") {
      name = user?.exAthlete?.name || "";
      trackingKey = user?.exAthlete?.tracking_key || "";
    } else if (subRole === "para-athlete") {
      name = user?.paraAthlete?.name || "";
      trackingKey = user?.paraAthlete?.tracking_key || "";
    } else if (subRole === "coach") {
      name = user?.coach?.name || "";
      trackingKey = user?.coach?.tracking_key || "";
    } else if (subRole === "influencer") {
      name = user?.influencer?.name || "";
      trackingKey = user?.influencer?.tracking_key || "";
    } else {
      // default athlete
      name = user?.athlete?.name || "";
      trackingKey = user?.athlete?.tracking_key || "";
    }

    if (name) {
      const slug = toSlug(name);
      const suffix = String(trackingKey).split("_").pop(); // last 8 hex chars
      const disambiguated =
        suffix && /^[0-9a-fA-F]{8}$/.test(suffix) ? `${slug}-${suffix}` : slug;
      redirect(`/ambassador/${disambiguated}`);
    }
  }

  // Fallback: render original (should rarely happen)
  return (
    <SocketProvider>
      <AthleteProfile id={id} subRole={params.role} />
    </SocketProvider>
  );
}
