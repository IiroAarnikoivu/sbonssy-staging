"use client";
import api from "@/lib/axios";
import { toCamelCase } from "@/lib/helper";
import { useAuthStore } from "@/store/authStore";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import Pagination from "./Pagination/pagination";
import { buildAmbassadorSlug } from "@/util/buildAmbassadorSlug";
import FavouriteCardFan from "./FavouriteCardFan";

const AmbassadorFavouritesFan = ({
  ambassadors: initialAmbassadors,
  paginationAmb,
}) => {
  const t = useTranslations("Favourites");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [ambassadors, setAmbassadors] = useState(initialAmbassadors);
  const [isLoading, setIsLoading] = useState(false);

  // Get current page from URL or fallback to prop
  const currentPage =
    parseInt(searchParams.get("ambassadorPage")) || paginationAmb?.page || 1;

  // Update state when parent data changes
  useEffect(() => {
    setAmbassadors(initialAmbassadors);
  }, [initialAmbassadors]);

  const handleFavourites = async (id) => {
    try {
      const type = "ambassador";
      const resp = await api.post("/favourites", { id, type });
      if (resp?.success) {
        // Refresh the data after removing favorite
        const params = new URLSearchParams(window.location.search);
        router.push(`/fan/favourites?${params.toString()}`, { scroll: false });
      }
    } catch (err) {
      console.error("Error updating favourites:", err);
    }
  };

  const handlePageChange = (selectedPage) => {
    const params = new URLSearchParams(window.location.search);
    params.set("ambassadorPage", selectedPage);
    // Clear other pagination params
    params.delete("page");
    params.delete("campaignPage");

    // Force full page navigation to trigger data refresh
    router.push(`/fan/favourites?${params.toString()}`, { scroll: false });
  };

  const handleViewClick = (item) => {
    const slug = buildAmbassadorSlug(item.ambassadorId);
    if (slug) {
      router.push(`/ambassador/${slug}`);
    } else {
      router.push(
        `/sports-ambassador-profile/${item.ambassadorId?.subRole}/${item.ambassadorId?.supabaseId}`
      );
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Empty state
  if (ambassadors.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium text-gray-700 mb-2">
          {t("fallbackAmbassador")}
        </h3>
        <p className="text-gray-500 max-w-md mx-auto">{t("fallback2")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {ambassadors.map((data) => (
          <FavouriteCardFan
            key={data.ambassadorId?._id}
            item={data}
            type="ambassador"
            onViewClick={handleViewClick}
            onRemoveFavourite={handleFavourites}
          />
        ))}
      </div>

      {paginationAmb && paginationAmb.totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination
            currentPage={currentPage}
            pageCount={paginationAmb.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default AmbassadorFavouritesFan;
