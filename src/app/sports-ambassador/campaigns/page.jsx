"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import CampaignList from "@/components/campaign/CampaignList";
import Loader from "@/components/Loader";
import Pagination from "@/components/Pagination/pagination";
import SidebarSports from "@/components/SidebarSports";
import { useCampaigns } from "@/hook/useCampaigns";

const MyCampaigns = () => {
  const {
    state,
    fetchCampaigns,
    fetchFavourites,
    fetchJoinedCampaigns,
    handleInvitationAction,
    handleCancelClick,
    handleFavoriteClick,
    handleFavourites,
  } = useCampaigns();
  const t = useTranslations("Sports.campaigns");
  const [shareUrls, setShareUrls] = useState({});
  const [shareLoading, setShareLoading] = useState({});
  const [shareError, setShareError] = useState("");

  const handleShare = useCallback(
    async (campaignId) => {
      if (shareUrls[campaignId] || shareLoading[campaignId]) return;

      setShareLoading((prev) => ({ ...prev, [campaignId]: true }));
      setShareError("");

      try {
        const response = await fetch("/api/campaign/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Failed to generate share link");
        }

        setShareUrls((prev) => ({ ...prev, [campaignId]: result.shareUrl }));
      } catch (err) {
        setShareError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setShareLoading((prev) => ({ ...prev, [campaignId]: false }));
      }
    },
    [shareUrls, shareLoading]
  );

  const handlePageChange = useCallback(
    (section, newPage) => {
      if (section === "joinedCampaigns") {
        fetchJoinedCampaigns(newPage);
      } else if (section === "campaigns") {
        fetchCampaigns("", "all", "", newPage);
      }
    },
    [fetchCampaigns, fetchJoinedCampaigns]
  );

  useEffect(() => {
    fetchFavourites();
  }, [fetchFavourites]);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader />
      </div>
    );
  }

  const { campaigns: campaignPagination, joinedCampaigns: joinedPagination } =
    state.pagination;

  return (
    <div className="flex flex-col bg-gray-100 min-h-screen">
      <div className="flex flex-1 relative">
        <div className="hidden lg:block h-fit sticky top-0">
          <SidebarSports />
        </div>

        <div className="flex-1 flex flex-col p-4 pt-8 md:p-6 md:pt-10 overflow-auto">
          <h2 className="text-4xl lg:text-5xl mb-8 lg:mb-0">{t("heading")}</h2>

          {shareError && <p className="text-red-500 mb-4">{shareError}</p>}
          {state.error && <p className="text-red-500 mb-4">{state.error}</p>}
          {!state.loading &&
            !state.error &&
            !shareError &&
            state.invitations.length === 0 &&
            state.pendingCampaigns.length === 0 &&
            state.joinedCampaigns.length === 0 &&
            state.favoriteCampaigns.length === 0 && (
              <p className="text-gray-500 text-lg">{t("fallbackText")}</p>
            )}

          {state.invitations.length > 0 && (
            <section className="py-8 md:py-16">
              <h4 className="text-2xl md:text-3xl mb-12">{t("pending")}</h4>
              <CampaignList
                items={state.invitations}
                type="invitation"
                handleInvitationAction={handleInvitationAction}
                handleFavourites={handleFavourites}
                favourites={state.favourites}
              />
            </section>
          )}

          {state.pendingCampaigns.length > 0 && (
            <section className="my-10 md:mb-16">
              <h4 className="text-2xl md:text-3xl mb-12">
                {t("pending-requests")}
              </h4>
              <CampaignList
                items={state.pendingCampaigns}
                type="pending"
                requestStatuses={state.requestStatuses}
                handleCancelClick={handleCancelClick}
                pendingRequestIds={state.pendingRequestIds}
                handleFavourites={handleFavourites}
                handleFavoriteClick={handleFavoriteClick}
                favourites={state.favourites}
              />
            </section>
          )}

          {state.joinedCampaigns.length > 0 && (
            <section className="md:mb-16">
              <h4 className="text-2xl md:text-3xl mb-12">{t("joined")}</h4>
              <CampaignList
                items={state.joinedCampaigns}
                type="joined"
                favoriteCampaigns={state.favoriteCampaigns}
                handleFavoriteClick={handleFavoriteClick}
                handleFavourites={handleFavourites}
                favourites={state.favourites}
                handleShare={handleShare}
                shareUrls={shareUrls}
              />
              {joinedPagination.totalPages > 1 && (
                <div className="flex justify-center mt-6 gap-2">
                  <Pagination
                    currentPage={joinedPagination.page}
                    pageCount={joinedPagination.totalPages}
                    onPageChange={(newPage) =>
                      handlePageChange("joinedCampaigns", newPage)
                    }
                  />
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyCampaigns;
