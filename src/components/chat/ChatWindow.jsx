"use client";

import { useState, useEffect, useRef } from "react";
import { useSocket } from "@/context/SocketContext";
import Image from "next/image";
import { useTranslations } from "next-intl";
import Swal from "sweetalert2";

export default function ChatWindow({ currentUser, activeChat }) {
  const socket = useSocket();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerSrc, setViewerSrc] = useState("");
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null); // Ref for message container
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const partnerTypingTimeoutRef = useRef(null);
  const t = useTranslations("Sports.chat");
  const toastAlert = useTranslations("Sweetalert");

  useEffect(() => {
    const fetchMessagesAndConversation = async () => {
      try {
        const [messagesResponse, conversationsResponse, userResponse] =
          await Promise.all([
            fetch(
              `/api/messages?user1=${encodeURIComponent(
                currentUser.onboardedDetails._id
              )}&user2=${encodeURIComponent(activeChat._id)}`
            ),
            fetch(
              `/api/conversations?userId=${encodeURIComponent(
                currentUser.onboardedDetails._id
              )}`
            ),
            fetch(`/api/user/${currentUser.id}`),
          ]);

        if (!messagesResponse.ok) throw new Error("Failed to fetch messages");
        if (!conversationsResponse.ok)
          throw new Error("Failed to fetch conversations");
        if (!userResponse.ok) throw new Error("Failed to fetch user data");

        const messagesData = await messagesResponse.json();
        const conversationsData = await conversationsResponse.json();
        const userData = await userResponse.json();

        setMessages(messagesData);
        const conversation = conversationsData.find(
          (conv) => conv.participant._id === activeChat._id
        );
        if (conversation) setConversationId(conversation._id);

        // Mark messages from this participant as read once conversation loads
        try {
          await fetch(`/api/messages/mark-read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: currentUser.onboardedDetails._id,
              partnerId: activeChat._id,
            }),
          });
          // Ask server to push updated unread count to this user
          if (socket) {
            socket.emit(
              "request-unread-count",
              currentUser.onboardedDetails._id
            );
          }
        } catch (e) {
          // ignore
        }

        // Access the nested user data structure correctly
        const userDataObj = userData.data?.data || userData;
        setIsUserBlocked(
          userDataObj.blockedUsers?.some(
            (blockedId) => blockedId.toString() === activeChat._id
          ) || false
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessagesAndConversation();
  }, [activeChat._id, currentUser.onboardedDetails._id]);

  useEffect(() => {
    if (!socket || !currentUser?.onboardedDetails?._id) return;

    socket.emit("join-user-room", currentUser.onboardedDetails._id);

    const handleReceiveMessage = (newMessage) => {
      if (
        newMessage.senderId === activeChat._id ||
        newMessage.receiverId === activeChat._id
      ) {
        setMessages((prev) => {
          const filtered = prev.filter(
            (msg) =>
              !msg._id.toString().startsWith("temp-") ||
              msg._id !== `temp-${newMessage.tempId}`
          );
          return [
            ...filtered,
            {
              _id: newMessage._id,
              senderId: newMessage.senderId,
              receiverId: newMessage.receiverId,
              content: newMessage.content,
              attachment: newMessage.attachment,
              timestamp: newMessage.timestamp,
              read: newMessage.read,
            },
          ];
        });

        // If the message is to the current user from this partner, mark as read
        if (
          newMessage.senderId === activeChat._id &&
          newMessage.receiverId === currentUser.onboardedDetails._id
        ) {
          fetch(`/api/messages/mark-read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: currentUser.onboardedDetails._id,
              partnerId: activeChat._id,
            }),
          })
            .then(() => {
              if (socket) {
                socket.emit(
                  "request-unread-count",
                  currentUser.onboardedDetails._id
                );
              }
            })
            .catch(() => {});
        }
      }
    };

    const handleMessageError = (errorData) => {
      if (errorData.tempId) {
        setMessages((prev) =>
          prev.filter((msg) => msg._id !== errorData.tempId)
        );
        alert(errorData.message);
      }
    };

    const handleTyping = ({ senderId }) => {
      if (senderId === activeChat._id) {
        setIsPartnerTyping(true);
        if (partnerTypingTimeoutRef.current) {
          clearTimeout(partnerTypingTimeoutRef.current);
        }
        // Auto-hide after 2.5s in case stop-typing isn't delivered
        partnerTypingTimeoutRef.current = setTimeout(() => {
          setIsPartnerTyping(false);
        }, 2500);
      }
    };

    const handleStopTyping = ({ senderId }) => {
      if (senderId === activeChat._id) {
        setIsPartnerTyping(false);
        if (partnerTypingTimeoutRef.current) {
          clearTimeout(partnerTypingTimeoutRef.current);
          partnerTypingTimeoutRef.current = null;
        }
      }
    };

    socket.on("receive-message", handleReceiveMessage);
    socket.on("message-error", handleMessageError);
    socket.on("typing", handleTyping);
    socket.on("stop-typing", handleStopTyping);
    return () => {
      socket.off("receive-message", handleReceiveMessage);
      socket.off("message-error", handleMessageError);
      socket.off("typing", handleTyping);
      socket.off("stop-typing", handleStopTyping);
    };
  }, [socket, currentUser.onboardedDetails._id, activeChat._id]);

  useEffect(() => {
    // Scroll to the bottom of the message container
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setAttachment(null);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "upload_preset",
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      );
      formData.append("folder", "chat_attachments");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error?.message || "Failed to upload file");

      const transformedUrl = data.secure_url.replace(
        "/upload/",
        "/upload/w_1080,h_1080,c_fill/"
      );
      setAttachment(transformedUrl);
    } catch (error) {
      console.error("Error uploading file:", error);
      setAttachment(null);
      alert(`Failed to upload file: ${error.message}`);
    }
  };

  // Handle input change and emit typing events with debounce for stop-typing
  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessage(val);
    if (!socket) return;

    socket.emit("typing", {
      senderId: currentUser.onboardedDetails._id,
      receiverId: activeChat._id,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop-typing", {
        senderId: currentUser.onboardedDetails._id,
        receiverId: activeChat._id,
      });
    }, 1500);
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !attachment) return;
    if (!socket || isSending) return;

    const tempId = `temp-${Date.now()}`;
    const newMessage = {
      senderId: currentUser.onboardedDetails._id,
      receiverId: activeChat._id,
      content: message.trim() || "",
      attachment: attachment || null,
      _id: tempId,
      timestamp: new Date(),
      read: false,
    };

    setIsSending(true);
    try {
      setMessages((prev) => [...prev, newMessage]);
      setMessage("");
      setAttachment(null);
      fileInputRef.current.value = null;

      // ensure we emit stop-typing when sending
      socket.emit("stop-typing", {
        senderId: currentUser.onboardedDetails._id,
        receiverId: activeChat._id,
      });

      socket.emit("send-message", {
        senderId: newMessage.senderId,
        receiverId: newMessage.receiverId,
        content: newMessage.content,
        attachment: newMessage.attachment,
        tempId,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const handleReportUser = async () => {
    if (!reportReason.trim()) {
      alert("Please provide a reason for the report");
      return;
    }

    try {
      const response = await fetch("/api/user-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report",
          reporterId: currentUser.onboardedDetails._id,
          reportedId: activeChat._id,
          reason: reportReason,
          details: reportDetails,
          conversationId,
        }),
      });
      if (!response.ok) throw new Error("Failed to report user");
      alert("User reported successfully");
      setShowReportModal(false);
      setReportReason("");
      setReportDetails("");
    } catch (error) {
      console.error("Error reporting user:", error);
      alert(toastAlert("failedToReportUser"));
    }
  };

  const handleBlockUser = async () => {
    try {
      const result = await Swal.fire({
        title: toastAlert("sure"),
        text: toastAlert("blockText"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: toastAlert("yes"),
        cancelButtonText: toastAlert("cancel"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      });

      if (result.isConfirmed) {
        const response = await fetch("/api/user-actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "block",
            blockerId: currentUser.onboardedDetails._id,
            blockedId: activeChat._id,
          }),
        });
        if (!response.ok) throw new Error("Failed to block user");
        setIsUserBlocked(true);
        Swal.fire({
          title: toastAlert("blockSuccess"),
          position: "top-right",
          icon: "success",
          toast: true,
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 3000,
        });
      }
    } catch (error) {
      console.error("Error blocking user:", error);
      alert(toastAlert("failedToBlockUser"));
    }
  };

  const handleUnblockUser = async () => {
    try {
      const result = await Swal.fire({
        title: toastAlert("sure"),
        text: toastAlert("unblockText"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: toastAlert("yes"),
        cancelButtonText: toastAlert("cancel"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      });

      if (result.isConfirmed) {
        const response = await fetch("/api/user-actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "unblock",
            blockerId: currentUser.onboardedDetails._id,
            blockedId: activeChat._id,
          }),
        });
        if (!response.ok) throw new Error("Failed to unblock user");
        setIsUserBlocked(false);
        Swal.fire({
          title: toastAlert("unBlockSuccess"),
          position: "top-right",
          icon: "success",
          toast: true,
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 3000,
        });
      }
    } catch (error) {
      console.error("Error unblocking user:", error);
      alert(toastAlert("failedToUnblockUser"));
    }
  };

  const getProfileImage = (user) => {
    if (user.role === "brand" && user.onboardedDetails?.brand?.companyLogo)
      return user.onboardedDetails.brand.companyLogo;
    if (user.images?.length > 0) {
      const profileImage = user.images.find((img) => img.isProfile);
      return profileImage?.url || user.images[0].url;
    }
    return null;
  };

  const isImageUrl = (url) => {
    return url?.match(/\.(jpeg|jpg|gif|png|webp)$/i);
  };

  const openImageViewer = (src) => {
    setViewerSrc(src);
    setViewerOpen(true);
  };

  const closeImageViewer = () => {
    setViewerOpen(false);
    setViewerSrc("");
  };

  const downloadImage = async (src) => {
    // Pre-open window for the fallback case (Safari compatibility)
    const fallbackWindow = window.open("", "_blank");

    try {
      // Prefer original Cloudinary file when URL contains size transforms
      const origSrc = src.replace("/upload/w_1080,h_1080,c_fill/", "/upload/");
      const res = await fetch(origSrc, { mode: "cors", credentials: "omit" });
      const blob = await res.blob();
      
      // If we reach here, download is working, so close the fallback window
      if (fallbackWindow) fallbackWindow.close();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = blob.type.split("/")[1] || "png";
      a.download = `image-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed, using fallback:", e);
      // Fallback: update pre-opened window URL
      if (fallbackWindow) {
        fallbackWindow.location.href = src;
      } else {
        window.open(src, "_blank");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full font-sunset-gothic">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray bg-white flex items-center justify-between shadow-tabCustom">
        <div className="flex items-center">
          {getProfileImage(activeChat) ? (
            <div className="w-10 h-10 rounded-full overflow-hidden mr-3 shrink-0">
              <Image
                src={getProfileImage(activeChat)}
                width={40}
                height={40}
                alt={activeChat.name}
                className="object-cover w-full h-full"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray flex items-center justify-center mr-3 shrink-0">
              <span className="text-textColor font-medium text-sm">
                {activeChat.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h2 className="font-semibold text-textColor text-sm sm:text-base">
              {activeChat.name}
            </h2>
            <p className="text-xs text-gray">
              {activeChat.role === "brand"
                ? activeChat.companyName
                : activeChat.sport
                ? `${activeChat.sport}${
                    activeChat.level ? ` - ${activeChat.level}` : ""
                  }`
                : activeChat.role}
            </p>
            {isPartnerTyping && (
              <p className="text-xs text-gray animate-pulse">Typing...</p>
            )}
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowReportModal(true)}
            className="grayBtn text-textColor text-xs sm:text-sm hover:bg-reddishPurple hover:text-white"
            aria-label="Report user"
          >
            {t("report")}
          </button>
          {isUserBlocked ? (
            <button
              onClick={handleUnblockUser}
              className="grayBtn text-textColor text-xs sm:text-sm hover:bg-neonGreen hover:text-textColor"
              aria-label="Unblock user"
            >
              {t("unblock")}
            </button>
          ) : (
            <button
              onClick={handleBlockUser}
              className="grayBtn text-textColor text-xs sm:text-sm hover:bg-reddishPurple hover:text-white"
              aria-label="Block user"
            >
              {t("block")}
            </button>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-textColor bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-md shadow-tabCustom">
            <h3 className="text-lg font-semibold text-textColor mb-4">
              {t("reportU")}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-textColor mb-1">
                {t("reason")}
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="forms w-full text-textColor focus:ring-orange"
                aria-label="Select report reason"
              >
                <option value="">{t("select")}</option>
                <option value="Inappropriate behavior">{t("reason1")}</option>
                <option value="Spam">{t("reason2")}</option>
                <option value="Harassment">{t("reason3")}</option>
                <option value="Other">{t("reason4")}</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-textColor mb-1">
                {t("details")}
              </label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder={t("placeholder")}
                className="forms w-full text-textColor focus:ring-orange"
                rows={4}
                aria-label="Report details"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason("");
                  setReportDetails("");
                }}
                className="grayBtn text-textColor text-sm hover:bg-gray"
                aria-label="Cancel report"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleReportUser}
                disabled={!reportReason.trim()}
                className="primaryBtn text-white disabled:bg-gray disabled:cursor-not-allowed"
                aria-label="Submit report"
              >
                {t("submit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-[calc(100vh-302px)] overflow-y-auto p-3 sm:p-4 bg-bgGraySmoke your-scroll-container"
      >
        {messages.length > 0 ? (
          messages
            .filter((msg) => !msg._id.toString().includes("temp"))
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .map((msg) => (
              <div
                key={msg._id}
                className={`mb-3 sm:mb-4 flex ${
                  msg.senderId === currentUser.onboardedDetails._id
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] sm:max-w-[60%] px-3 sm:px-4 py-2 rounded-lg shadow-tabCustom ${
                    msg.senderId === currentUser.onboardedDetails._id
                      ? "bg-orange text-white"
                      : "bg-white border border-gray"
                  } ${
                    msg._id.toString().startsWith("temp-") ? "opacity-50" : ""
                  }`}
                >
                  {msg.attachment ? (
                    isImageUrl(msg.attachment) ? (
                      <div className="mb-2 max-w-[200px] sm:max-w-[250px]">
                        <img
                          src={msg.attachment}
                          width={200}
                          height={200}
                          alt="Attachment"
                          className="rounded-lg object-cover"
                        />
                        <div className="mt-1 flex items-center space-x-2">
                          <button
                            type="button"
                            className="text-orange text-xs hover:text-reddishPurple underline"
                            onClick={() => openImageViewer(msg.attachment)}
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadImage(msg.attachment)}
                            className="text-orange text-xs hover:text-reddishPurple underline"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-2">
                        <a
                          href={msg.attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange underline text-sm"
                        >
                          {t("view")}
                        </a>
                      </div>
                    )
                  ) : null}
                  {msg.content && (
                    <p className="text-sm sm:text-base">{msg.content}</p>
                  )}
                  <p
                    className={`text-xs mt-1 ${
                      msg.senderId === currentUser.onboardedDetails._id
                        ? "text-white"
                        : "text-gray"
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray">
              <p className="text-sm sm:text-base">{t("fallbackText")}</p>
              <p className="text-xs sm:text-sm mt-1">{t("start")}</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Typing indicator (more prominent near input) */}
      {isPartnerTyping && (
        <div className="px-4 py-1 text-xs text-gray animate-pulse bg-white border-t border-gray">
          Typing...
        </div>
      )}

      {/* Message Input */}
      <div className="p-3 sm:p-4 border-t border-gray bg-white">
        {attachment && (
          <div className="mb-2 flex items-center">
            <span className="text-sm text-textColor">
              {isImageUrl(attachment) ? (
                <img
                  src={attachment}
                  width={40}
                  height={40}
                  alt="Preview"
                  className="inline-block rounded mr-2"
                />
              ) : (
                t("file")
              )}
            </span>
            <button
              onClick={() => {
                setAttachment(null);
                fileInputRef.current.value = null;
              }}
              className="ml-2 text-orange text-sm hover:text-reddishPurple"
              aria-label="Remove attachment"
            >
              {t("remove")}
            </button>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => fileInputRef.current.click()}
            className="p-2 text-orange hover:text-reddishPurple"
            aria-label="Attach file"
          >
            📎
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,application/pdf"
            className="hidden"
          />
          <input
            type="text"
            value={message}
            onChange={handleInputChange}
            onBlur={() => {
              if (!socket) return;
              socket.emit("stop-typing", {
                senderId: currentUser.onboardedDetails._id,
                receiverId: activeChat._id,
              });
            }}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={t("msgPlaceholder")}
            className="forms flex-1 text-textColor focus:ring-orange disabled:bg-gray max-w-md"
            disabled={isSending || isUserBlocked}
            aria-label="Type a message"
          />
          <button
            onClick={handleSendMessage}
            disabled={
              (!message.trim() && !attachment) || isSending || isUserBlocked
            }
            className="primaryBtn text-white disabled:bg-gray disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            {isSending ? t("sending") : t("send")}
          </button>
        </div>
      </div>
      {viewerOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-100 flex items-center justify-center p-4"
          onClick={closeImageViewer}
        >
          <div
            className="relative bg-white rounded-lg shadow-tabCustom max-w-4xl w-full p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={viewerSrc}
              alt="Preview"
              className="w-full h-auto rounded"
            />
            <div className="absolute top-2 right-2 flex space-x-2">
              <button
                type="button"
                onClick={() => downloadImage(viewerSrc)}
                className="px-3 py-1 bg-orange text-white rounded hover:bg-reddishPurple text-xs"
              >
                Download
              </button>
              <button
                onClick={closeImageViewer}
                className="px-3 py-1 bg-gray text-textColor rounded text-xs hover:bg-gray-300"
                aria-label="Close image viewer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
