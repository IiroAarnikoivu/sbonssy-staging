"use client";
import Loader from "@/components/Loader";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import React, { useEffect, useState } from "react";

const BrandRequests = () => {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.role === "brand" && user?.onboardedDetails?._id) {
      fetchRequests();
    } else {
      setError("You must be a brand to view requests.");
      setLoading(false);
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/brand/requests`);

      setRequests(response?.requests || []);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      setError(
        error.response?.data?.message ||
        "Failed to load requests. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId, action) => {
    if (!["accept", "decline"].includes(action)) {
      console.error("Invalid action in handleAction:", action);
      setError("Invalid action. Please try again.");
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const response = await api.put(`/campaign-request`, {
        requestId,
        action,
      });

      fetchRequests();
    } catch (error) {
      console.error(`Failed to ${action} request:`, error);
      setError(
        error.response?.data?.message ||
        `Failed to ${action} request. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "accepted":
        return "Accepted";
      case "rejected":
        return "Rejected";
      case "cancelled":
        return "Cancelled";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="p-4 pt-8 md:p-6 md:pt-10 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Campaign Join Requests</h1>

      {loading ? (
        <Loader />
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No pending requests</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((request) => (
            <div
              key={request._id}
              className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
              role="region"
              aria-labelledby={`request-${request._id}`}
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  {/* {request.campaign.logo && (
                    <img
                      src={request.campaign.logo}
                      alt={`${request.campaign.title} Logo`}
                      className="h-16 w-16 object-contain rounded"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                  )} */}
                  <div className="ml-4">
                    <h3
                      id={`request-${request._id}`}
                      className="font-semibold text-lg"
                    >
                      {request.sender.name || "Unknown User"}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      @{request.sender.subRole || "ambassador"}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-1">Campaign:</h4>
                  <p className="text-gray-700">{request.campaign.title}</p>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-1">Brand:</h4>
                  <p className="text-gray-700">{request.campaign.brandName}</p>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-1">
                    Request Status:
                  </h4>
                  <p className="text-gray-700">
                    {getStatusText(request.status)}
                  </p>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-1">
                    Requested On:
                  </h4>
                  <p className="text-gray-700">
                    {new Date(request.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {request.status === "pending" && (
                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => handleAction(request._id, "accept")}
                      className="flex-1 bg-[#F26915ED] text-white py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400"
                      disabled={loading}
                      aria-label={`Accept request from ${request.sender.name}`}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleAction(request._id, "decline")}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400"
                      disabled={loading}
                      aria-label={`Decline request from ${request.sender.name}`}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrandRequests;
