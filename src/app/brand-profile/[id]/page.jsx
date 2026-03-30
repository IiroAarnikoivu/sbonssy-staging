"use client";

import api from "@/lib/axios";

import { use, useEffect, useState } from "react";
import { toCamelCase } from "@/lib/helper";
import BrandCampaign from "@/components/BrandCampaign";
import TeamBrand from "@/components/TeamBrand";

import Loader from "@/components/Loader";
import { SocketProvider, useSocket } from "@/context/SocketContext";
import BrandProfileView from "@/components/BrandProfileView";

const ViewProfile = ({ params }) => {
  const { id } = use(params);

  const [showAllCampaigns, setShowAllCampaigns] = useState(false);
  const [showMyTeam, setShowMyTeam] = useState(false);
  const [profileState, setProfileState] = useState({
    details: null,
    campaigns: [],
    collaborations: [],
    loading: true,
    error: null,
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalItems: null,
    totalPages: null,
  });
  const [paginationTeam, setPaginationTeam] = useState({
    currentPage: 1,
    totalItems: null,
    totalPages: null,
  });

  const handlePageChange = (selectedPage) => {
    setPagination((p) => ({
      ...p,
      currentPage: selectedPage,
    }));
  };

  const handlePageChangeTeam = (selectedPage) => {
    setPaginationTeam((p) => ({
      ...p,
      currentPage: selectedPage,
    }));
  };

  useEffect(() => {
    fetchProfileDetails();
  }, [id, pagination.currentPage, paginationTeam.currentPage]); // Include paginationTeam.currentPage

  const fetchProfileDetails = async () => {
    setProfileState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [profileRes, campaignsRes, collaborationsRes] = await Promise.all([
        api.get(`/user/${id}`),
        api.get(`/user/campaign/${id}?page=${pagination.currentPage}`),
        api.get(
          `/user/collaborations/${id}?page=${paginationTeam.currentPage}`
        ),
      ]);

      setProfileState({
        details: profileRes.data?.success ? profileRes.data.data : null,
        campaigns: campaignsRes.data.data || [],
        collaborations: collaborationsRes.data || [], // Adjust for correct data field
        loading: false,
        error: null,
      });
      setPagination((p) => ({
        ...p,
        currentPage: campaignsRes.data?.pagination?.currentPage,
        totalItems: campaignsRes.data?.pagination?.totalItems,
        totalPages: campaignsRes.data?.pagination?.totalPages,
      }));
      setPaginationTeam((p) => ({
        ...p,
        currentPage: collaborationsRes?.pagination?.currentPage,
        totalItems: collaborationsRes?.pagination?.totalItems,
        totalPages: collaborationsRes?.pagination?.totalPages,
      }));
    } catch (err) {
      setProfileState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load profile data. Please try again later.",
      }));
    }
  };

  const { details, campaigns, collaborations, loading, error } = profileState;

  const campaignCarouselData = campaigns.map((campaign) => ({
    img: campaign.assets.logos[0]?.url || "/assets/images/placeholder.jpg",
    title: campaign.basics.title,
    brand: details?.brand?.companyName || "Brand",
    ambassadors: campaign?.ambassadors || [],
  }));

  const teamCarouselData = collaborations.map((collab) => {
    const collaborator = collab[toCamelCase(collab.subRole)] || {};

    return {
      img:
        collaborator?.images?.find((img) => img.isProfile)?.url ||
        "/assets/images/placeholder.jpg",
      name: collaborator?.name || collab?.name || "Unnamed Collaborator",
      sport: collaborator?.sports?.join(", ") || "N/A",
      role: collab?.subRole || "Unknown",
      id: collab?.supabaseId || "",
    };
  });

  const CarouselBreakPoint = {
    320: { slidesPerView: 2.3, spaceBetween: 24 },
    640: { slidesPerView: 4.4 },
    1280: { spaceBetween: 32 },
    1600: { slidesPerView: 3.2, spaceBetween: 32 },
  };

  const myCampBreakPoint = {
    320: { slidesPerView: 2.5, spaceBetween: 24 },
    640: { slidesPerView: 2.5 },
    1200: { slidesPerView: 3.5, spaceBetween: 32 },
    1340: { slidesPerView: 3.5, spaceBetween: 32 },
    1600: { slidesPerView: 4.3, spaceBetween: 32 },
  };

  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center py-20">
        <Loader />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-20 text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen">
      {
        // showAllCampaigns ? (
        //   <BrandCampaign
        //     data={campaignCarouselData}
        //     pagination={pagination}
        //     handlePageChange={handlePageChange}
        //     onBack={() => setShowAllCampaigns(false)}
        //   />
        // ) :
        showMyTeam ? (
          <TeamBrand
            data={teamCarouselData}
            pagination={paginationTeam}
            handlePageChange={handlePageChangeTeam}
            onBack={() => setShowMyTeam(false)}
          />
        ) : (
          <SocketProvider>
            <BrandProfileView
              details={details}
              teamCarouselData={teamCarouselData}
              campaignCarouselData={campaignCarouselData}
              CarouselBreakPoint={CarouselBreakPoint}
              myCampBreakPoint={myCampBreakPoint}
              id={id}
              onMove={() => setShowMyTeam(true)}
              onMoveCampaign={() => setShowAllCampaigns(true)}
            />
          </SocketProvider>
        )
      }
    </div>
  );
};

export default ViewProfile;
