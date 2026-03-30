"use client";
import Pagination from "@/components/Pagination/pagination";
import api from "@/lib/axios";
import { toCamelCase, winterSports, summerSports } from "@/lib/helper";
import { useAuthStore } from "@/store/authStore";
import IconsLibrary from "@/util/IconsLibrary";
import { buildAmbassadorSlug } from "@/util/buildAmbassadorSlug";
import { resolveAmbassadorSlug } from "@/util/resolveAmbassadorSlug";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useSportsTranslations from "@/hook/useSportsTranslations";
import NextImage from "next/image";

export const SelectSort = ({
  activeSort,
  sortOptions,
  isSortOpen,
  setIsSortOpen,
  handleSortChange,
  dropdownRef,
}) => {
  const t = useTranslations("MarketPlace");
  const buttonRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isSortOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right + window.scrollX,
      });
    }
  }, [isSortOpen]);

  const currentSortLabel =
    sortOptions.find((option) => option.value === activeSort)?.label ||
    t("sports.sort.latest");

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsSortOpen(!isSortOpen)}
        className="inline-flex items-center text-base font-normal text-[#000000] bg-white gap-2 cursor-pointer"
      >
        {currentSortLabel}
        <IconsLibrary name="dropdownSelect" />
      </button>
      {isSortOpen && isMounted && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-[9999]"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
          }}
        >
          <div className="py-1">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSortChange(option.value)}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  activeSort === option.value
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// Function to get sport color based on sport name
const getSportColor = (sports) => {
  const sportColors = {
    football: "bg-orange-100 text-orange-800",
    basketball: "bg-blue-100 text-blue-800",
    tennis: "bg-green-100 text-green-800",
    cricket: "bg-red-100 text-red-800",
    swimming: "bg-cyan-100 text-cyan-800",
    default: "bg-gray-100 text-gray-800",
  };

  return (Array.isArray(sports) ? sports : [sports]).map(
    (sport) => sportColors[sport?.toLowerCase()] || sportColors.default
  );
};

