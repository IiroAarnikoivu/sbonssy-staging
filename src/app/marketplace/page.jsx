import { Suspense } from "react";
import AllSports from "@/components/AllSports";
import ScrollLock from "@/components/ScrollLock";
import SportsFilters from "@/components/SportsFilter";
import { getTranslations, getLocale } from "next-intl/server";
import AnimatedSection from "@/components/Common/AnimatedSection";

export async function generateMetadata() {
  const locale = await getLocale();

  if (locale === "fi") {
    return {
      title:
        "Kauppapaikka | Löydä urheilulähettiläät ja tue suosikkejasi | sbonssy",
      description:
        "Selaa urheilijoita, vaikuttajia ja joukkueita eri lajeista. Löydä lähettiläät, tutustu profiileihin ja tue suosikkejasi ostamalla kuten ennenkin.",
      openGraph: {
        title:
          "Kauppapaikka | Löydä urheilulähettiläät ja tue suosikkejasi | sbonssy",
        description:
          "Tutustu sbonssyn kauppapaikkaan — kasvava yhteisö urheilulähettiläitä, urheilijoita ja vaikuttajia. Selaa profiileita, löydä suosituksia ja tue suosikkejasi ostamalla brändeiltä, joihin he itse luottavat. Aitoa tukea, helposti.",
      },
    };
  }

  return {
    title:
      "Marketplace | Discover Sport Ambassadors & Support Your Favorites | sbonssy",
    description:
      "Explore athletes, creators, and teams across every sport. Discover ambassadors, browse profiles, and support your favorites through meaningful purchases.",
    openGraph: {
      title:
        "Marketplace | Discover Sport Ambassadors & Support Your Favorites | sbonssy",
      description:
        "Explore the sbonssy marketplace — a growing community of sport ambassadors, athletes, creators, and teams. Browse profiles, discover recommendations, and support your favorites by shopping through the brands they trust. Real people, real impact.",
    },
  };
}

// ─── Skeleton shown while data loads ────────────────────────────────────────
const AmbassadorsGridSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-[6px] p-5 lg:p-6">
    {Array.from({ length: 20 }).map((_, i) => (
      <div key={i} className="w-full aspect-square bg-gray-200 animate-pulse rounded" />
    ))}
  </div>
);

// ─── Async Server Component: fetches data, streams in when ready ─────────────
const AmbassadorsGrid = async ({ params }) => {
  const limit = 40;
  const page = parseInt(params.page || "1", 10);
  const searchQuery = params.search || "";

  const commonQueryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(params.sort && { sort: params.sort }),
    ...(params.season && { season: params.season }),
    ...(params.sport && { sport: params.sport }),
    ...(params.level && { level: params.level }),
    ...(params.gender && { gender: params.gender }),
    ...(params.interests && { interests: params.interests }),
    ...(params.subRole && { subRole: params.subRole }),
    ...(searchQuery && { search: searchQuery }),
  });

  let sportsData = { data: [], total: 0 };

  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL}/api/all-sports?${commonQueryParams.toString()}`,
      { next: { revalidate: 60 } }
    );
    if (res.ok) {
      sportsData = await res.json();
    }
  } catch (error) {
    console.error("Error fetching marketplace data:", error);
  }

  return (
    <div className="flex-1 p-5 lg:p-6">
      <AllSports
        ambassadors={sportsData.data}
        total={sportsData.total}
        currentPage={page}
        limit={limit}
        currentSort={params.sort || ""}
        currentFilters={params}
      />
    </div>
  );
};

// ─── Page Shell: renders instantly, streams the grid ────────────────────────
const MarketplacePage = async ({ searchParams }) => {
  const t = await getTranslations("MarketPlace");
  const params = await searchParams;

  const showFilters = params.showFilters === "true";

  return (
    <div className="flex flex-col pt-10 lg:pt-10">
      <ScrollLock isLocked={showFilters} />

      {/* Header — visible immediately */}
      <AnimatedSection effect="fade-up" threshold={0}>
        <div className="mb-3.5 lg:mb-6 md:mb-2 sm:mb-6">
          <h1 className="text-[22px] md:text-[28px] lg:text-[32px] font-normal text-center">
            {t("headings.one")}
          </h1>
        </div>
      </AnimatedSection>

      {/* Filters — visible immediately, no delay */}
      <AnimatedSection effect="slide-right" delay={0} threshold={0} className="overflow-visible">
        <div className="px-5 lg:px-6 overflow-visible">
          <SportsFilters currentFilters={params} variant="bar" />
        </div>
      </AnimatedSection>

      {/* Grid — streams in when DB responds; shows skeleton first */}
      <div className="flex relative">
        <Suspense fallback={<AmbassadorsGridSkeleton />}>
          <AmbassadorsGrid params={params} />
        </Suspense>
      </div>
    </div>
  );
};

export default MarketplacePage;
