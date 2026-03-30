"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useSocket } from "@/context/SocketContext";
import Image from "next/image";
import Loader from "./Loader";
import Swal from "sweetalert2";
import Pagination from "./Pagination/pagination";
import { useTranslations } from "next-intl";
import SidebarSports from "./SidebarSports";

/**
 * Component for managing brand collaborations
 * @returns {JSX.Element} Rendered component
 */
const AllBrandCollaboration = () => {
  // Hooks and context
  const { user } = useAuthStore();
  const router = useRouter();
  const socket = useSocket();
  const t = useTranslations("Sports.collaboration");
  const toastAlert = useTranslations("Sweetalert");

  // Unified state management
  const [state, setState] = useState({
    loading: true,
    error: null,
    collaborations: {
      pending: {
        data: [],
        pagination: {
          currentPage: 1,
          totalItems: 0,
          totalPages: 0,
          limit: 10,
        },
      },
      accepted: {
        data: [],
        pagination: {
          currentPage: 1,
          totalItems: 0,
          totalPages: 0,
          limit: 10,
        },
      },
    },
    messageModal: {
      open: false,
      details: null,
      message: "",
      isSending: false,
    },
  });

  const ambassadorId = user?.onboardedDetails?._id;

  // Socket connection
  useEffect(() => {
    if (socket && ambassadorId) {
      socket.emit("join-user-room", ambassadorId);
    }
  }, [socket, ambassadorId]);

  // Data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true }));

        const [pendingRes, acceptedRes] = await Promise.all([
          api.get(
            `/sports/collaboration?page=${state.collaborations.pending.pagination.currentPage}`
          ),
          api.get(
            `/sports/accepted-collaboration?page=${state.collaborations.accepted.pagination.currentPage}`
          ),
        ]);

        setState((prev) => ({
          ...prev,
          collaborations: {
            pending: {
              data: pendingRes?.data?.data || [],
              pagination: {
                ...prev.collaborations.pending.pagination,
                ...pendingRes?.data?.pagination,
              },
            },
            accepted: {
              data: acceptedRes?.data || [],
              pagination: {
                ...prev.collaborations.accepted.pagination,
                ...acceptedRes?.pagination,
              },
            },
          },
          loading: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err.message || "Failed to fetch data",
          loading: false,
        }));
      }
    };

    if (ambassadorId) {
      fetchData();
    }
  }, [
    ambassadorId,
    state.collaborations.pending.pagination.currentPage,
    state.collaborations.accepted.pagination.currentPage,
  ]);

  /**
   * Handles pagination change for either pending or accepted collaborations
   * @param {"pending"|"accepted"} type - The collaboration type
   * @param {number} selectedPage - The selected page number
   */
  const handlePageChange = (type, selectedPage) => {
    setState((prev) => ({
      ...prev,
      collaborations: {
        ...prev.collaborations,
        [type]: {
          ...prev.collaborations[type],
          pagination: {
            ...prev.collaborations[type].pagination,
            currentPage: selectedPage,
          },
        },
      },
    }));
  };

  /**
   * Updates the status of a collaboration request
   * @param {string} requestId - The ID of the request
   * @param {"accepted"|"rejected"} newStatus - The new status to set
   */
  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      const action = newStatus === "accepted" ? "accept" : "decline";

      const result = await Swal.fire({
        title: toastAlert("sure"),
        text: `${toastAlert("msg")}${action}${toastAlert("request")}`,
        icon: "success",
        showCancelButton: true,
        confirmButtonText: toastAlert("yes"),
        cancelButtonText: toastAlert("cancel"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      });

      if (!result.isConfirmed) return;

      const response = await api.put(`/brand/sports-ambassador`, {
        requestId,
        action,
      });
      if (response) {
        Swal.fire({
          title:
            action === "accept"
              ? toastAlert("accepted")
              : toastAlert("declined"),
          position: "top-right",
          icon: "success",
          toast: true,
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 3000,
        });

        // Optimistically update lists locally
        setState((prev) => {
          const pendingList = prev.collaborations.pending.data;
          const target = pendingList.find((r) => r._id === requestId);
          const newPending = pendingList.filter((r) => r._id !== requestId);

          let newAccepted = prev.collaborations.accepted.data;
          if (newStatus === "accepted" && target) {
            const acceptedItem = {
              ...target,
              status: "accepted",
              // Normalize for accepted card UI which uses req.brand?.*
              brand: {
                companyName: target?.brandId?.companyName,
                companyLogo: target?.brandId?.companyLogo,
              },
            };
            newAccepted = [acceptedItem, ...newAccepted];
          }

          return {
            ...prev,
            collaborations: {
              ...prev.collaborations,
              pending: {
                ...prev.collaborations.pending,
                data: newPending,
                pagination: {
                  ...prev.collaborations.pending.pagination,
                  totalItems: Math.max(
                    0,
                    (prev.collaborations.pending.pagination.totalItems || 0) - 1
                  ),
                },
              },
              accepted: {
                ...prev.collaborations.accepted,
                data: newAccepted,
              },
            },
          };
        });
      }
    } catch (err) {
      console.error("Error updating request status:", err);
      setState((prev) => ({
        ...prev,
        error: err.response?.data?.message || "Failed to update request status",
      }));
    } finally {
      // no-op: avoid toggling global loading spinner for per-item updates
    }
  };

  /**
   * Handles sending a message to a brand
   * @param {React.FormEvent} e - The form event
   */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const { details, message } = state.messageModal;

    if (!message.trim() || !socket || state.messageModal.isSending) return;

    try {
      setState((prev) => ({
        ...prev,
        messageModal: { ...prev.messageModal, isSending: true },
      }));

      const newMessage = {
        senderId: user.onboardedDetails._id,
        receiverId: details._id,
        content: message.trim(),
        timestamp: new Date(),
        read: false,
        attachment: null,
      };

      socket.emit("send-message", {
        senderId: newMessage.senderId,
        receiverId: newMessage.receiverId,
        content: newMessage.content,
        attachment: newMessage.attachment,
      });

      Swal.fire({
        title: toastAlert("msgSuccessTag"),
        position: "top-right",
        icon: "success",
        toast: true,
        showConfirmButton: false,
        timerProgressBar: false,
        timer: 3000,
      });

      closeModal();
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setState((prev) => ({
        ...prev,
        messageModal: { ...prev.messageModal, isSending: false },
      }));
    }
  };

  /**
   * Opens the message modal with brand details
   * @param {Object} brandDetails - Details of the brand to message
   */
  const openModal = (brandDetails) => {
    setState((prev) => ({
      ...prev,
      messageModal: {
        ...prev.messageModal,
        open: true,
        details: brandDetails,
      },
    }));
  };

  /**
   * Closes the message modal and resets form
   */
  const closeModal = () => {
    setState((prev) => ({
      ...prev,
      messageModal: {
        open: false,
        details: null,
        message: "",
        isSending: false,
      },
    }));
  };

  // Helper function to check view permissions
  const checkPermission = () => {
    if (user?.onboardedDetails?.permission === "Can View") {
      Swal.fire({
        title: toastAlert("denied"),
        text: toastAlert("permissionText"),
        icon: "info",
        showConfirmButton: true,
        timerProgressBar: false,
        timer: 5000,
      });
      return true;
    }
    return false;
  };

  if (state.loading) {
    return (
      <div className="p-4 items-center flex justify-center h-screen">
        <Loader />
      </div>
    );
  }

  if (state.error) {
    return <div className="p-4 text-red-500">{state.error}</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex flex-1 relative">
        <SidebarSports />

        <div className="flex-1 p-4 pt-8 md:p-6 md:pt-10 flex flex-col overflow-auto">
          {/* Message Modal */}
          {state.messageModal.open && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold text-gray-800">
                    {t("messageModal.sendMsg")}
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
                <div className="mb-4">
                  <p className="text-gray-700">
                    <span className="font-semibold">
                      {t("messageModal.brand")}
                    </span>
                    {state.messageModal.details.name || "Unknown Brand"}
                  </p>
                </div>
                <form onSubmit={handleSendMessage}>
                  <div className="mb-4">
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {t("messageModal.message")}
                    </label>
                    <textarea
                      id="message"
                      value={state.messageModal.message}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          messageModal: {
                            ...prev.messageModal,
                            message: e.target.value,
                          },
                        }))
                      }
                      className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="4"
                      placeholder={t("messageModal.placeholder")}
                      required
                      disabled={state.messageModal.isSending}
                    ></textarea>
                  </div>
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 bg-[#f26915] text-[#ffffff] rounded-md cursor-pointer"
                      disabled={state.messageModal.isSending}
                    >
                      {t("messageModal.cancel")}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#390a21] text-white rounded-md cursor-pointer disabled:bg-blue-400"
                      disabled={state.messageModal.isSending}
                    >
                      {state.messageModal.isSending
                        ? t("messageModal.send")
                        : t("messageModal.send2")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Collaboration Requests Section */}
          <section>
            <h2 className="text-[36px] lg:text-[48px] mb-10 lg:mb-[110px]">
              {t("request.heading")}
            </h2>
            {state.collaborations.pending.data.length === 0 ? (
              <p className="text-gray-600">{t("request.fallback")}</p>
            ) : (
              <div className="grid gridCard">
                {state.collaborations.pending.data.map((request) => (
                  <div
                    key={request._id}
                    className="max-w-[283px] flex flex-col"
                  >
                    <div>
                      <Image
                        src={request?.brandId?.companyLogo || ""}
                        alt="Company Logo"
                        height={283}
                        width={360}
                        className="rounded-2xl"
                      />
                      <h2 className="text-lg font-bold leading-[150%] tracking-[0] mt-4">
                        {request.brandId?.companyName || "Unknown Brand"}
                      </h2>
                      {request.status === "pending" && (
                        <div className="flex flex-col gap-4 mt-4">
                          <button
                            onClick={() => {
                              if (!checkPermission()) {
                                handleStatusUpdate(request._id, "rejected");
                              }
                            }}
                            className="px-4 py-3 rounded-lg grayBtn transition-colors text-black w-full"
                          >
                            {t("request.reject")}
                          </button>
                          <button
                            onClick={() => {
                              if (!checkPermission()) {
                                handleStatusUpdate(request._id, "accepted");
                              }
                            }}
                            className="px-4 py-2 primaryBtnPurple transition-colors text-white rounded-lg w-full"
                          >
                            {t("request.accept")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {state.collaborations.pending.pagination.totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination
                      currentPage={
                        state.collaborations.pending.pagination.currentPage
                      }
                      pageCount={
                        state.collaborations.pending.pagination.totalPages
                      }
                      onPageChange={(page) => handlePageChange("pending", page)}
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Accepted Collaborations Section */}
          {state.collaborations.accepted.data.length > 0 && (
            <section className="mt-20 lg:mt-[106px]">
              <h2 className="text-[36px] lg:text-[48px] mb-10 lg:mb-[110px]">
                {t("accepted.heading")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {state.collaborations.accepted.data.map((req, index) => {
                  const name = req.brand?.companyName;
                  const logo = req.brand?.companyLogo;

                  return (
                    <div key={index} className="">
                      <div className="max-w-[283px] overflow-hidden">
                        <img
                          src={logo || "/default-athlete.jpg"}
                          alt={name}
                          className="w-full h-[360px] rounded-2xl"
                          onError={(e) => {
                            e.target.src = "/default-athlete.jpg";
                          }}
                        />
                        <div className="mt-4">
                          <h3 className="font-bold text-lg leading-[150%] tracking-[0]">
                            {name || "Unknown Brand"}
                          </h3>
                          <button
                            className="mt-4 !h-[40px] primaryBtnPlain text-white w-full flex justify-center items-center"
                            onClick={() => openModal({ ...req, name })}
                          >
                            {t("messageModal.sendMsg")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {state.collaborations.accepted.pagination.totalPages > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={
                      state.collaborations.accepted.pagination.currentPage
                    }
                    pageCount={
                      state.collaborations.accepted.pagination.totalPages
                    }
                    onPageChange={(page) => handlePageChange("accepted", page)}
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

export default AllBrandCollaboration;
