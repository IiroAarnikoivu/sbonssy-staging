"use client";
import SwiperJsCarousel from "@/components/Common/SwiperJsCarousel/SwiperJsCarousel";
import Loader from "@/components/Loader";
import Pagination from "@/components/Pagination/pagination";
import Sidebar from "@/components/Sidebar";
import api from "@/lib/axios";
import { capitalizeFirstLetter, toCamelCase } from "@/lib/helper";
import { useAuthStore } from "@/store/authStore";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Chip } from "primereact/chip";
import Swal from "sweetalert2";
import { RiMore2Fill } from "react-icons/ri";
import useDebounce from "@/hook/useDebounce";
import useSportsTranslations from "@/hook/useSportsTranslations";

// CampaignCard component remains the same
const CampaignCard = ({
  campaign,
  t,
  user,
  router,
  openInviteModal,
  state,
  fetchCampaigns,
}) => {
  const basicDetails = campaign?.basics;
  const brandName = campaign?.brandName || "Brand Name";
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropDownRef = useRef(null);
  const toastAlert = useTranslations("Sweetalert");

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handlePause = async (id) => {
    try {
      if (user.onboardedDetails.permission === "Can View") {
        await Swal.fire({
          title: toastAlert("sorry"),
          text: toastAlert("permission"),
          icon: "info",
          confirmButtonText: toastAlert("ok"),
          customClass: {
            confirmButton: "confirmButton",
            cancelButton: "cancelButton",
          },
        });
      } else {
        const isCurrentlyPaused = campaign.stateID === 2;
        const result = await Swal.fire({
          title: toastAlert("sure"),
          text: isCurrentlyPaused ? toastAlert("resume") : toastAlert("pause"),
          icon: "question",
          showCancelButton: true,
          confirmButtonText: isCurrentlyPaused
            ? toastAlert("isResume")
            : toastAlert("isPause"),
          cancelButtonText: isCurrentlyPaused
            ? toastAlert("paused")
            : toastAlert("running"),
          customClass: {
            confirmButton: "confirmButton",
            cancelButton: "cancelButton",
          },
        });

        if (result.isConfirmed) {
          const newStateID = isCurrentlyPaused ? 1 : 2;
          await api.put(`/campaign?campaignId=${id}`, {
            stateID: newStateID,
          });

          await Swal.fire({
            title: isCurrentlyPaused
              ? toastAlert("resumed")
              : toastAlert("paused2"),
            text: isCurrentlyPaused
              ? toastAlert("resumeSuccess")
              : toastAlert("pauseSuccess"),
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });

          fetchCampaigns();
        }
      }
    } catch (error) {
      console.error("Error toggling campaign state:", error);
      Swal.fire({
        title: toastAlert("error"),
        text: toastAlert("campaignError"),
        icon: "error",
      });
    } finally {
      setIsDropdownOpen(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      if (user.onboardedDetails.permission === "Can View") {
        await Swal.fire({
          title: toastAlert("sorry"),
          text: toastAlert("delete"),
          icon: "info",
          confirmButtonText: toastAlert("ok"),
          customClass: {
            confirmButton: "confirmButton",
            cancelButton: "cancelButton",
          },
        });
      } else {
        const result = await Swal.fire({
          title: toastAlert("sure"),
          text: toastAlert("deleteQues"),
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
          await api.delete(`/campaign?id=${id}`);

          await Swal.fire({
            title: toastAlert("campaignDlt"),
            text: toastAlert("dltSucess"),
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
          router.push("/brand/campaign");
          fetchCampaigns();
        }
      }
    } catch (error) {
      console.error("Error delete campaign:", error);
      Swal.fire({
        title: toastAlert("error"),
        text: toastAlert("dltError"),
        icon: "error",
      });
    } finally {
      setIsDropdownOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropDownRef.current && !dropDownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative flex flex-col rounded-2xl overflow-hidden p-0 bg-white shadow-md">
      <div className="w-full aspect-square relative">
        <img
          src={campaign?.assets?.logos?.[0]?.url || "/placeholder.jpg"}
          alt="campaign visual"
          className="object-cover w-full h-full rounded-[16px] cursor-pointer"
          onClick={() => router.push(`/campaign-details/${campaign._id}`)}
        />
        {(() => {
          const status = campaign?.verification?.status || "";
          let chipLabel = t("awaitingApproval", "Awaiting approval");
          if (status === "verified") {
            chipLabel = t("verified", "Verified");
          } else if (status === "accepted") {
            chipLabel = t("published", "Published");
          }
          return (
            <div className="absolute top-4 left-4">
              <Chip className="text-sm" label={chipLabel} />
            </div>
          );
        })()}
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleDropdown}
            className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 focus:outline-none"
          >
            <RiMore2Fill className="text-[#0C0D06] text-xl" />
          </button>
          {isDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
              ref={dropDownRef}
            >
              <button
                onClick={() => {
                  handlePause(campaign._id);
                  setIsDropdownOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-[#0C0D06] hover:bg-gray-100 hover:rounded-lg"
              >
                {campaign.stateID == 2 ? t("resume") : t("pause")}
              </button>
              <button
                onClick={() => {
                  handleDelete(campaign._id);
                  setIsDropdownOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-[#0C0D06] hover:bg-gray-100 hover:rounded-lg"
              >
                {t("delete")}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col flex-1 pt-4 pb-2 px-4">
        <div className="text-[18px] font-normal leading-[150%] text-[#0C0D06] mb-[6px] line-clamp-2">
          {basicDetails?.title || "Campaign title Lorem Ipsum"}
        </div>
        <div className="text-[14px] font-bold leading-[150%] text-[#0C0D06]">
          {brandName}
        </div>
        <button
          className="w-full bg-[#EDEDED] text-[#0C0D06] rounded-full py-2 text-base mb-3 mt-2 cursor-pointer hover:bg-[#D5D5D5]"
          onClick={() => {
            user.onboardedDetails.permission === "Can View"
              ? Swal.fire({
                  title: toastAlert("denied"),
                  text: toastAlert("text"),
                  icon: "error",
                  position: "center",
                  showConfirmButton: true,
                  confirmButtonText: toastAlert("ok"),
                  customClass: {
                    confirmButton: "confirmButton",
                    cancelButton: "cancelButton",
                  },
                  timerProgressBar: false,
                  timer: 5000,
                })
              : router.push(`/brand/campaign/${campaign?._id}`);
          }}
        >
          {t("settings")}
        </button>
        <div className="flex items-center gap-3">
          <button
            className="w-full bg-[#3B0029] text-white rounded-full py-2 text-base cursor-pointer hover:bg-[#2A001F] disabled:bg-gray-400"
            onClick={() => {
              router.push(`/campaign-details/${campaign?._id}`);
            }}
          >
            {t("view")}
          </button>
            {basicDetails?.campaignType === "private" && (
            <button
              onClick={() =>
                user?.onboardedDetails?.permission === "Can View"
                  ? Swal.fire({
                      title: toastAlert("denied"),
                      text: toastAlert("permissionText"),
                      icon: "info",
                      showConfirmButton: true,
                      timerProgressBar: false,
                      timer: 5000,
                    })
                  : openInviteModal(campaign._id)
              }
              className="w-full bg-[#3B0029] text-white rounded-full py-2 text-base cursor-pointer hover:bg-[#2A001F] disabled:bg-gray-400"
              disabled={state.isLoading || campaign?.verification?.status !== "accepted"}
              title={campaign?.verification?.status !== "accepted" ? t("awaitingApproval", "Awaiting approval") : ""}
            >
              {t("invite")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Campaign = () => {
  const { user } = useAuthStore();
  const brandId = user?.onboardedDetails?.invitedBy
    ? user?.onboardedDetails?.invitedBy?._id
    : user?.onboardedDetails?._id;
  const router = useRouter();
  const t = useTranslations("Brand.campaignsPage");
  const toastAlert = useTranslations("Sweetalert");
  const translateSports = useSportsTranslations();
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalItems: null,
    totalPages: null,
    limit: 10,
  });
  const [paginationRequest, setPaginationRequest] = useState({
    currentPage: 1,
    totalItems: null,
    totalPages: null,
    limit: 10,
  });
  const [state, setState] = useState({
    campaigns: [],
    isModalOpen: false,
    ambassadors: [],
    selectedAmbassadors: [],
    currentCampaignId: null,
    isLoading: false,
    selectedCampaign: "",
    carouselContentRequests: [],
    error: null,
    searchQuery: "",
  });
  const debouncedSearchQuery = useDebounce(state.searchQuery, 750);

  const updateState = (updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const handlePageChange = (selectedPage) => {
    setPagination((p) => ({
      ...p,
      currentPage: selectedPage,
    }));
  };

  const handlePageChangeRequest = (selectedPage) => {
    setPaginationRequest((p) => ({
      ...p,
      currentPage: selectedPage,
    }));
  };

  const fetchCampaigns = useCallback(async () => {
    if (!brandId) return;
    try {
      updateState({ isLoading: true, error: null });
      const response = await api.get(
        `/campaign?brandId=${brandId}&page=${pagination.currentPage}`,
      );

      setPagination((p) => ({
        ...p,
        currentPage: response?.pagination?.currentPage,
        totalItems: response?.pagination?.totalItems,
        totalPages: response?.pagination?.totalPages,
      }));
      updateState({ campaigns: response?.data || [] });
    } catch (error) {
      updateState({ error: "Failed to load campaigns. Please try again." });
    } finally {
      updateState({ isLoading: false });
    }
  }, [brandId, pagination.currentPage]);

  const fetchAmbassadors = useCallback(
    async (campaignId, searchQuery, signal) => {
      if (!campaignId) return;

      try {
        updateState({ isLoading: true, error: null });
        const response = await api.get(
          `/campaign/ambassadors?campaignId=${campaignId}&search=${encodeURIComponent(
            searchQuery,
          )}`,
          { signal },
        );
        updateState({
          ambassadors: response?.data?.data || [],
          isLoading: false,
        });
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("Failed to fetch ambassadors:", error);
        updateState({
          error: "Failed to load ambassadors. Please try again.",
          isLoading: false,
        });
        await Swal.fire({
          title: toastAlert("error"),
          text:
            toastAlert("loadAmbassadorsError") || "Failed to load ambassadors",
          icon: "error",
          toast: true,
          position: "top-right",
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },
    [toastAlert],
  );

  const openInviteModal = (campaignId) => {
    updateState({
      currentCampaignId: campaignId,
      ambassadors: [],
      selectedAmbassadors: [],
      isModalOpen: true,
      searchQuery: "",
      error: null,
    });
  };

  const closeInviteModal = () => {
    updateState({
      isModalOpen: false,
      currentCampaignId: null,
      ambassadors: [],
      selectedAmbassadors: [],
      searchQuery: "",
      error: null,
      isLoading: false,
    });
  };

  const handleSelectAmbassador = (ambassadorId) => {
    updateState({
      selectedAmbassadors: state.selectedAmbassadors.includes(ambassadorId)
        ? state.selectedAmbassadors.filter((id) => id !== ambassadorId)
        : [...state.selectedAmbassadors, ambassadorId],
    });
  };

  const handleSendInvitations = async () => {
    if (state.selectedAmbassadors.length === 0) {
      await Swal.fire({
        title: toastAlert("error"),
        text:
          toastAlert("selectAmbassador") ||
          "Please select at least one ambassador.",
        icon: "error",
        toast: true,
        position: "top-right",
        showConfirmButton: false,
        timer: 3000,
      });
      return;
    }

    try {
      const result = await Swal.fire({
        title: toastAlert("sure"),
        text: toastAlert("inviteText"),
        icon: "info",
        showCancelButton: true,
        confirmButtonText: toastAlert("yes"),
        cancelButtonText: toastAlert("cancel"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      });

      if (result.isConfirmed) {
        updateState({ isLoading: true });
        try {
          const response = await api.post("/campaign/invite", {
            campaignId: state.currentCampaignId,
            ambassadorIds: state.selectedAmbassadors,
          });

          await Swal.fire({
            title: toastAlert("invitationSent"),
            position: "top-right",
            icon: "success",
            toast: true,
            showConfirmButton: false,
            timerProgressBar: false,
            timer: 3000,
          });

          closeInviteModal();
        } catch (error) {
          console.error("Error sending invitations:", error);
          await Swal.fire({
            title: toastAlert("inviteError"),
            position: "top-right",
            icon: "error",
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        } finally {
          updateState({ isLoading: false });
        }
      }
    } catch (error) {
      console.error("Confirmation dialog error:", error);
      await Swal.fire({
        title: toastAlert("error"),
        text:
          toastAlert("dialogError") ||
          "An error occurred with the confirmation dialog.",
        icon: "error",
        toast: true,
        position: "top-right",
        showConfirmButton: false,
        timer: 3000,
      });
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    updateState({ searchQuery: value });
  };

  useEffect(() => {
    const controller = new AbortController();
    if (state.isModalOpen && state.currentCampaignId) {
      fetchAmbassadors(
        state.currentCampaignId,
        debouncedSearchQuery,
        controller.signal,
      );
    }
    return () => controller.abort();
  }, [
    debouncedSearchQuery,
    state.currentCampaignId,
    state.isModalOpen,
    fetchAmbassadors,
  ]);

  const fetchRequests = useCallback(async () => {
    try {
      updateState({ isLoading: true, error: null });
      const url = state.selectedCampaign
        ? `/brand/requests?campaignId=${state.selectedCampaign}`
        : `/brand/requests?page=${paginationRequest.currentPage}&limit=${paginationRequest.limit}`;

      const response = await api.get(url);

      setPaginationRequest((p) => ({
        ...p,
        currentPage: response?.pagination?.currentPage,
        totalItems: response?.pagination?.totalItems,
        totalPages: response?.pagination?.totalPages,
      }));
      updateState({ carouselContentRequests: response?.data?.requests || [] });
    } catch (error) {
      updateState({ error: "Failed to load requests. Please try again." });
    } finally {
      updateState({ isLoading: false });
    }
  }, [
    state.selectedCampaign,
    paginationRequest.currentPage,
    paginationRequest.limit,
  ]);

  const handleCreateCampaign = async () => {
    try {
      const response = await api.get("/payments/payment-methods");
      const paymentMethods = response.data.data;
      if (!paymentMethods || paymentMethods.length === 0) {
        await Swal.fire({
          title: toastAlert("noMethod"),
          text: toastAlert("reqMsg"),
          icon: "warning",
          confirmButtonText: t("addPaymentMethod", "Add Payment Method"),
          showCancelButton: true,
          cancelButtonText: toastAlert("cancel"),
          customClass: {
            confirmButton: "confirmButton",
            cancelButton: "cancelButton",
          },
        }).then((result) => {
          if (result.isConfirmed) {
            router.push(`/brand/settings/payments`);
          }
        });
      } else {
        router.push("/brand/campaign/create");
      }
    } catch (error) {
      console.error("Error checking payment methods:", error);
      await Swal.fire({
        title: toastAlert("methodFailed"),
        text: toastAlert("methodError"),
        icon: "error",
        toast: true,
        position: "top-right",
        showConfirmButton: false,
        timerProgressBar: false,
        timer: 3000,
      });
    }
  };

  useEffect(() => {
    if (brandId) {
      fetchCampaigns();
      fetchRequests();
    }
  }, [brandId, fetchCampaigns, fetchRequests, paginationRequest.currentPage]);

  useEffect(() => {
    document.body.style.overflow = state.isModalOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [state.isModalOpen]);

  const carouselContent = state.carouselContentRequests.map((request) => {
    const user = request?.userId;
    const subRole = toCamelCase(user?.subRole || "");
    const name = user.invitedBy
      ? user?.invitedBy?.[subRole]?.name
      : user?.[subRole]?.name || user?.name || user?.email || "Unknown";
    const sports = user.invitedBy
      ? user?.invitedBy?.[subRole]?.sports
      : user?.[subRole]?.sports;
    // Translate sports for display
    const translatedSports = sports ? translateSports(sports?.slice(0, 2)) : [];
    const sport = Array.isArray(translatedSports)
      ? translatedSports.join(", ")
      : translatedSports || "";

    const image = user.invitedBy
      ? user?.invitedBy?.[subRole]?.images[0]?.url
      : user?.[subRole]?.images[0]?.url || "/placeholder.jpg";

    return {
      img: image,
      title: name,
      brand: sport,
      status: request?.status,
      _id: request?._id,
      campaignId: request?.campaign?._id || "",
      campaignTitle: request?.campaignId?.basics?.title || "Unknown Campaign",
      campaignStateID: request?.campaignId?.stateID,
      supabaseId: user?.supabaseId,
      subRole: subRole,
    };
  });

  const handleAction = async (requestId, action) => {
    try {
      updateState({ isLoading: true, error: null });

      // Find the request to check campaign state
      const currentRequest = state.carouselContentRequests.find(
        (req) => req._id === requestId,
      );
      const campaignStateID = currentRequest?.campaignId?.stateID;

      // Check if campaign is paused (stateID === 2) and prevent accept/decline
      if (["accept", "decline"].includes(action) && campaignStateID === 2) {
        await Swal.fire({
          title: toastAlert("sorry"),
          text: toastAlert("campaignPausedInfo"),
          icon: "warning",
          confirmButtonText: toastAlert("ok"),
          customClass: {
            confirmButton: "confirmButton",
            cancelButton: "cancelButton",
          },
        });
        updateState({ isLoading: false });
        return;
      }

      if (["accept", "decline"].includes(action)) {
        Swal.fire({
          title: toastAlert("sure"),
          text: `${toastAlert("msg")}${action}${toastAlert("request")}`,
          icon: "info",
          showCancelButton: true,
          confirmButtonText: toastAlert("yes"),
          cancelButtonText: toastAlert("cancel"),
          customClass: {
            confirmButton: "confirmButton",
            cancelButton: "cancelButton",
          },
        }).then(async (result) => {
          if (result.isConfirmed) {
            const response = await api.put(`/campaign-request`, {
              requestId,
              action,
            });
            if (response.success) {
              Swal.fire({
                title: `${
                  action === "accept"
                    ? toastAlert("accepted")
                    : toastAlert("declined")
                }`,
                position: "top-right",
                icon: "success",
                toast: true,
                showConfirmButton: false,
                timerProgressBar: false,
                timer: 3000,
              });
              // Optimistically remove the processed request from UI
              setState((prev) => ({
                ...prev,
                carouselContentRequests: prev.carouselContentRequests.filter(
                  (req) => req._id !== requestId,
                ),
              }));
              // Refresh in background to stay in sync (pagination counts, etc.)
              fetchRequests();
            } else {
              Swal.fire({
                title: `${toastAlert("failed")}${action}${toastAlert("req")}`,
                position: "top-right",
                icon: "error",
                toast: true,
                showConfirmButton: false,
                timerProgressBar: false,
                timer: 3000,
              });
            }
          }
        });
      } else if (action === "cancel") {
        Swal.fire({
          title: toastAlert("sure"),
          text: toastAlert("dltReq"),
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: toastAlert("yes"),
          cancelButtonText: toastAlert("cancel"),
          customClass: {
            confirmButton: "confirmButton",
            cancelButton: "cancelButton",
          },
        }).then(async (result) => {
          if (result.isConfirmed) {
            const response = await api.delete(`/campaign-request`, {
              data: { requestId },
            });
            if (response.success) {
              Swal.fire({
                title: response.data.message,
                position: "top-right",
                icon: "success",
                toast: true,
                showConfirmButton: false,
                timerProgressBar: false,
                timer: 3000,
              });
              // Optimistically remove the canceled request from UI
              setState((prev) => ({
                ...prev,
                carouselContentRequests: prev.carouselContentRequests.filter(
                  (req) => req._id !== requestId,
                ),
              }));
              // Refresh in background to stay in sync
              fetchRequests();
            } else {
              Swal.fire({
                title: toastAlert("failedReq"),
                position: "top-right",
                icon: "error",
                toast: true,
                showConfirmButton: false,
                timerProgressBar: false,
                timer: 3000,
              });
            }
          }
        });
      } else {
        Swal.fire({
          title: toastAlert("invalid"),
          position: "top-right",
          icon: "error",
          toast: true,
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 3000,
        });
        return;
      }
    } catch (error) {
      Swal.fire({
        title: `${toastAlert("failed")}${action}${toastAlert("req")}`,
        position: "top-right",
        icon: "error",
        toast: true,
        showConfirmButton: false,
        timerProgressBar: false,
        timer: 3000,
      });
      updateState({
        error:
          error.response?.data?.message ||
          `Failed to ${action} request. Please try again.`,
      });
    } finally {
      updateState({ isLoading: false });
    }
  };

  if (
    state.isLoading &&
    !state.campaigns.length &&
    !state.carouselContentRequests.length
  ) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <div className="hidden lg:block">
        <Sidebar className="w-full max-w-[16rem] md:max-w-[20rem] xl:max-w-[24rem]" />
      </div>
      <div className="flex-1 p-4 pt-8 md:p-6 md:pt-10 overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
        <header className="flex justify-between items-center mb-4 md:mb-5">
          <h1 className="font-['Sunset_Gothic_Pro'] text-[30px] md:text-[40px] font-normal leading-[120%] tracking-[-1%] text-[#0C0D06]">
            {t("campaigns")}
          </h1>
        </header>

        {user?.onboardedDetails?.permission !== "Can View" && (
          <div className="mb-6">
            <button
              onClick={handleCreateCampaign}
              className="bg-[#f26915] text-white py-2 px-4 rounded-full border-2 border-[#f26915] hover:bg-white hover:text-[#f26915] transition duration-300 cursor-pointer"
            >
              {t("create")}
            </button>
          </div>
        )}
        {state.error && (
          <p className="text-red-500 text-center mb-4">{state.error}</p>
        )}
        {state.campaigns.length === 0 ? (
          <p className="text-gray-500 text-center">{t("fallback")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {state.campaigns.map((campaign, index) => (
              <CampaignCard
                key={index}
                campaign={campaign}
                t={t}
                user={user}
                router={router}
                openInviteModal={openInviteModal}
                state={state}
                fetchCampaigns={fetchCampaigns}
              />
            ))}
          </div>
        )}
        {pagination.totalPages > 1 && (
          <div className="mt-8">
            <Pagination
              currentPage={pagination.currentPage}
              pageCount={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}

        <div>
          <h1 className="text-[30px] md:text-[40px] font-normal text-[#0C0D06]">
            {t("requests")}
          </h1>
          <select
            id="campaignSelect"
            value={state.selectedCampaign}
            onChange={(e) => updateState({ selectedCampaign: e.target.value })}
            className="dropdownIcon w-full sm:w-[50%] py-2 px-3 border border-[#0C0D0626] bg-[#0C0D060D] rounded-[12px] h-10 mt-2.5 mb-9 cursor-pointer"
          >
            <option value="">{t("all")}</option>
            {state.campaigns.map((campaign) => (
              <option key={campaign._id} value={campaign._id}>
                {campaign.basics?.title || "Untitled Campaign"}
              </option>
            ))}
          </select>
          {carouselContent.length === 0 ? (
            <p className="text-gray-500 text-center">{t("fallback2")}</p>
          ) : (
            <div className="w-full px-4 mx-auto">
              <SwiperJsCarousel
                data={carouselContent}
                imgStyling="w-full h-[254px] object-cover rounded-2xl"
                breakpoint={{
                  320: { slidesPerView: 1, spaceBetween: 16 },
                  640: { slidesPerView: 2, spaceBetween: 24 },
                  1024: { slidesPerView: 4, spaceBetween: 32 },
                  1280: { slidesPerView: 4, spaceBetween: 32 },
                  1640: { slidesPerView: 4, spaceBetween: 32 },
                }}
                spaceBetween={32}
                slidesOffsetBefore={0}
                slidesOffsetAfter={0}
                campaignCards={true}
                showImgContent={true}
                campaignBtnStyl="!bg-[#F26915ED] !text-[#fff]"
                ceoCards="true"
                myCampCarousel="!mt-3 !pb-[0px]"
                handleAction={handleAction}
              />
              {paginationRequest.totalPages > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={paginationRequest.currentPage}
                    pageCount={paginationRequest.totalPages}
                    onPageChange={handlePageChangeRequest}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        {state.isModalOpen && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: "rgba(0, 0, 0, 0.75)" }}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[70vh] overflow-y-auto shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-[#0C0D06]">
                  {t("select")}
                </h2>
                <button
                  onClick={closeInviteModal}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder={t("search")}
                  value={state.searchQuery}
                  onChange={handleSearchChange}
                  className="w-full py-2 px-3 border border-[#0C0D0626] bg-[#0C0D060D] rounded-[12px] h-10"
                />
              </div>
              {state.error && (
                <p className="text-red-500 text-center mb-4">{state.error}</p>
              )}
              {state.ambassadors.length === 0 && !state.isLoading ? (
                <p className="text-gray-500 text-center">{t("fallback3")}</p>
              ) : (
                <div className="space-y-2">
                  {state.ambassadors.map((ambassador) => (
                    <div
                      key={ambassador._id}
                      className="flex items-center space-x-3 p-2 border-b border-gray-100"
                    >
                      <input
                        type="checkbox"
                        checked={state.selectedAmbassadors.includes(
                          ambassador._id,
                        )}
                        onChange={() => handleSelectAmbassador(ambassador._id)}
                        className="h-5 w-5 text-[#f26915] border-gray-300 rounded focus:ring-[#f26915]"
                        disabled={state.isLoading}
                      />
                      <img
                        src={ambassador.profileImage || "/placeholder.jpg"}
                        alt={ambassador.name || "Ambassador"}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <label className="text-sm text-[#0C0D06]">
                        {ambassador.name || ambassador.email} (
                        {capitalizeFirstLetter(ambassador.subRole)})
                      </label>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 flex justify-end space-x-4">
                <button
                  onClick={closeInviteModal}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-[#f26915] hover:text-white transition duration-300"
                  disabled={state.isLoading}
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleSendInvitations}
                  className="px-4 py-2 bg-[#f26915] text-white rounded-full hover:bg-[#d95e13] disabled:bg-gray-400 transition duration-300"
                  disabled={
                    state.isLoading || state.selectedAmbassadors.length === 0
                  }
                >
                  {t("send")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Campaign;
