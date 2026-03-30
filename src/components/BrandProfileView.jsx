"use client";

import DefaultLayout from "./Common/DefaultLayout.jsx/DefaultLayout";
import { useSocket } from "@/context/SocketContext";
import { useAuthStore } from "@/store/authStore";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import SwiperJsCarousel from "./Common/SwiperJsCarousel/SwiperJsCarousel";

const BrandProfileView = ({
  details,
  teamCarouselData,
  campaignCarouselData,
  CarouselBreakPoint,
  myCampBreakPoint,
  id,
  onMove,
  onMoveCampaign,
}) => {
  const { user } = useAuthStore();
  const t = useTranslations("Brand.edit");
  const toastAlert = useTranslations("Sweetalert");
  const router = useRouter();
  const socket = useSocket();
  const [msgDetails, setMsgDetails] = useState(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  useEffect(() => {
    socket?.emit("join-user-room", user?.onboardedDetails?._id);
  }, [socket, user?.onboardedDetails?._id]);

  // Handle sending message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    // if (!message.trim() || !socket || isSending) return;

    const tempId = `temp-${Date.now()}`;
    const newMessage = {
      senderId: user.onboardedDetails?._id,
      receiverId: msgDetails._id,
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

  // Close modal
  const closeModal = () => {
    setMsgDetails(null);
    setMessage("");
  };

  return (
    <>
      <div className="bg-[#1E1E1E] px-4 sm:px-8 py-16 sm:py-20 w-full">
        <div className="max-w-[1312px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left max-w-[932px]">
            <h1 className="text-3xl sm:text-5xl font-normal text-white mb-6 leading-tight break-words text-wrap">
              {details?.brand?.companyName || "Brand Name"}
            </h1>
            <p className="text-base sm:text-lg font-normal text-white mb-8 leading-6">
              {details?.brand?.intro || "No introduction available."}
            </p>
            {details?.brand?.websiteUrl && (
              <a
                href={details.brand.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-white mb-8 block text-shadow-amber-800"
              >
                {details.brand.websiteUrl}
              </a>
            )}
            {user?.role === "sports-ambassador" && (
              <button
                className="bg-[#F26915] text-white text-base  py-2 px-6 rounded-full transition duration-300 h-11"
                onClick={() => {
                  setMsgDetails({
                    ...details,
                    name: details.brand.Name,
                  });
                }}
              >
                {t("sendMsg")}
              </button>
            )}
          </div>
          <div>
            {user && id == user?.id && (
              <Link
                href="/brand/form"
                className="bg-[#F26915] mb-4 text-white text-base py-2 px-6 rounded-full transition duration-300 h-11 flex items-center justify-center"
              >
                {t("edit")}
              </Link>
            )}
            <Image
              src={details?.brand?.companyLogo}
              alt="Brand Logo"
              width={200}
              height={100}
              className="rounded-[10px]"
              priority
            />
          </div>
        </div>
      </div>

      {/* Team Section */}
      {teamCarouselData.length > 0 && (
        <div className="max-w-[1312px] mx-auto px-4 sm:px-0 pt-16 sm:pt-28 pb-16 sm:pb-28">
          <h1 className="text-3xl sm:text-5xl font-normal text-[#0C0D06] text-center mb-6">
            {t("team")}
          </h1>
          <p className="text-base sm:text-lg font-normal text-center mb-8">
            {t("para")}
          </p>
          <div className="flex justify-end">
            <button
              className="bg-[#F26915] text-white rounded-full h-11 px-5 mb-6"
              onClick={onMove}
            >
              {t("view")}
            </button>
          </div>
          <SwiperJsCarousel
            data={teamCarouselData}
            imgStyling="w-full h-[416px] object-cover rounded-2xl"
            breakpoint={CarouselBreakPoint}
            simpleCarousel="true"
            slidesCount={3}
            slideSpace={30}
            swiperBtnStl="!w-full"
          />
        </div>
      )}

      {/* Campaigns Section */}
      {/* {campaignCarouselData.length > 0 && (
        <div className="bg-[#F1F1F1] py-16 sm:pt-28">
          <DefaultLayout>
            <div>
              <p className="text-base font-bold text-[#0C0D06] mb-4">Shop</p>
              <h1 className="text-3xl sm:text-5xl font-normal text-[#0C0D06] mb-4">
                {t("myCampaigns")}
              </h1>
              <div className="flex flex-col sm:flex-row items-center justify-between mb-12 sm:mb-20 gap-4">
                <p className="text-base sm:text-lg font-normal text-center sm:text-left">
                  {t("para2")}
                </p>
                <button
                  className="bg-[#F26915] text-white rounded-full h-11 px-5"
                  onClick={onMoveCampaign}
                >
                  {t("view")}
                </button>
              </div>
              <SwiperJsCarousel
                data={campaignCarouselData}
                imgStyling="w-full h-[368px] object-cover rounded-2xl"
                breakpoint={myCampBreakPoint}
                slidesCount={4}
                slideSpace={30}
                showImgContent={true}
                campaignBtnStyl="!bg-[#F26915ED] !text-white"
                ceoCards="true"
                myCampCarousel="!mt-5 !pb-[30px]"
              />
            </div>
          </DefaultLayout>
        </div>
      )} */}

      {/* Future Sports Section */}
      <div className="bg-[#F9FD99] py-16 sm:py-28">
        <DefaultLayout>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <h2 className="text-2xl md:text-5xl font-normal leading-tight">
              {t("heading")}
            </h2>
            <p className="text-base md:text-lg font-normal md:w-1/2">
              {t("para3")}
            </p>
          </div>
        </DefaultLayout>
      </div>
      {msgDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">
                {t("sendMsg")}
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
            {/* <div className="mb-4">
              <p className="text-gray-700">
                <span className="font-semibold">Name:</span>{" "}
                {details.name || "Unknown Ambassador"}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Sports:</span>{" "}
                {formatSports(details.sports)}
              </p>
            </div> */}
            <form onSubmit={handleSendMessage}>
              <div className="mb-4">
                {/* <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Message
                </label> */}
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  placeholder="Type your message here..."
                  required
                  disabled={isSending}
                ></textarea>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                  disabled={isSending}
                >
                  {t("Cancel")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                  disabled={isSending}
                >
                  {isSending ? t("sending") : t("send")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default BrandProfileView;
