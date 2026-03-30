"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import Swal from "sweetalert2";
import { useAuthStore } from "@/store/authStore";
import IconsLibrary from "@/util/IconsLibrary";
import Image from "next/image";
import Link from "next/link";

const normalizeCampaignData = (item, type) => {
  const isInvitation = type === "invitation";
  const isJoinedOrFavorite = type === "joined" || type === "favorite";

  const source = isInvitation
    ? item
    : isJoinedOrFavorite
    ? item
    : item.basics || {};

  return {
    _id: item._id,
    title: isInvitation ? item.campaignTitle : source.title || "N/A",
    trackingId: isInvitation ? item.trackingId : undefined,
    brandName: item.brandId?.brand?.companyName || item.brandName || "N/A",
    campaignType: isInvitation ? "private" : source.campaignType || "N/A",
    description: source.description || "No description available",
    logo: isInvitation
      ? item.logo || ""
      : isJoinedOrFavorite
      ? item.logo
      : item.assets?.logos?.[0]?.url || "",
    isOngoing: source.isOngoing || false,
    startDate: source.startDate || null,
    endDate: source.endDate || null,
    createdAt: isInvitation ? item.createdAt : undefined,
    brandId: isInvitation ? undefined : item.brandId,
    status: isInvitation ? item?.status : "",
  };
};

