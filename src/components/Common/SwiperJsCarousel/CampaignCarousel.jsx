"use client";

import { useEffect, useState, useCallback } from "react";
import CampaignCard from "@/components/campaign/CampaignCard";

const CampaignGrid = ({
  items,
  type,
  requestStatuses,
  handleApplyClick,
  handleJoinClick,
  handleCancelClick,
  handleInvitationAction,
  handleFavourites,
  favourites,
  gridLayout = false,
  allCampaigns = false,
}) => {
  const [windowWidth, setWindowWidth] = useState(0);

  const updateWindowWidth = useCallback(() => {
    setWindowWidth(window.innerWidth);
  }, []);

  useEffect(() => {
    updateWindowWidth();
    window.addEventListener("resize", updateWindowWidth);
    return () => window.removeEventListener("resize", updateWindowWidth);
  }, [updateWindowWidth]);

  const getColumns = useCallback(() => {
    if (windowWidth >= 1220) return 3;
    if (windowWidth >= 768) return 2;
    return 1;
  }, [windowWidth]);

  const columns = getColumns();

  return (
    <div
      className={`
        grid
        ${
          gridLayout
            ? `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${
                allCampaigns ? "2xl:grid-cols-4" : "2xl:grid-cols-5"
              } gap-8 grid-rows-2`
            : `grid-cols-${columns} gap-2 md:gap-5`
        }
        ${items.length === 1 ? "justify-center" : ""}
      `}
    >
      {items.map((item) => (
        <div key={item._id} className="w-full">
          <CampaignCard
            item={item}
            type={type}
            requestStatuses={requestStatuses}
            handleApplyClick={handleApplyClick}
            handleJoinClick={handleJoinClick}
            handleCancelClick={handleCancelClick}
            handleInvitationAction={handleInvitationAction}
            handleFavourites={handleFavourites}
            favourites={favourites}
          />
        </div>
      ))}
    </div>
  );
};

export default CampaignGrid;
