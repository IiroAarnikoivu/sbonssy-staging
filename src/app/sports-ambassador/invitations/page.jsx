// components/Invitations.jsx
"use client";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import React, { useEffect, useState } from "react";

const Invitations = () => {
  const { user } = useAuthStore();
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInvitations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get("/campaign/invite");
      setInvitations(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch invitations:", err);
      setError("Failed to load invitations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvitationAction = async (invitationId, action) => {
    const confirmMessage =
      action === "accept"
        ? "Are you sure you want to accept this invitation?"
        : "Are you sure you want to decline this invitation?";
    if (!confirm(confirmMessage)) return;

    setIsLoading(true);
    setError(null);
    try {
      await api.put("/campaign/invite", { invitationId, action });
      setInvitations((prev) => prev.filter((inv) => inv._id !== invitationId));
    } catch (err) {
      console.error(`Failed to ${action} invitation:`, err);
      setError(`Failed to ${action} invitation. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "sports-ambassador") {
      fetchInvitations();
    }
  }, [user]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Your Campaign Invitations</h1>

      {isLoading && <p className="text-gray-500">Loading invitations...</p>}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {invitations.length === 0 && !isLoading ? (
        <p className="text-gray-500">No pending invitations found.</p>
      ) : (
        <div className="space-y-4">
          {invitations
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((invitation) => (
              <div
                key={invitation._id}
                className="bg-white rounded-lg shadow-md p-4 flex justify-between items-center border-2"
              >
                <div>
                  <h2 className="text-lg font-semibold">
                    {invitation.campaignTitle}
                  </h2>
                  <p className="text-sm text-gray-500">
                    From: {invitation.brandName}
                  </p>
                  <p className="text-sm text-gray-500">
                    Received:{" "}
                    {new Date(invitation.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      handleInvitationAction(invitation._id, "accept")
                    }
                    className="px-4 py-2 bg-[#f26915] text-white rounded-full hover:bg-[#d95e13] disabled:bg-gray-400"
                    disabled={isLoading}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() =>
                      handleInvitationAction(invitation._id, "decline")
                    }
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 disabled:bg-gray-400"
                    disabled={isLoading}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Invitations;
