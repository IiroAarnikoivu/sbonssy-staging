"use client";
import React from "react";
import { useState } from "react";
import api from "@/lib/axios";
import moment from "moment";

const BrandCollaboration = ({ initialRequests, currentPage, limit, total }) => {
  const [requests, setRequests] = useState(initialRequests);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      setLoading(true);
      setError(null);
      const action = newStatus === "accepted" ? "accept" : "decline";
      const response = await api.put(`/brand/sports-ambassador`, {
        requestId,
        action,
      });

      if (response.data) {
        setRequests(
          requests.map((request) =>
            request._id === requestId
              ? { ...request, status: response.data.status }
              : request
          )
        );
      }
    } catch (err) {
      console.error("Error updating request status:", err);
      setError(
        err.response?.data?.message || "Failed to update request status"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">
        Collaboration Requests
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {loading && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-md">
          Processing...
        </div>
      )}

      {requests?.length === 0 ? (
        <p className="text-gray-600">No collaboration requests found.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            return (
              <div
                key={request._id}
                className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">
                      {request.brandId?.companyName || "Unknown Brand"}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Status:{" "}
                      <span
                        className={`font-medium ${
                          request.status === "accepted"
                            ? "text-green-600"
                            : request.status === "rejected"
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {request.status}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Created: {moment(request?.createdAt).format("LLL")}
                    </p>
                  </div>
                  {request.status === "pending" && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          handleStatusUpdate(request._id, "accepted")
                        }
                        disabled={loading}
                        className={`px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 ${
                          loading ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() =>
                          handleStatusUpdate(request._id, "rejected")
                        }
                        disabled={loading}
                        className={`px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 ${
                          loading ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BrandCollaboration;
