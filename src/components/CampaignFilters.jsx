"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

const Select = dynamic(
  () => import("react-select").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full p-2 border border-gray-300 rounded-md h-[38px] bg-gray-100" />
    ),
  }
);

const CampaignFilters = () => {
  const t = useTranslations("MarketPlace");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [brandInput, setBrandInput] = useState("");
  const [filters, setFilters] = useState({
    type: "all",
    isOngoing: null,
    minFollowers: "",
    maxFollowers: "",
    brandName: "",
    contentType: "",
    platforms: [],
    category: [], // Array for multi-select categories
  });

  // Category options for react-select
  const categoryOptions = [
    { value: "Apparel", label: t("campaignFilters.category.Apparel") },
    { value: "Technology", label: t("campaignFilters.category.Technology") },
    { value: "Nutrition", label: t("campaignFilters.category.Nutrition") },
    { value: "Wellness", label: t("campaignFilters.category.Wellness") },
    { value: "Footwear", label: t("campaignFilters.category.Footwear") },
    { value: "Services", label: t("campaignFilters.category.Services") },
    {
      value: "Media & Content",
      label: t("campaignFilters.category.Media-Content"),
    },
    {
      value: "Outdoor & Adventure Gear",
      label: t("campaignFilters.category.Outdoor-Adventure-Gear"),
    },
    {
      value: "Events & Experiences",
      label: t("campaignFilters.category.Events-Experiences"),
    },
    {
      value: "Accessories & Equipment",
      label: t("campaignFilters.category.Accessories-Equipment"),
    },
    { value: "Other", label: t("campaignFilters.category.Other") },
  ];

  // Get current tab from URL
  const currentTab = searchParams.get("tab") || "sports";

  useEffect(() => {
    setBrandInput(filters.brandName);
  }, [filters.brandName]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.brandName !== brandInput) {
        const newFilters = { ...filters, brandName: brandInput };
        setFilters(newFilters);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [brandInput]);

  // Initialize filters from URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    setFilters({
      type: params.get("type") || "all",
      isOngoing: params.get("isOngoing"),
      minFollowers: params.get("minFollowers") || "",
      maxFollowers: params.get("maxFollowers") || "",
      brandName: params.get("brandName") || "",
      contentType: params.get("contentType") || "",
      platforms: params.get("platforms")?.split(",").filter(Boolean) || [],
      category: params.get("category")?.split(",").filter(Boolean) || [], // Split and filter out empty strings
    });
  }, [searchParams]);

  const updateUrl = (newFilters) => {
    const params = new URLSearchParams();
    params.set("page", "1");
    // Removed legacy 'tab' param to avoid cleanup redirects in AllSports

    if (newFilters.type !== "all") params.set("type", newFilters.type);
    if (newFilters.isOngoing !== null)
      params.set("isOngoing", newFilters.isOngoing);
    if (newFilters.minFollowers)
      params.set("minFollowers", newFilters.minFollowers);
    if (newFilters.maxFollowers)
      params.set("maxFollowers", newFilters.maxFollowers);
    if (newFilters.brandName) params.set("brandName", newFilters.brandName);
    if (newFilters.platforms.length > 0)
      params.set("platforms", newFilters.platforms.join(","));
    if (newFilters.category.length > 0)
      params.set("category", newFilters.category.join(",")); // Join categories with comma

    router.push(`/marketplace?${params.toString()}`, { scroll: false });
  };

  const handleFilterChange = (name, value) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
  };

  const togglePlatform = (platform) => {
    const newPlatforms = filters.platforms.includes(platform)
      ? filters.platforms.filter((p) => p !== platform)
      : [...filters.platforms, platform];
    handleFilterChange("platforms", newPlatforms);
  };

  const handleCategoryChange = (selectedOptions) => {
    const newCategories = selectedOptions
      ? selectedOptions.map((option) => option.value)
      : [];
    handleFilterChange("category", newCategories);
  };

  const handleBrandChange = (e) => {
    setBrandInput(e.target.value);
  };

  // Clear functions for each filter section
  const clearCampaignType = () => handleFilterChange("type", "all");
  const clearStatus = () => handleFilterChange("isOngoing", null);
  const clearFollowerRange = () => {
    const newFilters = { ...filters, minFollowers: "", maxFollowers: "" };
    setFilters(newFilters);
  };
  const clearCategory = () => handleFilterChange("category", []);
  const clearBrandName = () => {
    setBrandInput("");
    handleFilterChange("brandName", "");
  };
  const clearContentType = () => handleFilterChange("contentType", "");
  const clearPlatforms = () => handleFilterChange("platforms", []);

  // Helper function to check if a section has active filters
  const hasActiveFilters = (section) => {
    switch (section) {
      case "type":
        return filters.type !== "all";
      case "status":
        return filters.isOngoing !== null;
      case "followers":
        return filters.minFollowers || filters.maxFollowers;
      case "brand":
        return filters.brandName !== "";
      case "content":
        return filters.contentType !== "";
      case "platforms":
        return filters.platforms.length > 0;
      case "category":
        return filters.category.length > 0;
      default:
        return false;
    }
  };

  // Get selected category options for react-select
  const selectedCategoryOptions = categoryOptions.filter((option) =>
    filters.category.includes(option.value)
  );

  // Clear all campaign filters and immediately update the URL
  const applyClearedCampaignFilters = () => {
    const resetFilters = {
      type: "all",
      isOngoing: null,
      minFollowers: "",
      maxFollowers: "",
      brandName: "",
      contentType: "",
      platforms: [],
      category: [],
    };
    setFilters(resetFilters);
    updateUrl(resetFilters);
  };

  return (
    <div className="your-scroll-container w-full lg:w-72 p-1 sm:p-6 bg-white sticky top-0 lg:h-full h-[97vh] max-lg:overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-normal leading-[22px]">{t("filters")}</h2>
      </div>
      {/* Offer Type removed */}
      {/* Campaign Type */}
      {/* <div className="mb-6">
        <div className="flex justify-between items-center mb-5">
          <h4 className="text-[18px] font-bold leading-6 text-[#000000]">
            Campaign Type
          </h4>
          {hasActiveFilters("type") && (
            <button
              onClick={clearCampaignType}
              className="text-base font-normal leading-6"
            >
              Clear
            </button>
          )}
        </div>
        <div className="space-y-2 border-b-1 border-[#DADAD9] pb-5">
          {["all", "public", "private", "apply"].map((type) => (
            <button
              key={type}
              onClick={() => handleFilterChange("type", type)}
              className={`w-full text-left px-3 py-2 rounded-md text-base font-normal ${
                filters.type === type
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-[#0C0D06] hover:bg-gray-50"
              }`}
            >
              {type === "all"
                ? "All Campaigns"
                : `${type.charAt(0).toUpperCase() + type.slice(1)} Campaigns`}
            </button>
          ))}
        </div>
      </div> */}
      {/* Ongoing Status */}
      {/* <div className="mb-6">
        <div className="flex justify-between items-center mb-5">
          <h4 className="text-[18px] font-bold leading-6 text-[#0C0D06]">
            Status
          </h4>
          {hasActiveFilters("status") && (
            <button
              onClick={clearStatus}
              className="text-base font-normal leading-6"
            >
              Clear
            </button>
          )}
        </div>
        <div className="space-y-2 border-b-1 border-[#DADAD9] pb-5">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={filters.isOngoing === "true"}
              onChange={(e) =>
                handleFilterChange(
                  "isOngoing",
                  e.target.checked ? "true" : null
                )
              }
              className="size-4.5 ml-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-base font-normal leading-6">
              Ongoing Only
            </span>
          </label>
        </div>
      </div> */}
      {/* Follower Range */}
      {/* <div className="mb-6">
        <div className="flex justify-between items-center mb-5">
          <h4 className="text-[18px] font-bold leading-6 text-[#0C0D06]">
            Follower Range
          </h4>
          {hasActiveFilters("followers") && (
            <button
              onClick={clearFollowerRange}
              className="text-base font-normal leading-6"
            >
              Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 border-b-1 border-[#DADAD9] pb-5">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min</label>
            <input
              type="number"
              value={filters.minFollowers}
              onChange={(e) =>
                handleFilterChange("minFollowers", e.target.value)
              }
              placeholder="2000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max</label>
            <input
              type="number"
              value={filters.maxFollowers}
              onChange={(e) =>
                handleFilterChange("maxFollowers", e.target.value)
              }
              placeholder="10000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      </div> */}
      {/* Brand Name */}
      <div className="mb-6 border-b border-[#DADAD9] pb-5 pt-5">
        <div className="flex justify-between items-center mb-5">
          <h4 className="text-[18px] font-bold leading-6 text-[#0C0D06]">
            {t("campaignFilters.two")}
          </h4>
          {hasActiveFilters("brand") && (
            <button
              onClick={clearBrandName}
              className="text-base font-normal leading-6"
            >
              {t("clear")}
            </button>
          )}
        </div>
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 18C11.775 17.9996 13.4988 17.4054 14.897 16.312L19.293 20.708L20.707 19.294L16.311 14.898C17.405 13.4997 17.9996 11.7754 18 10C18 5.589 14.411 2 10 2C5.589 2 2 5.589 2 10C2 14.411 5.589 18 10 18ZM10 4C13.309 4 16 6.691 16 10C16 13.309 13.309 16 10 16C6.691 16 4 13.309 4 10C4 6.691 6.691 4 10 4Z"
                fill="#0C0D06"
              />
            </svg>
          </span>
          <input
            type="text"
            value={brandInput}
            onChange={handleBrandChange}
            placeholder={t("keyword")}
            className="searchBrand w-full !pl-10 !pr-3 py-2 border border-[#0C0D06] rounded-[12px] text-sm"
          />
        </div>
      </div>
      {/* Category */}
      <div className="mb-6 border-b-1 border-[#DADAD9] pb-5 pt-5">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-[18px] font-bold leading-6 text-[#0C0D06]">
            {t("campaignFilters.three")}
          </h4>
          {hasActiveFilters("category") && (
            <button
              onClick={clearCategory}
              className="text-base font-normal leading-6"
            >
              {t("clear")}
            </button>
          )}
        </div>
        <Select
          isMulti
          options={categoryOptions}
          value={selectedCategoryOptions}
          onChange={handleCategoryChange}
          placeholder={t("placeholder")}
          className="basic-multi-select"
          classNamePrefix="select"
          menuPortalTarget={typeof window !== "undefined" ? document.body : null}
          styles={{
            control: (provided) => ({
              ...provided,
              borderColor: "#0C0D06",
              borderRadius: "12px",
              padding: "2px",
            }),
            multiValue: (provided) => ({
              ...provided,
              backgroundColor: "#E0E7FF",
            }),
            multiValueLabel: (provided) => ({
              ...provided,
              color: "#4338CA",
            }),
            multiValueRemove: (provided) => ({
              ...provided,
              color: "#4338CA",
              ":hover": {
                backgroundColor: "#C7D2FE",
                color: "#312E81",
              },
            }),
            menuPortal: (provided) => ({
              ...provided,
              zIndex: 9999,
            }),
          }}
        />
      </div>
      {/* Content Type */}
      {/* <div className="mb-6 border-b-1 border-[#DADAD9] pb-5">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-[18px] font-bold leading-6 text-[#0C0D06]">
            Content Type
          </h4>
          {hasActiveFilters("content") && (
            <button
              onClick={clearContentType}
              className="text-base font-normal leading-6"
            >
              Clear
            </button>
          )}
        </div>
        <div className="space-y-2">
          {["lifestyle", "fitness", "fashion", "beauty", "tech", "gaming"].map(
            (type) => (
              <button
                key={type}
                onClick={() => handleFilterChange("contentType", type)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  filters.contentType === type
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-[#0C0D06] hover:bg-gray-50"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            )
          )}
        </div>
      </div> */}
      {/* Platforms */}
      {/* <div className="mb-6 border-b-1 border-[#DADAD9] pb-5">
        <div className="flex justify-between items-center mb-5">
          <h4 className="text-[18px] font-bold leading-6 text-[#0C0D06]">
            Platforms
          </h4>
          {hasActiveFilters("platforms") && (
            <button
              onClick={clearPlatforms}
              className="text-base font-normal leading-6"
            >
              Clear
            </button>
          )}
        </div>
        <div className="space-y-2">
          {["instagram", "youtube", "tiktok", "twitter", "facebook"].map(
            (platform) => (
              <label key={platform} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filters.platforms.includes(platform)}
                  onChange={() => togglePlatform(platform)}
                  className="size-4.5 ml-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-base font-normal leading-6 text-[#0C0D06]">
                  {platform}
                </span>
              </label>
            )
          )}
        </div>
      </div> */}
      {/* Footer actions */}
      <div className="mt-6 pt-4 border-[#DADAD9] flex gap-3">
        <button
          onClick={applyClearedCampaignFilters}
          className="flex-1 border border-[#0C0D06] text-sm rounded-[12px] py-2 text-[#0C0D06]"
        >
          {t("allClear")}
        </button>
        <button
          onClick={() => updateUrl(filters)}
          className="flex-1 bg-(--reddishPurple) text-white text-sm rounded-[12px] py-2 "
        >
          {t("showResults") || "Show Results"}
        </button>
      </div>
    </div>
  );
};

export default CampaignFilters;
