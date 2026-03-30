import AthleteProfile from "@/components/AmbassadorProfile";
import { SocketProvider } from "@/context/SocketContext";
import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAmbassadorDataBySlug } from "@/util/getAmbassadorData";
import Loader from "@/components/Loader";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getAmbassadorDataBySlug(slug);
  if (!data) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const title = data?.name ? `${data.name} | Ambassador Profile` : "Ambassador Profile";
  const description = data?.name
    ? `View ${data.name}'s ambassador profile on Sbonssy.`
    : "View ambassador profile on Sbonssy.";
  const avatarUrl = data?.avatar || "";
  const absoluteAvatar = avatarUrl && !/^https?:\/\//i.test(avatarUrl)
    ? `${siteUrl}${avatarUrl.startsWith("/") ? "" : "/"}${avatarUrl}`
    : avatarUrl;
  const images = absoluteAvatar ? [absoluteAvatar] : [];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/ambassador/${encodeURIComponent(slug || "")}`,
      type: "profile",
      images,
    },
    twitter: {
      card: images.length ? "summary_large_image" : "summary",
      title,
      description,
      images,
    },
  };
}

async function AmbassadorProfileContent({ slug }) {
  const data = await getAmbassadorDataBySlug(slug, true);

  if (!data?.supabaseId) {
    notFound();
  }

  // Fetch favorite campaigns on the server in parallel
  let initialCampaigns = [];
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/favorite-campaign?id=${data.supabaseId}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const json = await res.json();
      initialCampaigns = json.data?.data || [];
    }
  } catch (err) {
    console.error("Error fetching initial campaigns:", err);
  }

  return (
    <SocketProvider>
      <AthleteProfile 
        id={data.supabaseId} 
        subRole={data.subRole} 
        initialDetails={data} 
        initialCampaigns={initialCampaigns}
      />
    </SocketProvider>
  );
}

export default async function Page({ params }) {
  const { slug } = await params;
  
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen py-20">
        <Loader />
      </div>
    }>
      <AmbassadorProfileContent slug={slug} />
    </Suspense>
  );
}