// Main AllSports component
const AllSports = ({
  ambassadors = [],
  total = 0,
  currentPage = 1,
  limit = 10,
  currentSort,
  currentFilters,
}) => {
  const t = useTranslations("MarketPlace");
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSeason = searchParams.get("season") || "";
  const [isSortOpen, setIsSortOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const pageCount = Math.ceil(total / limit);
  const [favourites, setFavourites] = useState([]);
  const { user } = useAuthStore();
  const [activeCardId, setActiveCardId] = useState(null);

  // Clean up legacy `tab` query param on initial render
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.has("tab")) {
      params.delete("tab");
      router.replace(`/marketplace?${params.toString()}`);
    }
    // We intentionally depend on searchParams to react to the first render URL
  }, [searchParams, router]);

  // Handle page change for pagination
  const handlePageChange = (selectedPage) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tab");
    params.set("page", selectedPage.toString());
    router.push(`/marketplace?${params.toString()}`);
  };

  // Get sort from URL or default to empty (show All Sports)
  const activeSort = searchParams.get("sort") || "";

  // Sort options: All Sports (default), Latest, Oldest, Name (A-Z), Name (Z-A)
  const sortOptions = [
    { value: "", label: t("sports.sort.heading") }, // All Sports
    { value: "createdAt-desc", label: t("sports.sort.latest") },
    { value: "createdAt-asc", label: t("sports.sort.oldest") },
    { value: "name-asc", label: t("sports.sort.nameAsc") },
    { value: "name-desc", label: t("sports.sort.nameDesc") },
  ];

  useEffect(() => {
    (async () => {
      try {
        const favData = await api.get("/favourites");
        if (user?.role === "brand") {
          setFavourites(favData?.data);
        } else if (user?.role === "sports-ambassador") {
          setFavourites(favData?.data?.data);
        } else {
          setFavourites(favData?.data?.ambassador?.data);
        }
      } catch (err) {
        setFavourites([]);
      }
    })();
  }, [user?.role]);

  // Get the current sort label
  const currentSortLabel =
    sortOptions.find((option) => option.value === activeSort)?.label ||
    t("sports.sort.latest");

  // Handle sort change
  const handleSortChange = (sortValue) => {
    setIsSortOpen(false);
    const params = new URLSearchParams(searchParams.toString());

    if (sortValue) {
      params.set("sort", sortValue);
    } else {
      params.delete("sort");
    }

    params.delete("tab");
    // Do not force page=1 in URL; only add page when user clicks pagination
    params.delete("page");
    router.push(`/marketplace?${params.toString()}`);
  };

  // Handle filter toggle
  const handleFilters = () => {
    setIsOpen(!isOpen);
    const params = new URLSearchParams(searchParams.toString());
    // params.set("tab", "sports");
    params.delete("tab");
    // Do not force page=1 in URL when toggling filters
    params.delete("page");
    params.set("limit", "10");
    params.set("filter", isOpen ? "false" : "true");
    router.push(`/marketplace?${params.toString()}`);
  };

  const handleViewClick = async (ambassador) => {
    const slug = await resolveAmbassadorSlug(ambassador);
    if (slug) {
      router.push(`/ambassador/${slug}`);
    } else {
      router.push(
        `/sports-ambassador-profile/${ambassador.subRole}/${ambassador.supabaseId}`
      );
    }
  };

  const handleFavourites = async (id) => {
    const type = "ambassador";
    const resp = await api.post("/favourites", { id, type });
    if (resp?.success) {
      const favData = await api.get("/favourites");
      if (user?.role === "brand") {
        setFavourites(favData?.data);
      } else if (user?.role === "sports-ambassador") {
        setFavourites(favData?.data?.data);
      } else {
        setFavourites(favData?.data?.ambassador?.data);
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsSortOpen(false);
      }
    };

    if (isSortOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSortOpen]);

  return (
    <div className="mx-auto lg:mt-0 lg:px-[40px] px-0 lg:py-0 py:0">
      {/* Sort Dropdown */}
      <div className="flex items-center justify-end mb-8 md:mb-11 xl:mb-[72px] ml-auto  max-w-[210px] md:max-w-full w-fit">
        <div className="hidden lg:block">
          <SelectSort
            activeSort={activeSort}
            sortOptions={sortOptions}
            isSortOpen={isSortOpen}
            setIsSortOpen={setIsSortOpen}
            handleSortChange={handleSortChange}
            dropdownRef={dropdownRef}
          />
        </div>
      </div>

      {/* Ambassadors Grid */}
      {ambassadors.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <p className="text-lg text-gray-600">{t("sports.fallbackText")}</p>
          <p className="mt-2 text-gray-500">{t("sports.text")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-[6px]">
          {ambassadors.map((ambassador, index) => (
            <SportsAmbassadorCard
              key={ambassador._id}
              index={index}
              ambassador={ambassador}
              handleViewClick={handleViewClick}
              handleFavourites={handleFavourites}
              favourites={favourites}
              activeSeason={activeSeason}
              activeCardId={activeCardId}
              setActiveCardId={setActiveCardId}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="mt-12">
          <Pagination
            currentPage={currentPage}
            pageCount={pageCount}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

// SportsAmbassadorCard component
const SportsAmbassadorCard = ({
  ambassador,
  handleViewClick,
  handleFavourites,
  favourites,
  activeSeason,
  activeCardId,
  setActiveCardId,
  index,
}) => {
  const t = useTranslations("MarketPlace");
  const t2 = useTranslations();
  const { user } = useAuthStore();
  const router = useRouter();
  const translateSports = useSportsTranslations();
  const subRole = toCamelCase(ambassador?.subRole || "");
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const isInfoVisible = activeCardId === ambassador._id;

  // Detect if device supports touch
  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  const name =
    subRole === "team"
      ? ambassador?.[subRole]?.teamClubName
      : ambassador?.[subRole]?.name || t("sports.fallback.text1");

  const sport =
    ambassador?.[subRole]?.sports?.[0] || t("sports.fallback.text2");

  const goals = ambassador?.[subRole]?.goals || t("sports.fallback.text3");
  const avatar =
    ambassador?.[subRole]?.images?.[0]?.url || "/default-avatar.jpg";
  const socialMedia = ambassador?.[subRole]?.socialMedia || {};

  const primarySport = Array.isArray(sport) ? sport[0] : sport;
  const sportColor = getSportColor(primarySport);

  // Translate sports for display - show only first sport
  const rawSports = ambassador?.[subRole]?.sports || [];

  // Normalize sports to make matching resilient to hyphens/spaces/case
  const normalize = (s) =>
    (s || "")
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");

  const winterNorm = new Set(winterSports.map((s) => normalize(s)));
  const summerNorm = new Set(summerSports.map((s) => normalize(s)));
  let seasonFiltered = rawSports;
  if (activeSeason === "winter") {
    seasonFiltered = rawSports.filter((s) => winterNorm.has(normalize(s)));
  } else if (activeSeason === "summer") {
    seasonFiltered = rawSports.filter((s) => summerNorm.has(normalize(s)));
  }

  const translatedSports = (seasonFiltered.length ? seasonFiltered : rawSports)
    .length
    ? translateSports(seasonFiltered.length ? seasonFiltered : rawSports)
    : [t("sports.fallback.text2")];
  const sportDisplay = Array.isArray(translatedSports)
    ? translatedSports[0]
    : translatedSports;

  const checkIsFavorite = (favourites = [], ambassador, user, item) => {
    if (!ambassador && !item) return false;
    if (!Array.isArray(favourites) || favourites.length === 0) return false;

    const isAmbassadorFavorite = favourites.some(
      (fav) => fav?.ambassadorId?._id === ambassador?._id
    );

    if (user?.role === "fan" && item) {
      const isCampaignFavorite = favourites.some(
        (fav) =>
          fav?.ambassadorId?._id === item?._id ||
          fav?.campaignId?._id === item?._id
      );
      return isAmbassadorFavorite || isCampaignFavorite;
    }

    return isAmbassadorFavorite;
  };

  const isFavorite = checkIsFavorite(favourites, ambassador, user, ambassador);

  // Handle card click
  const handleCardClick = (e) => {
    e.preventDefault();

    // On touch devices: first tap shows info, second tap navigates
    if (isTouchDevice) {
      if (!isInfoVisible) {
        setActiveCardId(ambassador._id);
      } else {
        handleViewClick(ambassador);
      }
    } else {
      // On desktop: click anywhere navigates immediately
      handleViewClick(ambassador);
    }
  };

  // Handle touch outside to hide info box
  useEffect(() => {
    if (!isTouchDevice || !isInfoVisible) return;

    const handleTouchOutside = (e) => {
      // If touch is outside the card, hide the info
      const card = e.target.closest(".ambassador-card");
      if (!card) {
        setActiveCardId(null);
      }
    };

    document.addEventListener("touchstart", handleTouchOutside);
    return () => document.removeEventListener("touchstart", handleTouchOutside);
  }, [isTouchDevice, isInfoVisible, setActiveCardId]);

  // Prefetch ambassador profile
  const prefetchAmbassador = async () => {
    try {
      const slug = await resolveAmbassadorSlug(ambassador);
      if (slug) {
        router.prefetch(`/ambassador/${slug}`);
      } else {
        router.prefetch(
          `/sports-ambassador-profile/${ambassador.subRole}/${ambassador.supabaseId}`
        );
      }
    } catch (err) {
      console.error("Prefetch error:", err);
    }
  };

  return (
    <div
      className="relative group ambassador-card"
      onMouseEnter={prefetchAmbassador}
    >
      {user && user?.role !== "sports-ambassador" ? (
        <button
          onClick={(e) => {
            e.preventDefault();
            if (!user) {
              alert("Please log in to add this to favorites");
            } else if (user.role !== "sports-ambassador") {
              handleFavourites(ambassador?._id);
            }
          }}
          className={`absolute top-2 right-2 z-10 text-2xl ${
            isFavorite ? "text-blue-200" : "text-white drop-shadow"
          } `}
        >
          {isFavorite ? (
            <IconsLibrary name={"star_mp_filled"} />
          ) : (
            <IconsLibrary name={"star_mp"} />
          )}
        </button>
      ) : null}

      <div
        className="relative overflow-hidden cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="w-full aspect-square bg-gray-100 relative">
          <NextImage
            src={avatar}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover"
            loading={index < 8 ? "eager" : "lazy"}
            priority={index < 8}
            unoptimized={avatar === "/default-avatar.jpg"}
          />
        </div>
        <div
          className={`absolute inset-x-0 bottom-0 py-3 px-3 bg-[#FFFFFFAB] w-[calc(100%_-_20px)] lg:w-[calc(100%_-_48px)] transition-opacity duration-200 h-fit lg:mx-6 lg:mb-5 mx-[10px] mb-4 ${
            isInfoVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <div className="text-black">
            <div className="text-sm md:text-base font-medium truncate">
              {name}
            </div>
            <div className="text-xs md:text-sm opacity-90 truncate">
              {subRole === "influencer" ? t("sports.influencer") : sportDisplay}
            </div>

            <div className="flex items-center gap-2 mt-3 text-xs md:text-sm opacity-90 truncate">
              {t("seeProfile")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AllSports;
