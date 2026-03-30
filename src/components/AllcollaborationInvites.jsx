"use client";
import api from "@/lib/axios";
import { toCamelCase } from "@/lib/helper";
import { useAuthStore } from "@/store/authStore";
import { buildAmbassadorSlug } from "@/util/buildAmbassadorSlug";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Loader from "./Loader";
import Pagination from "./Pagination/pagination";
import SidebarSports from "./SidebarSports";

/**
 * Component for displaying and managing collaboration invites
 * @param {Object} props - Component props
 * @param {Array} [props.invites=[]] - List of collaboration invites
 * @param {number} props.invitesTotal - Total number of invites
 * @param {number} [props.invitesCurrentPage=1] - Current page for invites pagination
 * @param {number} [props.limit=10] - Number of items per page
 * @param {Object} [props.initialRequests={}] - Initial requests data
 * @param {Array} [props.acceptedRes=[]] - List of accepted collaborations
 * @param {number} props.acceptedTotal - Total number of accepted collaborations
 * @param {number} [props.acceptedCurrentPage=1] - Current page for accepted collaborations pagination
 * @param {Array} [props.roles=["athlete", "coach", "paraAthlete", "exAthlete", "influencer"]] - User roles to consider
 * @returns {JSX.Element} - Rendered component
 */
