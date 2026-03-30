"use client";

import Loader from "@/components/Loader";
import api from "@/lib/axios";
import { toCamelCase } from "@/lib/helper";
import { buildAmbassadorSlug } from "@/util/buildAmbassadorSlug";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useTranslations } from "next-intl";
import Pagination from "@/components/Pagination/pagination";
import Swal from "sweetalert2";
import useSportsTranslations from "@/hook/useSportsTranslations";

const Favourites = () => {
  const router = useRouter();
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const t = useTranslations("Favourites");
  const toastAlert = useTranslations("Sweetalert");
  const translateSports = useSportsTranslations();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const limit = 10;
  useEffect(() => {
    getFavourites();
  }, [currentPage]);

  const getFavourites = async () => {
    try {
      setLoading(true);
      const resp = await api.get(
        `/favourites?page=${currentPage}&limit=${limit}`
      );

      setFavourites(resp?.data || []);
      setPageCount(resp.pagination.totalPages || 1);
    } catch (err) {
      setError(err.message || "Failed to fetch favourites");
      console.error("Error fetching favourites:", err);
    } finally {
      setLoading(false);
    }
  };
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  const handleViewClick = (ambassador) => {
    const slug = buildAmbassadorSlug(ambassador);
    if (slug) {
      router.push(`/ambassador/${slug}`);
    } else {
      router.push(
        `/sports-ambassador-profile/${ambassador?.subRole}/${ambassador?.supabaseId}`
      );
    }
  };

  const handleFavourites = async (id) => {
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
      console.error("Error updating favourites:", err);
    }
  };

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
    <div className="flex flex-col bg-gray-100 h-screen">
      <div className="flex flex-1 lg:flex-row flex-col relative">
        <div className="hidden lg:block h-fit">
          <Sidebar />
        </div>

        <div className="flex flex-col p-4 pt-8 md:p-6 md:pt-10 overflow-auto w-full h-screen">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">
            {t("heading")}
          </h1>

          <div className="">
            {favourites.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {favourites.map((data) => {
                  const item = data?.ambassadorId;
                  const subRole = toCamelCase(item?.subRole || "");
                  const name = item?.[subRole]?.name;
                  const sport = item?.[subRole]?.sports?.[0];
                  const goals = item?.[subRole]?.goals;
                  const avatar =
                    item?.[subRole]?.images?.[0]?.url || "/default-avatar.jpg";

                  const sportDisplay = translateSports(sport);
                  const sportDisplayString = Array.isArray(sportDisplay)
                    ? sportDisplay.join(", ")
                    : sportDisplay || "";

                  return (
                    <div
                      key={item?._id}
                      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                    >
                      <div className="relative">
                        <img
                          src={avatar}
                          alt={name}
                          className="w-full aspect-square object-cover cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            handleViewClick(item);
                          }}
                          onError={(e) => {
                            e.target.src = "/default-avatar.jpg";
                          }}
                          loading="lazy"
                          decoding="async"
                        />
                      </div>

                      <div className="p-4">
                        <h3 className="text-xl font-semibold text-gray-800 mb-1 truncate">
                          {name}
                        </h3>

                        <div className="mb-4">
                          {subRole === "influencer" ? (
                            <div className="flex flex-wrap gap-1">
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                                {t("influencer")}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {sportDisplayString.split(",").map((s, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full"
                                >
                                  {s.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 mt-4">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleFavourites(item?._id);
                            }}
                            className="secondaryBtnGray px-3 py-1.5 "
                          >
                            {t("remove")}
                          </button>

                          {/* <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleViewClick(item);
                            }}
                            className="px-3 py-1.5 bg-[#390A21] text-white rounded-full  w-full text-md"
                          >
                            {t("view")}
                          </button> */}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-xl font-medium text-gray-700 mb-2">
                  {t("fallback")}
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {t("fallback2")}
                </p>
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
};

export default Favourites;
