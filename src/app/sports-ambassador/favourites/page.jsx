"use client";

import Loader from "@/components/Loader";
import api from "@/lib/axios";
import { toCamelCase } from "@/lib/helper";
import { useTranslations } from "next-intl";
import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import SidebarSports from "@/components/SidebarSports";
import Pagination from "@/components/Pagination/pagination";
import Swal from "sweetalert2";
import { useAuthStore } from "@/store/authStore";
import FavouriteCard from "@/components/FavouriteCard";

const Favourites = memo(() => {
  const router = useRouter();
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const t = useTranslations("MarketPlace");
  const tt = useTranslations("Favourites");
  const toastAlert = useTranslations("Sweetalert");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  const limit = 10;
  const { user } = useAuthStore();

  // Memoize processed favourites data
  const processedFavourites = useMemo(() => {
    return favourites.map((data, i) => {
      const item = data?.campaignId;
      const subRole = toCamelCase(item?.subRole || "");
      const name = item?.brandId?.brand?.companyName;
      const image = item?.assets?.logos[0]?.url;
      const sport = item?.[subRole]?.sports?.[0] || t("sports.fallback.text2");
      const goals = item?.[subRole]?.goals || t("sports.fallback.text3");
      const avatar = item?.[subRole]?.images?.[0]?.url || "/default-avatar.jpg";
      const sportDisplay = Array.isArray(sport) ? sport.join(", ") : sport;

      return {
        id: item?._id,
        name,
        image,
        sport,
        goals,
        avatar,
        sportDisplay,
        originalIndex: i,
      };
    });
  }, [favourites, t]);

  const getFavourites = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await api.get(
        `/favourites?page=${currentPage}&limit=${limit}`
      );

      setFavourites(resp?.data?.data || []);

      setPageCount(resp?.data?.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.message || "Failed to fetch favourites");
      console.error("Error fetching favourites:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit]);
  useEffect(() => {
    getFavourites();
  }, [getFavourites]);

  const handleViewClick = useCallback(
    (id) => {
      router.push(`/campaign-details/${id}`);
    },
    [router]
  );

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleFavourites = useCallback(
    async (id) => {
      try {
        Swal.fire({
          title: toastAlert("sure"),
          text: toastAlert("favourites"),
          icon: "warning",
          showCancelButton: true,

          customClass: {
            confirmButton: "confirmButton",
            cancelButton: "cancelButton",
          },
          cancelButtonText: toastAlert("cancel"),
          confirmButtonText: toastAlert("yes"),
        }).then(async (result) => {
          if (result.isConfirmed) {
            const resp = await api.post("/favourites", { id });
            if (resp?.success) {
              getFavourites();
            }

            Swal.fire({
              title: toastAlert("removedFavourites"),
              toast: true,
              position: "top-right",
              showConfirmButton: false,
              timer: 3000,
              icon: "success",
            });
          }
        });
      } catch (err) {
        Swal.fire({
          title: toastAlert("error"),
          toast: true,
          position: "top-right",
          showConfirmButton: false,
          timer: 3000,
          icon: "success",
        });
      }
    },
    [toastAlert, getFavourites]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-lg max-w-md mx-auto mt-8 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-100 min-h-screen">
      <div className="flex flex-1 relative">
        <div className="hidden lg:block h-fit">
          <SidebarSports />
        </div>

        <div className="flex-1 flex flex-col p-4 pt-8 md:p-6 md:pt-10 overflow-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">
            {tt("heading")}
          </h1>

          <div className="">
            {processedFavourites.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {processedFavourites.map((item, i) => (
                  <FavouriteCard
                    key={i}
                    item={item}
                    onViewClick={handleViewClick}
                    onRemoveFavourite={handleFavourites}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-xl font-medium text-gray-700 mb-2">
                  {tt("fallback3")}
                </h3>
              </div>
            )}
          </div>
          {pageCount > 1 && (
            <Pagination
              currentPage={currentPage}
              pageCount={pageCount}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </div>
  );
});

Favourites.displayName = "Favourites";

export default Favourites;
