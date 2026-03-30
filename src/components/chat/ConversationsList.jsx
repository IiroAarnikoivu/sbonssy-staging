"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/context/SocketContext";
import Image from "next/image";
import { useTranslations } from "next-intl";
import Swal from "sweetalert2";

export default function ConversationsList({
  currentUser,
  activeChat,
  setActiveChat,
  searchQuery,
}) {
  const socket = useSocket();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("Sports.chat");
  const toastAlert = useTranslations("Sweetalert");

  const fetchConversations = async () => {
    try {
      const response = await fetch(
        `/api/conversations?userId=${encodeURIComponent(
          currentUser?.onboardedDetails?._id
        )}`
      );
      if (!response.ok) throw new Error("Failed to fetch conversations");
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.onboardedDetails?._id) {
      fetchConversations();
    }
  }, [currentUser.onboardedDetails._id]);

  useEffect(() => {
    if (!socket || !currentUser?.onboardedDetails?._id) return;

    const handleReceiveMessage = (newMessage) => {
      if (
        newMessage.senderId === currentUser.onboardedDetails._id ||
        newMessage.receiverId === currentUser.onboardedDetails._id
      ) {
        const participantId =
          newMessage.senderId === currentUser.onboardedDetails._id
            ? newMessage.receiverId
            : newMessage.senderId;

        const isActive = participantId === activeChat?._id;
        setConversations((prev) => {
          const existingConv = prev.find(
            (conv) => conv.participant._id === participantId
          );

          if (existingConv) {
            const isIncoming =
              newMessage.receiverId === currentUser.onboardedDetails._id &&
              newMessage.senderId === participantId;
            const updatedConv = {
              ...existingConv,
              lastMessage: {
                content: newMessage.content,
                attachment: newMessage.attachment,
                timestamp: newMessage.timestamp,
                senderId: newMessage.senderId,
                receiverId: newMessage.receiverId,
              },
              updatedAt: new Date(newMessage.timestamp),
              // If message is incoming but chat is currently open, do not bump unread
              unreadCount: isIncoming
                ? isActive
                  ? 0
                  : (existingConv.unreadCount || 0) + 1
                : existingConv.unreadCount || 0,
            };
            return [
              updatedConv,
              ...prev.filter((conv) => conv.participant._id !== participantId),
            ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          } else {
            fetchConversations();
            return prev;
          }
        });
      }
    };

    socket.on("receive-message", handleReceiveMessage);
    return () => socket.off("receive-message", handleReceiveMessage);
  }, [socket, currentUser.onboardedDetails._id, activeChat?._id]);

  // When switching active chat, zero out its unread count immediately
  useEffect(() => {
    if (!activeChat?._id) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.participant._id === activeChat._id ? { ...c, unreadCount: 0 } : c
      )
    );
  }, [activeChat?._id]);

  const handleDeleteConversation = async (conversationId) => {
    try {
      const result = await Swal.fire({
        title: toastAlert("sure"),
        text: toastAlert("deleteMsgconfirmation"),
        icon: "warning",
        showCancelButton: true,
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
        confirmButtonText: toastAlert("deleteAccountConfirm"),
        cancelButtonText: toastAlert("cancel"),
      });

      if (!result.isConfirmed) return;

      const response = await fetch("/api/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          userId: currentUser.onboardedDetails._id,
        }),
      });

      if (!response.ok) throw new Error("Failed to delete conversation");

      setConversations((prev) =>
        prev.filter((conv) => conv._id !== conversationId)
      );
      if (activeChat?._id === conversationId) setActiveChat(null);

      await Swal.fire({
        toast: true,
        position: "top-right",
        icon: "success",
        title: toastAlert("chatDeletedSuccess"),
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: false,
      });
    } catch (error) {
      await Swal.fire({
        toast: true,
        position: "top-right",
        icon: "error",
        title: toastAlert("chatDeletedFailed"),
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
    }
  };

  const getProfileImage = (p) => {
    if (p.role === "brand" && p.companyLogo) return p.companyLogo;
    if (p.images?.length > 0) {
      const profileImage = p.images.find((img) => img.isProfile);
      return profileImage?.url || p.images[0].url;
    }
    return null;
  };

  if (searchQuery) return null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto your-scroll-container">
      {conversations.length > 0 ? (
        conversations.map((conversation) => {
          const participant = conversation.participant;
          const profileImage = getProfileImage(participant);

          return (
            <div
              key={conversation._id}
              className={`p-3 sm:p-4 border-b border-gray cursor-pointer hover:bg-bgGraySmoke flex items-center justify-between transition-colors duration-200 ${
                activeChat?._id === participant._id ? "bg-neonGreen" : ""
              }`}
            >
              <div
                className="flex items-center flex-1 min-w-0"
                onClick={() => {
                  setActiveChat(participant);
                  // Clear unread count for this conversation when opening it
                  setConversations((prev) =>
                    prev.map((c) =>
                      c.participant._id === participant._id
                        ? { ...c, unreadCount: 0 }
                        : c
                    )
                  );
                }}
                role="button"
                aria-label={`Open chat with ${participant.name}`}
              >
                {profileImage ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden mr-3 shrink-0">
                    <Image
                      src={profileImage}
                      width={40}
                      height={40}
                      alt={participant.name || participant.email}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray flex items-center justify-center mr-3 shrink-0">
                    <span className="text-textColor font-medium text-sm">
                      {participant.name?.charAt(0).toUpperCase() ||
                        participant.email?.charAt(0).toUpperCase() ||
                        "?"}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3
                    className={`truncate text-sm ${
                      conversation.unreadCount > 0
                        ? "font-semibold text-textColor"
                        : "font-medium text-textColor"
                    }`}
                  >
                    {participant.name || participant.email}
                  </h3>
                  <p
                    className={`truncate text-xs ${
                      conversation.unreadCount > 0
                        ? "font-semibold text-textColor"
                        : "text-gray"
                    }`}
                  >
                    {conversation.lastMessage?.content ||
                      (conversation.lastMessage?.attachment
                        ? "Attachment"
                        : "No messages yet")}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 shrink-0">
                {conversation.lastMessage && (
                  <div className="text-xs text-gray whitespace-nowrap">
                    {new Date(
                      conversation.lastMessage.timestamp
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
                {conversation.unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
                    {conversation.unreadCount > 99
                      ? "99+"
                      : conversation.unreadCount}
                  </span>
                )}
                <button
                  onClick={() => handleDeleteConversation(conversation._id)}
                  className="grayBtn text-textColor text-xs hover:bg-reddishPurple hover:text-white"
                  aria-label="Delete conversation"
                >
                  {t("delete")}
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <div className="p-4 text-center text-gray text-sm">
          {currentUser.role === "brand" ? t("text1") : t("text2")}
        </div>
      )}
    </div>
  );
}
