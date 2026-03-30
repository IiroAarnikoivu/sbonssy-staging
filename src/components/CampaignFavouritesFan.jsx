"use client";
import api from "@/lib/axios";
import { toCamelCase } from "@/lib/helper";
import { useAuthStore } from "@/store/authStore";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect } from "react";
import Pagination from "./Pagination/pagination";
import FavouriteCardFan from "./FavouriteCardFan";

const CampaignFavouritesFan = ({
  campaigns: initialCampaigns,
  paginationCmg,
}) => {
  const t = useTranslations("MarketPlace");
  const tt = useTranslations("Favourites");
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  // Extract current page from URL or use the one from props
  const currentPage =
    parseInt(searchParams.get("campaignPage")) || paginationCmg?.page || 1;

  // Update campaigns when initialCampaigns changes (from parent)
  useEffect(() => {
    setCampaigns(initialCampaigns);
  }, [initialCampaigns]);

  const handleFavourites = async (id) => {
    try {
      const type = "campaign";
      const resp = await api.post("/favourites", { id, type });
      if (resp?.success) {
        const data = await api.get("/favourites");
        const fanData = data?.data?.data;
        const campaignFavourites = fanData?.filter((item) => item.campaignId);
        setCampaigns(campaignFavourites);
      }
    } catch (err) {
      console.error("Error updating favourites:", err);
    }
  };

  const handlePageChange = async (selectedPage) => {
    const params = new URLSearchParams(window.location.search);
    params.set("campaignPage", selectedPage);
    // Remove other page params to avoid conflicts
    params.delete("page");
    params.delete("ambassadorPage");

    // Force a reload of the data by navigating to the new URL
    router.push(`/fan/favourites?${params.toString()}`);
  };

  const handleViewClick = (item) => {
    router.push(`/campaign-details/${item.campaignId._id}`);
  };

  // If there are no campaigns but we have pagination data, show empty state
  if (campaigns?.length === 0 && paginationCmg?.totalCount > 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium text-gray-700 mb-2">
          {tt("fallbackBrand")}
        </h3>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {campaigns?.map((data) => (
          <FavouriteCardFan
            key={data.campaignId?._id}
            item={data}
            type="campaign"
            onViewClick={handleViewClick}
            onRemoveFavourite={handleFavourites}
          />
        ))}
      </div>

      {paginationCmg && paginationCmg.totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={currentPage}
            pageCount={paginationCmg.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default CampaignFavouritesFan;