const AllCollaborationInvites = ({
  invites = [],
  invitesTotal,
  invitesCurrentPage = 1,
  limit = 10,
  initialRequests = {},
  acceptedRes = [],
  acceptedTotal,
  acceptedCurrentPage = 1,
  roles = ["athlete", "coach", "paraAthlete", "exAthlete", "influencer"],
}) => {
  const router = useRouter();
  const t = useTranslations("Sports.invites");
  const toastAlert = useTranslations("Sweetalert");
  const { user } = useAuthStore();
  const [requests, setRequests] = useState(initialRequests);
  const [loadingStates, setLoadingStates] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Memoized calculations
  const invitesPageCount = useMemo(
    () => Math.ceil(invitesTotal / limit),
    [invitesTotal, limit]
  );
  const acceptedPageCount = useMemo(
    () => Math.ceil(acceptedTotal / limit),
    [acceptedTotal, limit]
  );
  const canViewOnly = user?.onboardedDetails?.permission === "Can View";

  useEffect(() => {
    setIsLoading(false);
  }, []);

  /**
   * Sends a collaboration invite
   * @param {string} ambassadorId - ID of the ambassador to invite
   * @returns {Promise<Object|null>} - Response data or null if failed
   */
  const onSend = useCallback(async (ambassadorId) => {
    try {
      const response = await api.post("/sports/collaboration-invite", {
        ambassadorId,
      });
      return response.data;
    } catch (error) {
      console.error("Error sending invite:", error);
      return null;
    }
  }, []);

  /**
   * Cancels a collaboration invite
   * @param {string} requestId - ID of the request to cancel
   * @returns {Promise<boolean>} - True if successful, false otherwise
   */
  const onCancel = useCallback(async (requestId) => {
    try {
      await api.delete(`/sports/collaboration-invite`, { data: { requestId } });
      return true;
    } catch (error) {
      console.error("Error canceling invite:", error);
      return false;
    }
  }, []);

  // Navigation handlers
  const handleInvitesPageChange = useCallback(
    (selectedPage) => {
      router.push(
        `/sports-ambassador/collaboration-invite?page=${selectedPage}`
      );
    },
    [router]
  );

  const handleAcceptedPageChange = useCallback(
    (selectedPage) => {
      router.push(
        `/sports-ambassador/collaboration-invite?page2=${selectedPage}`,
        { scroll: false }
      );
    },
    [router]
  );

  /**
   * Extracts relevant data from ambassador object
   * @param {Object} ambassador - Ambassador data object
   * @returns {Object} - Extracted data (name, sport, level, image, subRole)
   */
  const extractData = useCallback(
    (ambassador) => {
      if (ambassador.team) {
        return {
          name: ambassador.team.teamClubName || "Unnamed Team",
          sport: Array.isArray(ambassador.team.sports)
            ? ambassador.team.sports.join(", ")
            : ambassador.team.sport || "N/A",
          level: ambassador.team.level || "N/A",
          image:
            ambassador.team.images?.find((img) => img.isProfile)?.url || null,
          subRole: ambassador.subRole,
        };
      }

      for (const role of roles) {
        const data = ambassador[role];
        if (data) {
          return {
            name: data.name || "Unnamed",
            sport:
              data.sport ||
              (Array.isArray(data.sports) ? data.sports.join(", ") : "N/A"),
            level: data.level || "N/A",
            image: data.images?.find((img) => img.isProfile)?.url || null,
            subRole: ambassador.subRole,
          };
        }
      }

      return {
        name: "Unnamed",
        sport: "N/A",
        level: "N/A",
        image: null,
        subRole: ambassador.subRole,
      };
    },
    [roles]
  );

  /**
   * Formats sports data for display
   * @param {string|Array} sports - Sports data to format
   * @returns {string} - Formatted sports string
   */
  const formatSports = useCallback((sports) => {
    if (!sports) return "Sport not specified";
    if (Array.isArray(sports)) return sports.join(", ");
    return sports;
  }, []);

  /**
   * Shows permission denied alert
   */
  const showPermissionDeniedAlert = useCallback(() => {
    Swal.fire({
      title: toastAlert("denied"),
      text: toastAlert("permissionText"),
      icon: "info",
      showConfirmButton: true,
      timerProgressBar: false,
      timer: 5000,
    });
  }, []);

  /**
   * Handles sending collaboration request
   * @param {string} ambassadorId - ID of ambassador to send request to
   */
  const handleSend = useCallback(
    async (ambassadorId) => {
      const result = await Swal.fire({
        title: toastAlert("sure"),
        text: toastAlert("confirmApplyText"),
        icon: "info",
        showCancelButton: true,
        confirmButtonText: toastAlert("yes"),
        cancelButtonText: toastAlert("cancel"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      });

      if (!result.isConfirmed) return;

      const previousRequest = requests[ambassadorId];
      const wasRejected = previousRequest?.status === "rejected";

      setLoadingStates((prev) => ({ ...prev, [ambassadorId]: "sending" }));
      const response = await onSend(ambassadorId);

      if (response) {
        Swal.fire({
          title: toastAlert("sentRequest"),
          position: "top-right",
          icon: "success",
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });

        setRequests((prev) => ({
          ...prev,
          [ambassadorId]: {
            id: response._id,
            status: response.status,
            createdAt: response.createdAt,
          },
        }));

        if (wasRejected) router.refresh();
      }

      setLoadingStates((prev) => ({ ...prev, [ambassadorId]: null }));
    },
    [onSend, requests, router]
  );

  /**
   * Handles canceling collaboration request
   * @param {string} ambassadorId - ID of ambassador to cancel request for
   */
  const handleCancel = useCallback(
    async (ambassadorId) => {
      const result = await Swal.fire({
        title: toastAlert("sure"),
        text: toastAlert("requestCancelText"),
        icon: "info",
        showCancelButton: true,
        confirmButtonText: toastAlert("yes"),
        cancelButtonText: toastAlert("cancel"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      });

      if (!result.isConfirmed) return;

      const request = requests[ambassadorId];
      if (!request) return;

      setLoadingStates((prev) => ({ ...prev, [ambassadorId]: "cancelling" }));
      const success = await onCancel(request.requestId || request.id);

      if (success) {
        Swal.fire({
          title: toastAlert("requestCancelled"),
          position: "top-right",
          icon: "success",
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });

        setRequests((prev) => {
          const newState = { ...prev };
          delete newState[ambassadorId];
          return newState;
        });

        router.refresh();
      }

      setLoadingStates((prev) => ({ ...prev, [ambassadorId]: null }));
    },
    [onCancel, requests, router]
  );

  /**
   * Empty state component
   * @param {Object} props - Component props
   * @param {string} props.title - Title text
   * @param {string} props.description - Description text
   * @returns {JSX.Element} - Rendered empty state
   */
  const EmptyState = useCallback(
    ({ title, description }) => (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
          <svg
            className="h-6 w-6 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    ),
    []
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex bg-gray-100 relative">
      <SidebarSports className="w-full max-w-[16rem] md:max-w-[20rem] xl:max-w-[24rem]" />
      <div className="flex-1 p-4 pt-8 md:p-6 md:pt-10 overflow-x-hidden overflow-y-auto max-h-[calc(100vh_-_92px)]">
        {/* Collaboration Invites Section */}
        <div>
          <h2 className="text-[36px] lg:text-[48px] mb-16">{t("heading")}</h2>
          {invites.length === 0 ? (
            <EmptyState title={t("fallbackText")} description={t("para")} />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6 xl:gap-8">
                {invites.map((invite) => {
                  const { name, sport, level, image, subRole } =
                    extractData(invite);
                  const request = requests[invite._id];
                  const isLoading = loadingStates[invite._id];
                  const isRejected = request?.status === "rejected";

                  return (
                    <div key={invite._id} className="mb-6">
                      <img
                        src={image}
                        alt={`${name}'s profile`}
                        className="w-full max-h-[360px] object-cover rounded-2xl cursor-pointer"
                        loading="lazy"
                        onClick={() =>
                          (() => {
                            const slug = buildAmbassadorSlug(invite);
                            if (slug) {
                              router.push(`/ambassador/${slug}`);
                            } else {
                              router.push(
                                `/sports-ambassador-profile/${toCamelCase(invite.subRole)}/${invite.supabaseId}`
                              );
                            }
                          })()
                        }
                      />
                      <div className="mt-4">
                        <h6 className="text-lg font-bold capitalize">{name}</h6>
                        <div className="text-base mt-4 font-normal grid grid-cols-[25%_75%]">
                          <span>{subRole}</span>
                        </div>
                      </div>
                      {request && !isRejected ? (
                        <div className="mt-4 flex flex-col gap-2">
                          {request.status === "pending" && (
                            <button
                              className="w-full grayBtn text-black rounded-full h-10 px-6"
                              onClick={() =>
                                canViewOnly
                                  ? showPermissionDeniedAlert()
                                  : handleCancel(invite._id)
                              }
                              disabled={isLoading === "cancelling"}
                            >
                              {isLoading === "cancelling"
                                ? t("process")
                                : t("cancelBtn")}
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          className="primaryBtnPurple text-white mt-4 w-full"
                          onClick={() =>
                            canViewOnly
                              ? showPermissionDeniedAlert()
                              : handleSend(invite._id)
                          }
                          disabled={isLoading === "sending"}
                        >
                          {isLoading === "sending"
                            ? t("process")
                            : t("sendBtn")}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {invitesPageCount > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={invitesCurrentPage}
                    pageCount={invitesPageCount}
                    onPageChange={handleInvitesPageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Accepted Collaborations Section */}
        <div>
          <h2 className="text-[36px] lg:text-[48px] my-16">
            {t("acceptedHeading")}
          </h2>
          {acceptedRes.length === 0 ? (
            <EmptyState title={t("fallbackText2")} description={t("text")} />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6 xl:gap-8">
                {acceptedRes.map((req) => {
                  const subRole = toCamelCase(req?.subRole || "");
                  const name = req[subRole]?.teamClubName;
                  const sport = req[subRole]?.sport || req[subRole]?.sports;
                  const image = req[subRole]?.images[0]?.url;

                  return (
                    <div key={`${req._id}-${subRole}`} className="mb-6">
                      <img
                        src={image}
                        alt={`${name}'s profile`}
                        className="w-full rounded-2xl max-h-[360px] object-cover cursor-pointer"
                        loading="lazy"
                        onClick={() =>
                          (() => {
                            const slug = buildAmbassadorSlug(req);
                            if (slug) {
                              router.push(`/ambassador/${slug}`);
                            } else {
                              router.push(
                                `/sports-ambassador-profile/${toCamelCase(req.subRole)}/${req.supabaseId}`
                              );
                            }
                          })()
                        }
                      />
                      <div className="mt-4">
                        <h6 className="text-lg font-bold capitalize">
                          {name || "Unknown Athlete"}
                        </h6>
                        <div className="text-base mt-4 font-normal">
                          <span>{formatSports(sport)}</span>
                        </div>
                      </div>
                      <button
                        className="primaryBtnPlain text-white mt-4 w-full"
                        onClick={() =>
                          (() => {
                            const slug = buildAmbassadorSlug(req);
                            if (slug) {
                              router.push(`/ambassador/${slug}`);
                            } else {
                              router.push(
                                `/sports-ambassador-profile/${toCamelCase(req.subRole)}/${req?.supabaseId}`
                              );
                            }
                          })()
                        }
                      >
                        {t("view")}
                      </button>
                    </div>
                  );
                })}
              </div>
              {acceptedPageCount > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={acceptedCurrentPage}
                    pageCount={acceptedPageCount}
                    onPageChange={handleAcceptedPageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllCollaborationInvites;
