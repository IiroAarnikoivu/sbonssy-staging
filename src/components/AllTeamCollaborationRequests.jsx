"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { toCamelCase } from "@/lib/helper";
import SidebarSports from "./SidebarSports";
import Loader from "./Loader";
import Pagination from "./Pagination/pagination";
import IconsLibrary from "@/util/IconsLibrary";
import { buildAmbassadorSlug } from "@/util/buildAmbassadorSlug";
import { useTranslations } from "next-intl";
import Swal from "sweetalert2";
import { useAuthStore } from "@/store/authStore";
import Image from "next/image";

const AllTeamCollaborationRequests = ({
  invites = [],
  accepted = [],
  totalInvites = 0,
  totalAccepted = 0,
  onActionComplete,
  noInvitesMessage = "No pending invites found",
  currentPage = 1,
  currentPage2 = 1,
  limit = 10,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [localInvites, setLocalInvites] = useState(invites);
  const t = useTranslations("Sports.team");
  const toastAlert = useTranslations("Sweetalert");
  const { user } = useAuthStore();

  const totalPages = Math.ceil(totalInvites / limit);
  const totalPages2 = Math.ceil(totalAccepted / limit);

  // Handle page change for pending invites
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      const params = new URLSearchParams();
      params.set("page", newPage.toString());
      if (currentPage2 > 1) {
        params.set("page2", currentPage2.toString());
      }
      router.push(`?${params.toString()}`);
    }
  };

  // Handle page change for accepted collaborations
  const handlePageChange2 = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages2) {
      const params = new URLSearchParams();
      if (currentPage > 1) {
        params.set("page", currentPage.toString());
      }
      params.set("page2", newPage.toString());
      router.push(`?${params.toString()}`, { scroll: false });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [currentPage, currentPage2]);

  useEffect(() => {
    setLocalInvites(invites);
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [invites, currentPage]);

  const handleRequestAction = async (requestId, action) => {
    try {
      setLoading((prev) => ({ ...prev, [requestId]: true }));
      setLocalInvites((prev) =>
        prev.filter((invite) => invite._id !== requestId)
      );
      const resp = await api.put(`/sports/collaboration-invite`, {
        requestId,
        action,
        status: action === "accept" ? "accepted" : "rejected",
      });
      if (onActionComplete) {
        await onActionComplete();
      }
      // Success toast
      Swal.fire({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: false,
        icon: "success",
        title:
          (action === "accept"
            ? `${toastAlert("accepted")}`
            : `${toastAlert("declined")}`) + ` ${toastAlert("req")}`,
      });
    } catch (error) {
      setLocalInvites(invites);
      // Error toast
      Swal.fire({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: false,
        icon: "error",
        title:
          `${toastAlert("failed")}` +
          (action === "accept"
            ? ` ${t("accept").toLowerCase()}`
            : ` ${t("reject").toLowerCase()}`) +
          ` ${toastAlert("req")}`,
      });
    } finally {
      setLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const formatSports = (sports) => {
    if (!sports) return "Sport not specified";
    if (Array.isArray(sports)) return sports.join(", ");
    return sports;
  };

  // State for navigation dots
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeIndexAccepted, setActiveIndexAccepted] = useState(0);

  const handlePrev = (items, setIndex) => {
    setIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  };

  const handleNext = (items, setIndex) => {
    setIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  };

  const goToIndex = (index, setIndex) => {
    setIndex(index);
  };

  if (isLoading) {
    return (
      <div className="flex bg-gray-100 relative min-h-screen">
        <SidebarSports className="w-full max-w-[16rem] md:max-w-[20rem] xl:max-w-[24rem]" />
        <div className="flex-1 flex items-center justify-center">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-100 relative">
      <SidebarSports className="w-full max-w-[16rem] md:max-w-[20rem] xl:max-w-[24rem]" />
      <div className="flex-1 p-4 pt-8 md:p-6 md:pt-10 overflow-x-hidden overflow-y-auto max-h-[calc(100vh_-_92px)]">
        {/* Pending Invites Section */}
        <div>
          <div className="flex justify-between items-center mb-16 flex-wrap gap-y-3">
            <h2 className="text-[36px] lg:text-[48px]">{t("pending")}</h2>
          </div>
          {localInvites.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {noInvitesMessage}
              </h3>
              <p className="text-sm text-gray-500">{t("pendingFallback")}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-10">
                {localInvites.map((invite) => {
                  const subrole = toCamelCase(invite?.brandId?.subRole);
                  const subRoleData = invite?.brandId[subrole];
                  const name = subRoleData?.name || "Unnamed";
                  const image = subRoleData?.images?.[0]?.url;

                  return (
                    <div key={invite._id}>
                      <Image
                        src={image}
                        alt={name}
                        width={616}
                        height={400}
                        className="w-full rounded-2xl max-h-[360px] object-cover cursor-pointer"
                        onError={(e) => {
                          e.target.src = "/default-avatar.png";
                        }}
                        onClick={() =>
                          (() => {
                            const slug = buildAmbassadorSlug(invite?.brandId);
                            if (slug) {
                              router.push(`/ambassador/${slug}`);
                            } else {
                              router.push(
                                `/sports-ambassador-profile/${toCamelCase(subrole)}/${invite?.brandId?.supabaseId}`
                              );
                            }
                          })()
                        }
                      />
                      <div className="mt-4">
                        <h6 className="text-lg font-bold capitalize">{name}</h6>
                        <div className="text-base mt-4 font-normal grid grid-cols-[25%_75%]">
                          <span>{subrole || "N/A"}</span>
                        </div>
                        3
                      </div>
                      <div className="mt-4">
                        <button
                          disabled={loading[invite._id]}
                          className="grayBtn w-full"
                          onClick={() => {
                            user?.onboardedDetails?.permission === "Can View"
                              ? Swal.fire({
                                  title: toastAlert("denied"),
                                  text: toastAlert("permissionText"),
                                  icon: "info",
                                  showConfirmButton: true,
                                  timerProgressBar: false,
                                  timer: 5000,
                                })
                              : (async () => {
                                  const result = await Swal.fire({
                                    title: toastAlert("sure"),
                                    text: `${toastAlert("msg")} ${t(
                                      "reject"
                                    ).toLowerCase()} ${toastAlert("request")}`,
                                    icon: "question",
                                    showCancelButton: true,
                                    confirmButtonText: toastAlert("yes"),
                                    cancelButtonText: toastAlert("no"),
                                    customClass: {
                                      confirmButton: "confirmButton",
                                      cancelButton: "cancelButton",
                                    },
                                  });
                                  if (result.isConfirmed) {
                                    handleRequestAction(invite._id, "reject");
                                  }
                                })();
                          }}
                        >
                          {loading[invite._id] ? t("processing") : t("reject")}
                        </button>
                        <button
                          disabled={loading[invite._id]}
                          className="primaryBtnPlain text-white w-full mt-2"
                          onClick={() => {
                            if (
                              user?.onboardedDetails?.permission === "Can View"
                            ) {
                              Swal.fire({
                                title: toastAlert("denied"),
                                text: toastAlert("permissionText"),
                                icon: "info",
                                showConfirmButton: true,
                                timerProgressBar: false,
                                timer: 5000,
                              });
                            } else {
                              (async () => {
                                const result = await Swal.fire({
                                  title: toastAlert("sure"),
                                  text: `${toastAlert("msg")} ${t(
                                    "accept"
                                  ).toLowerCase()} ${toastAlert("request")}`,
                                  icon: "question",
                                  showCancelButton: true,
                                  confirmButtonText: toastAlert("yes"),
                                  cancelButtonText: toastAlert("no"),
                                  customClass: {
                                    confirmButton: "confirmButton",
                                    cancelButton: "cancelButton",
                                  },
                                });
                                if (result.isConfirmed) {
                                  handleRequestAction(invite._id, "accept");
                                }
                              })();
                            }
                          }}
                          //   onClick={() => {
                          //     user?.onboardedDetails?.permission === "Can View"
                          //       ? Swal.fire({
                          //           title: `Access Denied`,
                          //           text: "Sorry, you don't have permission.",
                          //           icon: "info",
                          //           showConfirmButton: true,
                          //           timerProgressBar: false,
                          //           timer: 5000,
                          //         })
                          //       : handleRequestAction(invite._id, "accept");
                          //   }}
                        >
                          {loading[invite._id] ? t("processing") : t("accept")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  pageCount={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </div>

        {/* Accepted Collaborations Section */}
        <div>
          <div className="flex justify-between items-center my-16 flex-wrap gap-y-3">
            <h2 className="text-[36px] lg:text-[48px]">{t("accepted")}</h2>
          </div>
          {accepted.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {t("acceptedFallback")}
              </h3>
              <p className="text-sm text-gray-500">
                {t("acceptedFallbackText")}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-10">
                {accepted.map((req, index) => {
                  const subRole = toCamelCase(req?.subRole || "");
                  const name = req[subRole]?.name || "Unknown Athlete";
                  const sport = req[subRole]?.sport || req[subRole]?.sports;
                  const image = req[subRole]?.images?.[0]?.url;

                  return (
                    <div key={index}>
                      <div>
                        <Image
                          src={image}
                          alt={name}
                          width={616}
                          height={400}
                          className="w-full rounded-2xl max-h-[360px] object-cover cursor-pointer"
                          onError={(e) => {
                            e.target.src = "/default-athlete.jpg";
                          }}
                          onClick={() =>
                            (() => {
                              const slug = buildAmbassadorSlug(req);
                              if (slug) {
                                router.push(`/ambassador/${slug}`);
                              } else {
                                router.push(
                                  `/sports-ambassador-profile/${toCamelCase(subRole)}/${req.supabaseId}`
                                );
                              }
                            })()
                          }
                        />
                      </div>
                      <div className="mt-4">
                        <h6 className="text-lg font-bold capitalize">{name}</h6>
                        <div className="text-base mt-4 font-normal grid grid-cols-[25%_75%]">
                          <span>{subRole}</span>
                        </div>
                      </div>
                      <button
                        className="primaryBtnPlain text-white w-full mt-2"
                        onClick={() =>
                          (() => {
                            const slug = buildAmbassadorSlug(req);
                            if (slug) {
                              router.push(`/ambassador/${slug}`);
                            } else {
                              router.push(
                                `/sports-ambassador-profile/${toCamelCase(subRole)}/${req.supabaseId}`
                              );
                            }
                          })()
                        }
                      >
                        {t("view")}
                      </button>
                    </div>
                  );
                })}
              </div>
              {totalPages2 > 1 && (
                <Pagination
                  currentPage={currentPage2}
                  pageCount={totalPages2}
                  onPageChange={handlePageChange2}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllTeamCollaborationRequests;
