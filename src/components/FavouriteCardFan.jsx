import React, { memo } from "react";
import { useTranslations } from "next-intl";
import Swal from "sweetalert2";
import { useAuthStore } from "@/store/authStore";
import { toCamelCase } from "@/lib/helper";
import useSportsTranslations from "@/hook/useSportsTranslations";
import Image from "next/image";

const FavouriteCardFan = memo(
  ({
    item,
    type, // 'campaign' or 'ambassador'
    onViewClick,
    onRemoveFavourite,
  }) => {
    const tt = useTranslations("Favourites");
    const toastAlert = useTranslations("Sweetalert");
    const t = useTranslations("MarketPlace");
    const { user } = useAuthStore();
    const translateSports = useSportsTranslations();

    const handleRemoveClick = (e) => {
      e.preventDefault();
      if (user?.onboardedDetails?.permission === "Can View") {
        Swal.fire({
          title: toastAlert("denied"),
          text: toastAlert("permissionText"),
          icon: "info",
          showConfirmButton: true,
          timerProgressBar: false,
          timer: 5000,
        });
      } else {
        onRemoveFavourite(item.id);
      }
    };

    const handleViewClick = (e) => {
      e.preventDefault();
      onViewClick(item);
    };

    // Process campaign item
    const processedCampaignItem = item.campaignId
      ? {
          id: item.campaignId._id,
          name: item.campaignId.basics?.title,
          image: item.campaignId.assets?.logos[0]?.url,
          subRole: toCamelCase(item.campaignId.subRole || ""),
          sport:
            item.campaignId[item.campaignId.subRole]?.sports?.[0] ||
            t("sports.fallback.text2"),
          goals:
            item.campaignId[item.campaignId.subRole]?.goals ||
            t("sports.fallback.text3"),
        }
      : null;

    // Process ambassador item
    const processedAmbassadorItem = item.ambassadorId
      ? {
          id: item.ambassadorId._id,
          name: item.ambassadorId[item.ambassadorId.subRole]?.name,
          image:
            item.ambassadorId[item.ambassadorId.subRole]?.images?.[0]?.url ||
            "/default-avatar.jpg",
          subRole: toCamelCase(item.ambassadorId.subRole || ""),
          sport: item.ambassadorId[item.ambassadorId.subRole]?.sports?.[0],
          goals: item.ambassadorId[item.ambassadorId.subRole]?.goals,
        }
      : null;

    const processedItem =
      type === "campaign" ? processedCampaignItem : processedAmbassadorItem;

    if (!processedItem) return null;

    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="relative aspect-square">
          <Image
            src={processedItem.image}
            alt={processedItem.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover cursor-pointer"
            onClick={handleViewClick}
            loading="lazy"
          />
        </div>

        <div className="p-4">
          <h3 className="text-xl font-semibold text-gray-800 mb-1 truncate">
            {processedItem.name}
          </h3>

          {type === "ambassador" && (
            <div className="mb-4">
              {processedItem.subRole === "influencer" ? (
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-1  bg-gray-100 text-gray-800  text-xs rounded-full">
                    {tt("influencer")}
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {(() => {
                    const translatedSports = processedItem.sport
                      ? translateSports(processedItem.sport)
                      : [];
                    const sportDisplay = Array.isArray(translatedSports)
                      ? translatedSports.join(", ")
                      : translatedSports || "";
                    return sportDisplay.split(",").map((s, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full"
                      >
                        {s.trim()}
                      </span>
                    ));
                  })()}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={handleRemoveClick}
              className="secondaryBtnGray px-3 py-1.5"
            >
              {tt("remove")}
            </button>

            <button
              onClick={handleViewClick}
              className="px-3 py-1.5 bg-[#390A21] text-white rounded-full w-full text-md"
            >
              {tt(type === "campaign" ? "viewC" : "view")}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

FavouriteCardFan.displayName = "FavouriteCardFan";

export default FavouriteCardFan;
