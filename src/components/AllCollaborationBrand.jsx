"use client";

import { useSocket } from "@/context/SocketContext";
import useDebounce from "@/hook/useDebounce";
import api from "@/lib/axios";
import { toCamelCase } from "@/lib/helper";
import { useAuthStore } from "@/store/authStore";
import IconsLibrary from "@/util/IconsLibrary";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import DefaultLayout from "./Common/DefaultLayout.jsx/DefaultLayout";
import Pagination from "./Pagination/pagination";
import { useTranslations } from "next-intl";
import Sidebar from "./Sidebar";

const AllCollaborationBrand = ({
  ambassadors = [],
  initialRequests = [],
  collaborations = [],
  totalAmbassadors = 0,
  currentPage = 1,
  limit = 10,
  searchTerm = "",
  currentPage2 = 1,
  totalCollaborations = 0,
}) => {
  const t = useTranslations("Brand.myTeam");
  const toastAlert = useTranslations("Sweetalert");
  const router = useRouter();
  const socket = useSocket();
  const [details, setDetails] = useState(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [requests, setRequests] = useState(initialRequests);
  const [loadingStates, setLoadingStates] = useState({});
  const { user } = useAuthStore();
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const debouncedSearchTerm = useDebounce(localSearchTerm, 500);
  const [favourites, setFavourites] = useState([]);
  // Calculate total pages
  const totalPages = Math.ceil(totalAmbassadors / limit);
  const totalPages2 = Math.ceil(totalCollaborations / limit);

  // Handle search input change
  const handleSearchChange = (e) => {
    setLocalSearchTerm(e.target.value);
  };

  // Update URL when debounced search term changes
  useEffect(() => {
    router.push(`?search=${encodeURIComponent(debouncedSearchTerm)}&page=1`);
  }, [debouncedSearchTerm, router]);

  useEffect(() => {
    getFavList();
  }, []);

  const getFavList = async () => {
    try {
      const resp = await api.get("/favourites");
      setFavourites(resp?.data);
    } catch (error) {}
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      router.push(
        `?search=${encodeURIComponent(debouncedSearchTerm)}&page=${newPage}`
      );
    }
  };
  const handlePageChange2 = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages2) {
      router.push(`?page2=${newPage}`, { scroll: false });
    }
  };

  // Socket connection
  useEffect(() => {
    if (!socket) return;
    socket.emit("join-user-room", user?.onboardedDetails._id);
  }, [socket, user?.onboardedDetails?._id]);

  // Extract ambassador data (unchanged)
  const extractData = (ambassador, fields) => {
    for (const role of fields.roles) {
      const data = ambassador[role];
      if (data) {
        return {
          name: data.name || "Unnamed",
          sport: Array.isArray(data.sports)
            ? data.sports.join(", ")
            : data.sport || "N/A",
          level: data.level || "N/A",
          image: data.images?.find((img) => img.isProfile)?.url || null,
        };
      }
    }
    return {
      name: "Unnamed",
      sport: "N/A",
      level: "N/A",
      image: null,
    };
  };

  // Status badge component (unchanged)
  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`text-xs px-2 py-1 rounded-full ${
          statusClasses[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  // Handle adding ambassador (unchanged)
  const handleAdd = async (ambassadorId) => {
    const previousRequest = requests[ambassadorId];
    const wasRejected = previousRequest?.status === "rejected";

    try {
      const result = await Swal.fire({
        title: toastAlert("sure"),
        text: toastAlert("sendInvite"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: toastAlert("yes"),
        cancelButtonText: toastAlert("cancel"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      });

      if (!result.isConfirmed) return;

      setLoadingStates((prev) => ({ ...prev, [ambassadorId]: "adding" }));

      const response = await api.post("/brand/sports-ambassador", {
        ambassadorId,
      });

      if (response.data) {
        Swal.fire({
          title: toastAlert("invitationSent"),
          position: "top-right",
          icon: "success",
          toast: true,
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 5000,
        });
        setRequests((prev) => ({
          ...prev,
          [ambassadorId]: {
            id: response.data._id,
            status: response.data.status,
            createdAt: response.data.createdAt,
          },
        }));

        if (wasRejected) {
          router.refresh();
        }
      }
    } catch (error) {
      console.error("Error adding ambassador:", error);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [ambassadorId]: null }));
    }
  };

  // Handle canceling request (unchanged)
  const handleCancel = async (ambassadorId) => {
    const request = requests[ambassadorId];
    if (!request) return;

    setLoadingStates((prev) => ({ ...prev, [ambassadorId]: "cancelling" }));

    try {
      Swal.fire({
        title: toastAlert("sure"),
        text: toastAlert("cancelInvite"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: toastAlert("yes"),
        cancelButtonText: toastAlert("cancel"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      }).then(async (result) => {
        if (result.isConfirmed) {
          const resp = await api.delete(`/brand/sports-ambassador`, {
            data: { requestId: request.id },
          });
          if (resp) {
            Swal.fire({
              title: toastAlert("requestCancelled"),
              position: "top-right",
              icon: "success",
              toast: true,
              showConfirmButton: false,
              timerProgressBar: false,
              timer: 5000,
            });
            setRequests((prev) => {
              const newState = { ...prev };
              delete newState[ambassadorId];
              return newState;
            });
            router.refresh();
          }
        }
      });
    } catch (error) {
    } finally {
      setLoadingStates((prev) => ({ ...prev, [ambassadorId]: null }));
    }
  };

  // Handle sending message (unchanged)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !socket || isSending) return;

    const tempId = `temp-${Date.now()}`;
    const newMessage = {
      senderId: user.onboardedDetails._id,
      receiverId: details._id,
      content: message.trim(),
      _id: tempId,
      timestamp: new Date(),
      read: false,
      attachment: null,
    };

    setIsSending(true);
    try {
      setMessage("");
      socket.emit("send-message", {
        senderId: newMessage.senderId,
        receiverId: newMessage.receiverId,
        content: newMessage.content,
        attachment: newMessage.attachment,
      });
      Swal.fire({
        title: toastAlert("messageSent"),
        position: "top-right",
        icon: "success",
        toast: true,
        showConfirmButton: false,
        timerProgressBar: false,
        timer: 5000,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
      closeModal();
    }
  };

  // Close modal (unchanged)
  const closeModal = () => {
    setDetails(null);
    setMessage("");
  };

  // Format sports data (unchanged)
  const formatSports = (sports) => {
    if (!sports) return "Sport not specified";
    if (Array.isArray(sports)) return sports.join(", ");
    return sports;
  };

  const toggleFav = async (ambId) => {
    try {
      const resp = await api.post("/favourites", { id: ambId });

      if (resp.success) {
        Swal.fire({
          title: `${
            resp.message === "Created"
              ? toastAlert("addFavTxt")
              : toastAlert("removeFavTxt")
          }`,
          position: "top-right",
          icon: "success",
          toast: true,
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 5000,
        });
        getFavList();
      }
    } catch (error) {}
  };

  return (
    <div className="flex flex-col bg-gray-100">
      <div className="flex flex-1 lg:flex-row flex-wrap flex-col relative">
        <Sidebar />

        <div className="flex-1 p-4 pt-8 md:p-6 md:pt-10">
          <div>
            {/* Message Modal (unchanged) */}
            {details && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-gray-800">
                      {t("sendMessage")}
                    </h2>
                    <button
                      onClick={closeModal}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <form onSubmit={handleSendMessage}>
                    <div className="mb-4">
                      <textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="4"
                        placeholder={t("placeholder")}
                        required
                        disabled={isSending}
                      ></textarea>
                    </div>
                    <div className="flex justify-end gap-4">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 bg-[#F26915] text-white rounded-md cursor-pointer"
                        disabled={isSending}
                      >
                        {t("Cancel")}
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#390A21] text-white rounded-md cursor-pointer disabled:bg-blue-400"
                        disabled={isSending}
                      >
                        {isSending ? t("sending") : t("send")}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Available Sports Ambassadors Section */}
            <div>
              <div className="bg-white pt-6 pb-[50px] md:pb-[100px] px-5 rounded-lg ">
                {/* Your Collaborations Section (unchanged) */}
                <div className="bg-white rounded-lg mb-20">
                  <h2 className="text-3xl md:text-5xl font-normal mb-3 md:mb-6 text-[#0C0D06]">
                    {t("team")}
                  </h2>
                  <p className="text-[18px] font-normal mb-5 md:mb-10">
                    {t("subHeading")}
                  </p>

                  {collaborations.length === 0 ? (
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
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {t("fallback2")}
                      </h3>
                      <p className="text-sm text-gray-500">{t("para2")}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {collaborations.map((collaboration) => {
                        const subRole = toCamelCase(
                          collaboration?.subRole || ""
                        );
                        const name =
                          collaboration[subRole]?.name || "Unknown Ambassador";
                        const sport = formatSports(
                          collaboration[subRole]?.sport ||
                            collaboration[subRole]?.sports
                        );
                        const image = collaboration[subRole]?.images[0]?.url;
                        const isFavorite = favourites.some(
                          (fav) => fav.ambassadorId?._id === collaboration._id
                        );
                        return (
                          <div
                            key={collaboration._id}
                            className="bg-white rounded-lg flex flex-col relative"
                          >
                            <span
                              onClick={() => {
                                toggleFav(collaboration?._id);
                              }}
                              className="absolute right-4 top-4"
                            >
                              {isFavorite ? (
                                <IconsLibrary name={"star_mp_filled"} />
                              ) : (
                                <IconsLibrary name={"star_mp"} />
                              )}
                            </span>
                            <div className="flex items-center space-x-3">
                              {image ? (
                                <img
                                  src={image}
                                  alt={`${name}'s profile`}
                                  className="w-full h-[280px] md:h-[360px] rounded-2xl object-cover border border-gray-200 cursor-pointer"
                                  onClick={() =>
                                    router.push(
                                      `/sports-ambassador-profile/${collaboration.subRole}/${collaboration.supabaseId}`
                                    )
                                  }
                                />
                              ) : (
                                <div className="w-full h-[280px] md:h-[360px] rounded-2xl object-cover border border-gray-200 bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                                  No Image
                                </div>
                              )}
                            </div>
                            <div className="mt-4">
                              <h3 className="text-[18px] font-bold text-[#0C0D06] mb-1">
                                {name}
                              </h3>
                              <p className="text-sm font-normal text-[#0C0D06]">
                                {subRole}
                              </p>
                              <div className="flex gap-2 mt-auto">
                                <button
                                  className="mt-4 px-3 py-1.5 bg-[#F26915] text-white rounded-full  w-full text-md"
                                  onClick={() => {
                                    setDetails({
                                      ...collaboration,
                                      name,
                                      subRole,
                                    });
                                  }}
                                >
                                  {t("sendMessage")}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <Pagination
                  currentPage={currentPage2}
                  pageCount={totalPages2}
                  onPageChange={handlePageChange2}
                />
                <h2 className="text-3xl md:text-5xl font-normal mb-3 md:mb-6 text-[#0C0D06]">
                  {t("heading")}
                </h2>
                <p className="text-[18px] font-normal mb-5 md:mb-10">
                  {t("invite")}
                </p>

                {/* Search Input */}
                <div className="relative mb-14">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <IconsLibrary name="searchIcon" />
                  </span>
                  <input
                    type="text"
                    placeholder={t("placeholder2")}
                    value={localSearchTerm}
                    onChange={handleSearchChange}
                    className="w-full sm:w-[25%] h-10 md:h-12 pl-10 pr-3 py-3 bg-[#0C0D060D] border border-[#0C0D06] rounded-[12px] focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="w-full">
                  {ambassadors.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">{t("fallback")}</p>
                    </div>
                  ) : (
                    <>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-[24px] gap-y-[60px]">
                        {ambassadors.map((ambassador) => {
                          const { name, sport, level, image } = extractData(
                            ambassador,
                            {
                              roles: [
                                "athlete",
                                "team",
                                "coach",
                                "paraAthlete",
                                "exAthlete",
                                "influencer",
                              ],
                            }
                          );

                          const request = requests[ambassador._id];
                          const isLoading = loadingStates[ambassador._id];
                          const isRejected = request?.status === "rejected";
                          const isFavorite = favourites.some(
                            (fav) => fav.ambassadorId?._id === ambassador._id
                          );

                          return (
                            <li
                              key={ambassador._id}
                              className="rounded-lg bg-white flex flex-col relative"
                            >
                              <span
                                onClick={() => {
                                  toggleFav(ambassador?._id);
                                }}
                                className="absolute right-4 top-4"
                              >
                                {isFavorite ? (
                                  <IconsLibrary name={"star_mp_filled"} />
                                ) : (
                                  <IconsLibrary name={"star_mp"} />
                                )}
                              </span>
                              <div className="flex items-center space-x-3">
                                {image ? (
                                  <img
                                    src={image}
                                    alt={`${name}'s profile`}
                                    className="w-full h-[280px] md:h-[360px] rounded-2xl object-cover border border-gray-200 cursor-pointer"
                                    onClick={() =>
                                      router.push(
                                        `/sports-ambassador-profile/${ambassador.subRole}/${ambassador.supabaseId}`
                                      )
                                    }
                                  />
                                ) : (
                                  <div className="w-full h-[280px] md:h-[360px] rounded-2xl object-cover border border-gray-200 bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                                    No Image
                                  </div>
                                )}
                              </div>
                              <div className="mt-4">
                                <h2 className="text-[18px] font-bold text-[#0C0D06] mb-1">
                                  {name}
                                </h2>
                                <p className="text-sm font-normal text-[#0C0D06]">
                                  {ambassador.subRole}
                                </p>
                              </div>
                              {request && !isRejected ? (
                                <div className="mt-4 flex flex-col gap-2">
                                  {request.status === "pending" && (
                                    <button
                                      className="button !h-fit px-3 py-1.5 bg-red-700 text-white rounded-md  hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-150 w-full text-sm"
                                      onClick={() =>
                                        handleCancel(ambassador._id)
                                      }
                                      disabled={isLoading === "cancelling"}
                                    >
                                      {isLoading === "cancelling"
                                        ? t("Processing")
                                        : t("Cancel")}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <button
                                  className="mt-4 px-3 py-1.5 bg-[#390A21] text-white rounded-full  w-full text-md"
                                  onClick={() => {
                                    user.onboardedDetails.permission ==
                                    "Can View"
                                      ? Swal.fire({
                                          title: toastAlert("denied"),
                                          text: toastAlert("text"),
                                          icon: "error",
                                          position: "center",
                                          showConfirmButton: true,
                                          timerProgressBar: false,
                                          timer: 5000,
                                        })
                                      : handleAdd(ambassador._id);
                                  }}
                                  disabled={isLoading === "adding"}
                                >
                                  {isLoading === "adding"
                                    ? t("Processing")
                                    : t("Invite")}
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <Pagination
                          currentPage={currentPage}
                          pageCount={totalPages}
                          onPageChange={handlePageChange}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllCollaborationBrand;