const CampaignCard = ({
  item,
  type,
  requestStatuses = {},
  handleApplyClick,
  handleJoinClick,
  handleCancelClick,
  handleInvitationAction,
  handleFavourites,
  favourites,
  handleFavoriteClick,
  isCampaignFavorite,
}) => {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Sports.campaignCard");
  const toastAlert = useTranslations("Sweetalert");

  const campaignData = normalizeCampaignData(item, type);

  const isFavorite = favourites?.some(
    (fav) => fav?.campaignId?._id === campaignData._id
  );

  const showPermissionError = useCallback(() => {
    Swal.fire({
      title: toastAlert("denied"),
      text: toastAlert("permissionText"),
      icon: "info",
      showConfirmButton: true,
      confirmButtonText: toastAlert("ok"),
      customClass: {
        confirmButton: "confirmButton",
        cancelButton: "cancelButton",
      },
      timerProgressBar: false,
      timer: 5000,
    });
  }, []);

  const getButtonUI = useCallback(() => {
    const isJoined =
      type === "joined" || requestStatuses[campaignData._id] === "active";
    const isFavoriteCampaign = type === "favorite";
    const isInvitation = type === "invitation";
    const status = requestStatuses[campaignData._id];
    const brandId = campaignData.brandId;

    // If this is a joined campaign, don't show any action button
    if (isJoined) {
      return null;
    }

    if (isFavoriteCampaign) {
      return (
        <button
          onClick={() => {
            if (user?.onboardedDetails?.permission === "Can View") {
              showPermissionError();
            } else {
              handleFavourites(campaignData._id);
            }
          }}
          className="grayBtn w-full"
        >
          {t("remove")}
        </button>
      );
    }

    if (isInvitation) {
      return (
        <div className="w-full">
          <button
            onClick={() => {
              if (user?.onboardedDetails?.permission === "Can View") {
                showPermissionError();
              } else {
                handleInvitationAction?.(campaignData._id, "decline");
              }
            }}
            className="grayBtn w-full mb-2"
          >
            {t("decline")}
          </button>
          <button
            onClick={() => {
              if (user?.onboardedDetails?.permission === "Can View") {
                showPermissionError();
              } else {
                handleInvitationAction?.(campaignData._id, "accept");
              }
            }}
            className="primaryBtn w-full"
          >
            {t("accept")}
          </button>
        </div>
      );
    }

    if (type === "pending" || status === "pending") {
      return (
        <>
          <button
            onClick={() => {
              if (user?.onboardedDetails?.permission === "Can View") {
                showPermissionError();
              } else {
                handleCancelClick?.(campaignData._id, brandId || "");
              }
            }}
            className="grayBtn w-full"
            disabled={!brandId}
          >
            {t("cancel-request")}
          </button>
          <button
            className="px-4 py-3 mt-4 rounded-lg primaryBtn transition-colors text-black w-full"
            onClick={() => router.push(`/campaign-details/${campaignData._id}`)}
          >
            {t("view")}
          </button>
        </>
      );
    }

    if (campaignData.campaignType === "apply") {
      switch (status) {
        case "not_applied":
          return null;
        // <div className="flex flex-col gap-3 w-full">
        //   <button
        //     onClick={() =>
        //       router.push(`/campaign-details/${campaignData._id}`)
        //     }
        //     className="w-full grayBtn text-black rounded-full h-10 px-6"
        //   >
        //     {t("view")}
        //   </button>
        // </div>
        case "accepted":
          return (
            <div className="text-green-600 text-sm font-semibold text-center">
              {t("accepted")}
            </div>
          );
        case "rejected":
          return (
            <div className="text-red-600 text-sm font-semibold text-center">
              {t("rejected")}
            </div>
          );
        default:
          return (
            <button
              onClick={() => {
                if (user?.onboardedDetails?.permission === "Can View") {
                  showPermissionError();
                } else {
                  handleApplyClick(brandId || "", campaignData._id);
                }
              }}
              className="btnprimaryPlain text-white w-full"
              disabled={!brandId}
            >
              {t("join")}
            </button>
          );
      }
    }

    if (campaignData.campaignType === "public") {
      switch (status) {
        case "not_applied":
          return null;
        // <div className="flex flex-col gap-3">
        //   <button
        //     className="px-4 py-3 rounded-lg grayBtn transition-colors text-black w-full"
        //     onClick={() =>
        //       router.push(`/campaign-details/${campaignData._id}`)
        //     }
        //   >
        //     {t("view")}
        //   </button>
        // </div>
        case "active":
          return (
            <div className="bg-transparent px-3 flex justify-center items-center text-green-600">
              {t("joined")}
            </div>
          );
        default:
          return (
            <button
              onClick={() => {
                if (user?.onboardedDetails?.permission === "Can View") {
                  showPermissionError();
                } else {
                  handleJoinClick(brandId || "", campaignData._id);
                }
              }}
              className="w-full text-white text-sm py-2 px-4 rounded bg-green-600 hover:bg-green-700 transition-colors"
              disabled={!brandId}
            >
              {t("join-now")}
            </button>
          );
      }
    }

    return null;
  }, [
    type,
    requestStatuses,
    campaignData,
    user,
    handleApplyClick,
    handleJoinClick,
    handleCancelClick,
    handleInvitationAction,
    handleFavourites,
    isFavorite,
    router,
    t,
    showPermissionError,
  ]);

  return (
    <div className="relative overflow-hidden md:max-w-[304px]">
      {user?.role === "sports-ambassador" && (
        <button
          onClick={() =>
            user?.onboardedDetails?.permission === "Can View"
              ? showPermissionError()
              : handleFavourites(campaignData._id)
          }
          className="absolute top-4 left-4 text-2xl"
        >
          {isFavorite ? (
            <IconsLibrary name="star_mp_filled" />
          ) : (
            <IconsLibrary name="star_mp" />
          )}
        </button>
      )}

      {campaignData.logo && (
        <div 
          className="relative w-full aspect-square cursor-pointer"
          onClick={(e) => {
            if (campaignData?.status === "pending") {
              e.preventDefault();
              e.stopPropagation();
              Swal.fire({
                toast: true,
                text: toastAlert("viewPermissionTxt"),
                position: "top-right",
                showConfirmButton: false,
                icon: "warning",
                timer: 3000,
              });
            }
          }}
        >
          <Link 
            href={campaignData?.status === "pending" ? "#" : `/campaign-details/${campaignData._id}`}
            className="block w-full h-full"
            onMouseEnter={() => {
              if (campaignData?.status !== "pending") {
                router.prefetch(`/campaign-details/${campaignData._id}`);
              }
            }}
          >
            <Image
              src={campaignData.logo}
              alt="Campaign logo"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 300px"
              className="rounded-2xl object-cover border border-gray-200"
            />
          </Link>
        </div>
      )}

      {/* <h6 className="lg:mt-6 font-[400] capitalize text-lg leading-[150%]">
        {campaignData.title || "N/A"}
      </h6> */}

      <div>
        <p className="mb-[6px] min-h-[60px] mt-2 font-normal">
          <span className="font-sm">{campaignData.brandName || "N/A"}</span>
        </p>
      </div>

      {getButtonUI()}
    </div>
  );
};

export default CampaignCard;
