import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import Swal from "sweetalert2";
import { useTranslations } from "next-intl";
import { toCamelCase } from "@/lib/helper";

export const useCampaigns = () => {
  const [state, setState] = useState({
    campaigns: [],
    favourites: [],
    joinedCampaigns: [],
    invitations: [],
    pendingCampaigns: [],
    favoriteCampaigns: [],
    loading: true,
    error: null,
    requestStatuses: {},
    pendingRequestIds: {},
    pagination: {
      campaigns: { currentPage: 1, totalItems: 0, limit: 20, totalPages: 1 },
      joinedCampaigns: {
        currentPage: 1,
        totalItems: 0,
        limit: 10,
        totalPages: 1,
      },
    },
  });
  const { user } = useAuthStore();
  const userId = user?.onboardedDetails?._id;
  const t = useTranslations("Brand.campaignsPage");

  // Helper function to show alerts consistently
  const showAlert = useCallback((title, text, icon = "error", timer = 5000) => {
    Swal.fire({
      title,
      text,
      icon,
      toast: true,
      position: "top-right",
      showConfirmButton: false,
      timerProgressBar: false,
      timer,
    });
  }, []);

  // Helper function to check Stripe account connection AND verification
  const checkStripeAccountId = useCallback(async () => {
    const subRole = toCamelCase(user?.onboardedDetails?.subRole?.toLowerCase());
    const validRoles = [
      "athlete",
      "exAthlete",
      "paraAthlete",
      "coach",
      "team",
      "influencer",
    ];

    if (!subRole || !validRoles.includes(subRole)) {
      showAlert(
        t("error", "Error"),
        t("invalidRole", "Invalid user role. Please update your profile."),
        "error"
      );
      return false;
    }

    const stripeAccountId = user?.onboardedDetails?.[subRole]?.stripeAccountId;
    if (!stripeAccountId) {
      const result = await Swal.fire({
        title: t("noPaymentMethodTitle", "No Payment Method"),
        text: t(
          "noPaymentMethodText",
          "Please add a payment method before proceeding with this action."
        ),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: t("addPaymentMethod", "Add Payment Method"),
        cancelButtonText: t("cancel", "Cancel"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      });

      if (result.isConfirmed) {
        window.location.href =
          // process.env.NEXT_PUBLIC_PAYMENT_SETTINGS_URL ||
          `/sports-ambassador/settings/payments`;
      }
      return false;
    }
    // Verify Stripe account status
    try {
      const verification = await api.post("/payments/check-verification", {
        userId: user?.onboardedDetails?._id || user?._id,
        stripeAccountId,
      });
      const payload = verification?.data || {};
      const status = payload?.verificationStatus;
      const flags = payload?.flags || {};
      if (status !== "verified") {
        const requirements = payload?.requirements || [];
        const due = (requirements || []).join(", ");

        // Fallback: if payouts OR charges are enabled, consider verified to prevent false negatives
        const enabled = !!(flags?.payouts_enabled || flags?.charges_enabled);
        const disabled = !!flags?.disabled_reason;
        if (enabled && !disabled) {
          return true;
        }
        const result = await Swal.fire({
          title: t("verificationRequiredTitle", "Complete verification"),
          text:
            due?.length > 0
              ? `${t("verificationRequiredText", "Your Stripe account is connected but not verified. Please complete verification to continue.")}\n${t("pendingRequirements", "Pending:")} ${due}`
              : t(
                  "verificationRequiredText",
                  "Your Stripe account is connected but not verified. Please complete verification to continue."
                ),
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: t("goToPayments", "Go to payments"),
          cancelButtonText: t("cancel", "Cancel"),
          customClass: { confirmButton: "confirmButton", cancelButton: "cancelButton" },
        });
        if (result.isConfirmed) {
          window.location.href = `/sports-ambassador/settings/payments`;
        }
        return false;
      }
    } catch (e) {
      showAlert(
        t("error", "Error"),
        t("verificationCheckFailed", "Failed to check Stripe verification. Please try again."),
        "error"
      );
      return false;
    }
    return true;
  }, [user, t, showAlert]);

  // Helper function for confirmation dialogs
  const showConfirmation = useCallback(
    async (
      title,
      text,
      confirmText = t("yes", "Yes"),
      cancelText = t("cancel", "Cancel")
    ) => {
      return Swal.fire({
        title,
        text,
        icon: "info",
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      });
    },
    [t]
  );

  // Generic fetch function
  const fetchData = useCallback(async (endpoint, options = {}) => {
    try {
      const response = await api.get(endpoint, options);
      return response.data?.data || [];
    } catch (error) {
      throw error;
    }
  }, []);

  // Fetch campaigns with filters
  const fetchCampaigns = useCallback(
    async (search = "", category = "all", sort = "", page = 1) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const query = new URLSearchParams({
          page: page.toString(),
          limit: state.pagination.campaigns.limit.toString(),
          ...(search && { search }),
          ...(category !== "all" && { category }),
          ...(sort && { sort }),
        }).toString();

        const [campaignsResponse, interactionsResponse] = await Promise.all([
          api.get(`/campaign?${query}`),
          userId
            ? api.get(`/campaign-request`).catch(() => ({ requests: [] }))
            : { requests: [] },
        ]);

        const { data, pagination } = campaignsResponse || {
          data: [],
          pagination: {},
        };
        const userInteractions = interactionsResponse?.requests || [];

        const statusMap = {};
        const requestIdMap = {};

        userInteractions.forEach((interaction) => {
          statusMap[interaction.campaignId] = interaction.status;
          if (interaction.status === "pending") {
            requestIdMap[interaction.campaignId] = interaction._id;
          }
        });

        const finalStatusMap = {};
        data.forEach((campaign) => {
          finalStatusMap[campaign?._id] =
            statusMap[campaign?._id] || "not_applied";
        });

        setState((prev) => ({
          ...prev,
          campaigns: data,
          requestStatuses: finalStatusMap,
          pendingRequestIds: requestIdMap,
          pagination: {
            ...prev.pagination,
            campaigns: pagination,
          },
          loading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: t(
            "error",
            "Failed to load campaigns. Please try again later."
          ),
          loading: false,
        }));
      }
    },
    [userId, state.pagination.campaigns.limit, t]
  );

  // Fetch joined campaigns
  const fetchJoinedCampaigns = useCallback(
    async (page = 1) => {
      try {
        setState((prev) => ({ ...prev, error: null }));
        const query = new URLSearchParams({
          page: page.toString(),
          limit: state.pagination.joinedCampaigns.limit.toString(),
        }).toString();

        const response = await api.get(`/campaign/joined?${query}`);
        const { data, pagination } = response.data || {
          data: [],
          pagination: {},
        };

        setState((prev) => ({
          ...prev,
          joinedCampaigns: data,
          pagination: {
            ...prev.pagination,
            joinedCampaigns: pagination,
          },
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: t(
            "error",
            "Failed to load joined campaigns. Please try again later."
          ),
        }));
      }
    },
    [state.pagination.joinedCampaigns.limit, t]
  );

  // Fetch pending campaigns
  const fetchPendingCampaigns = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null }));
      const campaignsData = await fetchData("/campaign/pending");

      const statusMap = {};
      const requestIdMap = {};
      campaignsData.forEach((campaign) => {
        statusMap[campaign._id] = "pending";
        requestIdMap[campaign._id] = campaign.requestId || null;
      });

      setState((prev) => ({
        ...prev,
        pendingCampaigns: campaignsData,
        requestStatuses: { ...prev.requestStatuses, ...statusMap },
        pendingRequestIds: { ...prev.pendingRequestIds, ...requestIdMap },
      }));
    } catch (error) {
      console.log("Failed to fetch pending campaigns:", error);
      setState((prev) => ({
        ...prev,
        error: t(
          "error",
          "Failed to load pending campaigns. Please try again later."
        ),
      }));
    }
  }, [fetchData, t]);

  // Fetch invitations
  const fetchInvitations = useCallback(async () => {
    try {
      const invitationData = await fetchData("/campaign/invite");
      setState((prev) => ({ ...prev, invitations: invitationData }));
    } catch (error) {}
  }, [fetchData]);

  // Fetch favorite campaigns
  const fetchFavoriteCampaigns = useCallback(async () => {
    try {
      const favoriteData = await fetchData("/favorite-campaign");
      setState((prev) => ({ ...prev, favoriteCampaigns: favoriteData }));
    } catch (error) {
      console.log("Failed to fetch favorite campaigns:", error);
    }
  }, [fetchData]);

  // Fetch favourites
  const fetchFavourites = useCallback(async () => {
    try {
      const favourites = await fetchData("/favourites", { limit: 0 });
      setState((prev) => ({ ...prev, favourites }));
    } catch (error) {
      console.log("Failed to fetch favourites:", error);
    }
  }, [fetchData]);

  // Handle favourites toggle
  const handleFavourites = useCallback(
    async (id) => {
      try {
        const resp = await api.post("/favourites", { id });
        if (resp?.success) {
          await fetchFavourites();
        }
      } catch (error) {
        console.log("Failed to update favourites:", error);
      }
    },
    [fetchFavourites]
  );

  // Handle campaign application
  const handleApplyClick = useCallback(
    async (brandId, campaignId, termsAccepted = false) => {
      if (!brandId) {
        showAlert(
          t("error", "Error"),
          t("noBrandInfo", "Cannot apply: Brand information is missing."),
          "error"
        );
        return false;
      }

      const hasStripeAccount = await checkStripeAccountId();
      if (!hasStripeAccount) return false;

      try {
        const result = await showConfirmation(
          t("confirmApplyTitle", "Are you sure?"),
          t("confirmApplyText", "Are you sure you want to send request?")
        );

        if (result.isConfirmed) {
          // Optimistic update
          setState((prev) => {
            const campaign = prev.campaigns.find((c) => c._id === campaignId);
            return {
              ...prev,
              requestStatuses: {
                ...prev.requestStatuses,
                [campaignId]: "pending",
              },
              campaigns: prev.campaigns.filter((c) => c._id !== campaignId),
              pendingCampaigns: campaign
                ? [...prev.pendingCampaigns, campaign]
                : prev.pendingCampaigns,
            };
          });

          const response = await api.post("/campaign-request", {
            campaignId,
            brandId,
            userId,
            termsAccepted,
          });

          if (response) {
            setState((prev) => ({
              ...prev,
              requestStatuses: {
                ...prev.requestStatuses,
                [campaignId]: response.status || "pending",
              },
              ...(response.status === "pending" &&
                response.requestId && {
                  pendingRequestIds: {
                    ...prev.pendingRequestIds,
                    [campaignId]: response.requestId,
                  },
                }),
            }));
            showAlert(t("requestSent", "Requested"), "", "success");
            return true;
          }
        }
        return false;
      } catch (error) {
        // Rollback optimistic update
        setState((prev) => {
          const campaign = prev.pendingCampaigns.find(
            (c) => c._id === campaignId
          );
          return {
            ...prev,
            requestStatuses: {
              ...prev.requestStatuses,
              [campaignId]: "not_applied",
            },
            pendingCampaigns: prev.pendingCampaigns.filter(
              (c) => c._id !== campaignId
            ),
            ...(campaign && { campaigns: [...prev.campaigns, campaign] }),
          };
        });

        showAlert(
          t("error", "Error"),
          error.response?.data?.message ||
            t("applyFailed", "Failed to send request. Please try again."),
          "error"
        );
        return false;
      }
    },
    [checkStripeAccountId, showAlert, showConfirmation, t, userId]
  );

  // Handle campaign join
  const handleJoinClick = useCallback(
    async (brandId, campaignId, termsAccepted = false) => {
      if (!brandId) {
        showAlert(
          t("error", "Error"),
          t("noBrandInfo", "Cannot join: Brand information is missing."),
          "error"
        );
        return false;
      }

      const hasStripeAccount = await checkStripeAccountId();
      if (!hasStripeAccount) return false;

      try {
        const result = await showConfirmation(
          t("confirmJoinTitle", "Are you sure?"),
          t("confirmJoinText", "Are you sure you want to join this campaign?")
        );

        if (!result.isConfirmed) return false; // Return false if user cancels

        // Call API first, then update state on success (no pre-confirm optimistic update)
        const response = await api.post("/campaign/join", {
          campaignId,
          userId,
          termsAccepted,
        });

        if (response) {
          setState((prev) => {
            const campaign = prev.campaigns.find((c) => c._id === campaignId);
            return {
              ...prev,
              requestStatuses: {
                ...prev.requestStatuses,
                [campaignId]: "active",
              },
              campaigns: prev.campaigns.filter((c) => c._id !== campaignId),
              joinedCampaigns: campaign
                ? [...prev.joinedCampaigns, campaign]
                : prev.joinedCampaigns,
            };
          });

          showAlert(
            t("joinSuccess", response?.message || "Joined successfully"),
            "",
            "success"
          );
          return true;
        }
        return false;
      } catch (error) {
        // No optimistic state was set before confirmation, so just notify error
        console.log("Join error:", error);
        // showAlert(
        //   t("error", "Error"),
        //   error.response?.data?.message ||
        //     t("joinFailed", "Failed to join campaign. Please try again."),
        //   "error"
        // );
        return false;
      }
    },
    [checkStripeAccountId, showAlert, showConfirmation, t, userId]
  );

  // Handle cancel request
  const handleCancelClick = useCallback(
    async (campaignId, brandId) => {
      try {
        const requestId = state.pendingRequestIds[campaignId];
        if (!requestId) {
          throw new Error("Request ID not found for this campaign");
        }

        // Optimistic update
        setState((prev) => {
          const campaign = prev.pendingCampaigns.find(
            (c) => c._id === campaignId
          );
          return {
            ...prev,
            requestStatuses: {
              ...prev.requestStatuses,
              [campaignId]: "not_applied",
            },
            pendingRequestIds: Object.entries(prev.pendingRequestIds)
              .filter(([id]) => id !== campaignId)
              .reduce((acc, [id, val]) => ({ ...acc, [id]: val }), {}),
            pendingCampaigns: prev.pendingCampaigns.filter(
              (c) => c._id !== campaignId
            ),
            ...(campaign && { campaigns: [...prev.campaigns, campaign] }),
          };
        });

        const result = await showConfirmation(
          t("confirmCancelTitle", "Are you sure?"),
          t(
            "confirmCancelText",
            "Are you sure you want to cancel this request?"
          ),
          t("yes", "Yes"),
          t("cancel", "Cancel")
        );

        if (result.isConfirmed) {
          const resp = await api.delete(`/campaign-request`, {
            data: { requestId },
          });

          if (resp) {
            showAlert(
              t(
                "cancelSuccess",
                resp.message || "Request cancelled successfully"
              ),
              "",
              "success"
            );
          }
        }

        await Promise.all([fetchCampaigns(), fetchPendingCampaigns()]);
      } catch (error) {
        console.log("Failed to cancel request:", error);
        await Promise.all([fetchCampaigns(), fetchPendingCampaigns()]);
        // showAlert(
        //   t("error", "Error"),
        //   error.response?.data?.message ||
        //     t("cancelFailed", "Failed to cancel request. Please try again."),
        //   "error"
        // );
      }
    },
    [
      fetchCampaigns,
      fetchPendingCampaigns,
      showAlert,
      showConfirmation,
      state.pendingRequestIds,
      t,
    ]
  );

  // Handle invitation action
  const handleInvitationAction = useCallback(
    async (invitationId, action) => {
      if (action === "accept") {
        const hasStripeAccount = await checkStripeAccountId();
        if (!hasStripeAccount) return;
      }

      try {
        const result = await showConfirmation(
          t("confirmInvitationTitle", "Are you sure?"),
          t("confirmInvitationText", { action })
        );

        if (result.isConfirmed) {
          const response = await api.put("/campaign/invite", {
            invitationId,
            action,
          });

          if (response.data.message.includes("successfully")) {
            setState((prev) => ({
              ...prev,
              invitations: prev.invitations.filter(
                (inv) => inv._id !== invitationId
              ),
            }));

            if (action === "accept") {
              await Promise.all([fetchCampaigns(), fetchPendingCampaigns(), fetchJoinedCampaigns()]);
            }

            showAlert(
              t(
                action === "accept"
                  ? "invitationAccepted"
                  : "invitationDeclined",
                `Invitation ${
                  action === "accept" ? "accepted" : "declined"
                } successfully.`
              ),
              "",
              "success"
            );
          }
        }
      } catch (error) {
        console.log(`Failed to ${action} invitation:`, error);
        showAlert(
          t("error", "Error"),
          error.response?.data?.message || t("invitationFailed", { action }),
          "error"
        );
      }
    },
    [
      checkStripeAccountId,
      fetchCampaigns,
      fetchJoinedCampaigns,
      fetchPendingCampaigns,
      showAlert,
      showConfirmation,
      t,
    ]
  );

  // Handle favorite toggle
  const handleFavoriteClick = useCallback(
    async (campaignId, action) => {
      try {
        const result = await showConfirmation(
          t("confirmFavoriteTitle", { action }),
          t("confirmFavoriteText", { action }),
          action === "remove" ? t("yes", "Yes") : t("add", "Add"),
          action === "remove" ? t("no", "No") : t("notNow", "Not now")
        );

        if (result.isConfirmed) {
          const response = await api.post("/favorite-campaign", {
            campaignId,
            action,
          });

          if (
            response.data.action === "added" ||
            response.data.action === "removed"
          ) {
            await fetchFavoriteCampaigns();
            showAlert(
              t("favoriteSuccess", {
                action: response.data.action,
              }),
              "",
              "success"
            );
          }
        }
      } catch (error) {
        console.log("Failed to update favorite campaigns:", error);
        showAlert(
          t("error", "Error"),
          error.response?.data?.message ||
            t(
              "favoriteFailed",
              "Failed to update favorite campaigns. Please try again."
            ),
          "error"
        );
      }
    },
    [fetchFavoriteCampaigns, showAlert, showConfirmation, t]
  );

  // Initial data fetch
  useEffect(() => {
    if (userId && user?.role === "sports-ambassador") {
      const fetchInitialData = async () => {
        try {
          await Promise.all([
            fetchCampaigns(),
            fetchJoinedCampaigns(),
            fetchPendingCampaigns(),
            fetchInvitations(),
            fetchFavoriteCampaigns(),
          ]);
        } finally {
          setState((prev) => ({ ...prev, loading: false }));
        }
      };

      fetchInitialData();
    }
  }, [
    userId,
    user?.role,
    fetchCampaigns,
    fetchJoinedCampaigns,
    fetchPendingCampaigns,
    fetchInvitations,
    fetchFavoriteCampaigns,
  ]);

  return {
    state,
    fetchCampaigns,
    fetchJoinedCampaigns,
    handleApplyClick,
    handleJoinClick,
    handleCancelClick,
    handleInvitationAction,
    handleFavoriteClick,
    handleFavourites,
    fetchFavourites,
  };
};
