// components/AllCampaigns.js
"use client";
import Pagination from "@/components/Pagination/pagination";
import api from "@/lib/axios";
import { toCamelCase } from "@/lib/helper";
import { useAuthStore } from "@/store/authStore";
import { buildAmbassadorSlug } from "@/util/buildAmbassadorSlug";
import IconsLibrary from "@/util/IconsLibrary";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const getStatusColor = (status) => {
  const statusMap = {
    active: "bg-green-100 text-green-800",
    draft: "bg-gray-100 text-gray-800",
    paused: "bg-yellow-100 text-yellow-800",
    completed: "bg-blue-100 text-blue-800",
    archived: "bg-purple-100 text-purple-800",
  };
  return statusMap[status] || "bg-gray-100 text-gray-800";
};

const AmbassadorModal = ({ ambassadors, onClose, link }) => {
  const t = useTranslations("MarketPlace");
  const [searchQuery, setSearchQuery] = useState("");
  const modalRef = useRef(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);

    // Clean up event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);
  // Filter ambassadors based on search query
  const filteredAmbassadors = ambassadors?.filter((ambassador) => {
    const subRole = toCamelCase(ambassador?.subRole);
    const name = ambassador?.[subRole]?.name?.toLowerCase();
    return name?.includes(searchQuery.toLowerCase());
  });
  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">{t("campaigns.select")}</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <IconsLibrary name="close" size={24} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder={t("campaigns.searchPlaceholder")}
                className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <IconsLibrary name="search" size={20} />
              </div>
            </div>
          </div>

          {filteredAmbassadors?.length > 0 ? (
            <div className="space-y-4">
              {filteredAmbassadors.map((ambassador) => {
                const subRole = toCamelCase(ambassador?.subRole);
                const name = ambassador?.[subRole]?.name;
                const image = ambassador?.[subRole]?.images[0]?.url;
                const slug = buildAmbassadorSlug({
                  subRole: ambassador?.subRole,
                  athlete: ambassador?.athlete,
                  team: ambassador?.team,
                  influencer: ambassador?.influencer,
                  coach: ambassador?.coach,
                  exAthlete: ambassador?.exAthlete,
                  paraAthlete: ambassador?.paraAthlete,
                });
                return (
                  <Link
                    // href={`/ambassador/${slug}`}
                    href={link}
                    target={"_blank"}
                    key={ambassador?._id}
                    className="flex items-center p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 overflow-hidden relative">
                      {image && (
                        <Image
                          src={image}
                          alt={name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {name}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <IconsLibrary
                name="user"
                size={48}
                className="mx-auto text-gray-400"
              />
              <p className="mt-4 text-gray-500">
                {searchQuery
                  ? t("campaigns.fallbackText")
                  : t("campaigns.fallbackText")}
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              {t("campaigns.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CampaignCard = ({ campaign, user, favourites, handleFavourites }) => {
  const t = useTranslations("MarketPlace");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const title = campaign?.basics?.title;
  const logo = campaign?.assets?.logos[0]?.url;
  const brandName = campaign?.brandId?.brand?.companyName || "Unknown Brand";
  const ambassadors = campaign?.ambassadors;

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };
  // const isFavorite = favourites.some(
  //   (fav) => fav.campaignId?._id === campaign._id
  // );
  const checkIsFavorite = (favourites = [], campaign, user, item) => {
    if (!campaign && !item) return false;

    if (Array.isArray(favourites) && favourites.length > 0) {
      const isAmbassadorFavorite = favourites.some(
        (fav) => fav?.campaignId?._id === campaign?._id
      );

      if (user?.role === "fan") {
        return (
          favourites.some(
            (fav) =>
              fav?.ambassadorId?._id === item?._id ||
              fav?.campaignId?._id === item?._id
          ) || isAmbassadorFavorite
        );
      }

      return isAmbassadorFavorite;
    }

    return false;
  };

  const isFavorite = checkIsFavorite(favourites, campaign, user, campaign);

  return (
    <div className="">
      <div className="">
        {logo && (
          <div className="relative">
            {user && user?.role !== "brand" ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (!user) {
                    alert("Please log in to add this to favorites");
                  } else if (user.role !== "brand") {
                    handleFavourites(campaign?._id);
                  }
                }}
                className={`absolute top-2 right-2 z-4  text-2xl ${
                  isFavorite ? "text-blue-200" : "text-black"
                } `}
              >
                {isFavorite ? (
                  <IconsLibrary name={"star_mp_filled"} />
                ) : (
                  <IconsLibrary name={"star_mp"} />
                )}
              </button>
            ) : null}
            <div className="w-full aspect-square relative cursor-pointer" onClick={openModal}>
              <Image
                src={logo}
                alt={brandName}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 300px"
                className="rounded-2xl object-cover border border-gray-200"
                loading="lazy"
              />
            </div>
          </div>
        )}
        <div className="">
          <h3 className="text-[18px] text-center font-normal leading-6 text-[#0C0D06] mt-4 truncate max-w-[280px] mx-auto">
            {brandName}
          </h3>
        </div>
      </div>

      {isModalOpen && (
        <AmbassadorModal
          ambassadors={ambassadors}
          link={campaign?.compensation?.affiliateLinkDestination}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

const AllCampaigns = ({
  campaigns = [],
  total,
  currentPage,
  limit,
  currentType,
  currentSort,
}) => {
  const { user } = useAuthStore();
  const t = useTranslations("MarketPlace");
  const router = useRouter();
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [favourites, setFavourites] = useState([]);

  // Fetch favourites only when a valid role is available
  useEffect(() => {
    if (!user || !user.role) return;
    getFavourites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const dropdownRef = useRef(null); // Create a ref for the dropdown

  const handleFavourites = async (id) => {
    try {
      const type = "campaign";
      const resp = await api.post("/favourites", { id, type });
      if (resp?.success) {
        getFavourites();
      }
    } catch (err) {
      console.error("Error updating favourites:", err);
    }
  };
  const getFavourites = async () => {
    try {
      const favData = await api.get("/favourites");

      let next = [];
      if (user?.role === "brand") {
        next = favData?.data ?? [];
      } else if (user?.role === "sports-ambassador") {
        next = favData?.data?.data ?? [];
      } else {
        next = favData?.data?.campaign?.data ?? [];
      }

      // Only update state if changed to avoid unnecessary re-renders
      const prev = favourites || [];
      const changed =
        prev.length !== next.length ||
        JSON.stringify(prev.map((i) => i?._id || i?.campaignId?._id || i)) !==
          JSON.stringify(next.map((i) => i?._id || i?.campaignId?._id || i));

      if (changed) setFavourites(next);
    } catch (err) {
      console.error("Error fetching favourites:", err);
    }
  };

  const pageCount = Math.ceil(total / limit);

  const handlePageChange = (selectedPage) => {
    router.push(
      `/marketplace?page=${selectedPage}&type=${currentType}&sort=${
        currentSort || ""
      }`
    );
  };

  const handleSortChange = (sortValue) => {
    setIsSortOpen(false);
    router.push(`/marketplace?page=1&type=${currentType}&sort=${sortValue}`);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsSortOpen(false);
      }
    };

    // Add event listener when dropdown is open
    if (isSortOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Clean up event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSortOpen]);

  // Sort options with labels
  const sortOptions = [
    { value: "createdAt-desc", label: t("campaigns.sort.latest") },
    { value: "createdAt-asc", label: t("campaigns.sort.oldest") },
    { value: "brandName-asc", label: t("campaigns.sort.nameAZ") },
    { value: "brandName-desc", label: t("campaigns.sort.nameZA") },
  ];

  // Get current sort label
  const currentSortLabel = currentSort
    ? sortOptions.find((option) => option.value === currentSort)?.label ||
      t("campaigns.sort.latest")
    : t("campaigns.sort.latest");

  return (
    <div className="mx-auto lg:px-[40px] px-0 lg:py-0 py:0">
      {/* Sort Dropdown */}
      <div className="relative flex items-center justify-end mb-8 md:mb-11 xl:mb-[72px] z-10 ml-auto  max-w-[210px] md:max-w-full w-fit">
        <button
          onClick={() => setIsSortOpen(!isSortOpen)}
          className="inline-flex items-center text-base text-right  font-normal text-[#000000] bg-white gap-2 cursor-pointer"
        >
          {t("campaigns.sort.heading")}: {currentSortLabel}
          <IconsLibrary name="dropdownSelect" />
        </button>

        {isSortOpen && (
          <div
            ref={dropdownRef}
            className="origin-top-right absolute right-0 top-8 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
          >
            <div className="py-1">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className={`block w-full text-left px-4 py-2 text-sm ${
                    currentSort === option.value
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {campaigns?.length === 0 ? (
        <div className="text-center py:0px sm:py-6 lg:py-16 bg-gray-50 rounded-xl">
          <p className="text-xl text-gray-500">
            {t("campaigns.no")} {currentType !== "all" ? currentType : ""}{" "}
            {t("campaigns.found")}
          </p>
          <p className="text-gray-400 mt-2">
            {currentType !== "all"
              ? t("campaigns.text1")
              : t("campaigns.text2")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-x-[32px] gap-y-[30px] md:gap-y-[70px]">
          {campaigns?.map((campaign) => (
            <CampaignCard
              key={campaign._id}
              campaign={campaign}
              user={user}
              handleFavourites={handleFavourites}
              favourites={favourites}
            />
          ))}
        </div>
      )}
      <div className="mt-8">
        <Pagination
          currentPage={currentPage}
          pageCount={pageCount}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
};

export default AllCampaigns;
