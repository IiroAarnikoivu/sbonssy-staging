"use client";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import UnauthorizedComponent from "@/components/Common/Unauthorized/page";
import ViewCampaign from "@/components/ViewCampaign";
import { SocketProvider } from "@/context/SocketContext";
import { useCampaigns } from "@/hook/useCampaigns";
import api from "@/lib/axios";
import { toCamelCase } from "@/lib/helper";
import { useAuthStore } from "@/store/authStore";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Loader from "@/components/Loader";

const CampaignDetail = () => {
  const params = useParams();
  const campaignId = params?.id;
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { user, loading } = useAuthStore();
  const { handleJoinClick, handleApplyClick } = useCampaigns();
  const [trackerLoaded] = useState(false);

  const subRole = toCamelCase(user?.onboardedDetails?.subRole);
  const supabaseId = user?.supabaseId;

  useEffect(() => {
    // Wait for auth state to resolve before fetching
    if (loading) return;
    if (!campaignId || user === null) {
      setError("Invalid campaign ID");
      setIsLoading(false);
      return;
    }

    const fetchCampaign = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const endpoint =
          user?.onboardedDetails?.role !== "brand"
            ? `/campaign/view/${campaignId}`
            : `/campaign/marketplace-view/${campaignId}`;
        const response = await api.get(endpoint);
        const campaignData = response?.data?.data;

        setDetails(campaignData);
      } catch (error) {
        console.error("Error fetching campaign:", error);
        setError(error.response?.data?.message || "Failed to load campaign");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId, user, trackerLoaded, supabaseId, loading]);

  return (
    <SocketProvider>
      <DefaultLayout>
        <div className="pt-8">
          {/* Keep hooks order stable by rendering auth/loading states here */}
          {loading ? (
            <div className="flex items-center justify-center h-screen">
              <Loader />
            </div>
          ) : !user ? (
            <UnauthorizedComponent />
          ) : isLoading ? (
            <div className="flex items-center justify-center h-screen">
              <Loader />
            </div>
          ) : details ? (
            <ViewCampaign
              campaignId={campaignId}
              details={details}
              user={user}
              handleJoinClick={handleJoinClick}
              handleApplyClick={handleApplyClick}
            />
          ) : null}
        </div>
      </DefaultLayout>
    </SocketProvider>
  );
};

export default CampaignDetail;
