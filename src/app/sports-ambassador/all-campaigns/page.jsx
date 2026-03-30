"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import { RiArrowDropDownLine, RiArrowDropUpLine } from "react-icons/ri";
import Select from "react-select";
import CampaignCarousel from "@/components/Common/SwiperJsCarousel/CampaignCarousel";
import Loader from "@/components/Loader";
import Pagination from "@/components/Pagination/pagination";
import SidebarSports from "@/components/SidebarSports";
import { useCampaigns } from "@/hook/useCampaigns";
import IconsLibrary from "@/util/IconsLibrary";
import DropdownIndicator from "@/components/DropdownIndicator";
import useDebounce from "@/hook/useDebounce";

const AllCampaigns = () => {
  const {
    state,
    fetchCampaigns,
    handleApplyClick,
    handleJoinClick,
    handleCancelClick,
    handleFavourites,
    fetchFavourites,
  } = useCampaigns();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // 500ms delay
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOption, setSortOption] = useState("");
  const [page, setPage] = useState(1);
  const t = useTranslations("Sports.allCampaigns");

  const fetchData = useCallback(() => {
    fetchCampaigns(debouncedSearchTerm, categoryFilter, sortOption, page);
    fetchFavourites();
  }, [
    debouncedSearchTerm,
    categoryFilter,
    sortOption,
    page,
    fetchCampaigns,
    fetchFavourites,
  ]);

  useEffect(() => {
    setPage(1); // Reset to first page when filters change
  }, [debouncedSearchTerm, categoryFilter, sortOption]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  const categoryOptions = [
    { value: "all", label: t("all-campaigns") },
    { value: "public", label: t("public") },
    { value: "apply", label: t("apply") },
  ];

  const sortOptions = [
    { value: "", label: t("sort.one") },
    { value: "newest", label: t("sort.two") },
    { value: "oldest", label: t("sort.three") },
    { value: "ending-soon", label: t("sort.four") },
    { value: "a-z", label: t("sort.five") },
    { value: "z-a", label: t("sort.six") },
  ];

  const selectedCategory = categoryOptions.find(
    (opt) => opt.value === categoryFilter
  );
  const selectedSort = sortOptions.find((opt) => opt.value === sortOption);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader />
      </div>
    );
  }
  const filteredCampaigns = state.campaigns.filter(
    (campaign) => campaign.stateID !== 2
  );
  return (
    <div className="flex flex-col bg-gray-100 min-h-screen">
      <div className="flex flex-1 relative">
        <SidebarSports />

        <div className="flex-1 flex flex-col p-4 pt-8 md:p-6 md:pt-10 overflow-auto">
          <h2 className="text-4xl lg:text-5xl font-bold mb-2">
            {t("heading")}
          </h2>
          <p className="text-lg text-gray-900 mb-6">{t("para")}</p>

          <div className="relative mb-6">
            <span className="absolute inset-y-0 left-3 flex items-center">
              <IconsLibrary name="searchIcon" />
            </span>
            <input
              type="text"
              placeholder={t("placeholder")}
              className="w-full sm:w-1/4 h-12 pl-10 pr-3 bg-gray-100 border border-gray-800 rounded-xl focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between mb-8 gap-4">
            <div className="reactSelectStyling w-fit lg:w-[421px]">
              <Select
                value={selectedCategory}
                onChange={(selected) =>
                  setCategoryFilter(selected?.value || "all")
                }
                options={categoryOptions}
                isSearchable={false}
                components={{ DropdownIndicator }}
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: "#0C0D060D",
                    borderColor: "#0C0D0626",
                    borderRadius: "12px",
                    padding: "8px 12px",
                    boxShadow: "none",
                    minHeight: "40px",
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected
                      ? "#d1d5db"
                      : state.isFocused
                      ? "#e5e7eb"
                      : "white",
                    color: "#0C0D06",
                    cursor: "pointer",
                  }),
                  menu: (base) => ({
                    ...base,
                    borderRadius: "0.5rem",
                    overflow: "hidden",
                  }),
                  indicatorSeparator: () => ({ display: "none" }),
                }}
              />
            </div>

            <div className="flex items-center gap-2 w-fit">
              <span className="text-base text-black text-nowrap">
                {t("sort-by")}
              </span>
              <div className="reactSelectStyling noBorder w-fit lg:w-[120px]">
                <Select
                  value={selectedSort}
                  onChange={(selected) => setSortOption(selected?.value || "")}
                  options={sortOptions}
                  isSearchable={false}
                  components={{ DropdownIndicator }}
                  styles={{
                    control: (base) => ({
                      ...base,
                      backgroundColor: "transparent",
                      borderColor: "transparent",
                      borderRadius: "12px",
                      padding: "8px 12px",
                      boxShadow: "none",
                      minHeight: "40px",
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isFocused ? "#e5e7eb" : "white",
                      color: "#0C0D06",
                      cursor: "pointer",
                    }),
                    menu: (base) => ({
                      ...base,
                      borderRadius: "0.5rem",
                      overflow: "hidden",
                    }),
                  }}
                />
              </div>
            </div>
          </div>
          {state.error && <p className="text-red-500 mb-4">{state.error}</p>}
          {!state.loading && !state.error && state.campaigns.length === 0 && (
            <p className="text-gray-500 text-lg">{t("fallbackText")}</p>
          )}
          {state.campaigns.length > 0 && (
            <CampaignCarousel
              gridLayout
              items={filteredCampaigns}
              type="campaign"
              requestStatuses={state.requestStatuses}
              handleApplyClick={handleApplyClick}
              handleJoinClick={handleJoinClick}
              handleCancelClick={handleCancelClick}
              handleFavourites={handleFavourites}
              favourites={state.favourites}
              allCampaigns={true}
            />
          )}

          {state.pagination.campaigns.totalPages > 1 && (
            <div className="flex justify-center mt-6 gap-2">
              <Pagination
                currentPage={state.pagination.campaigns.currentPage}
                pageCount={state.pagination.campaigns.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllCampaigns;
