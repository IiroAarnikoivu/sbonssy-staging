"use client";
import React from "react";
import Image from "next/image";
import Swal from "sweetalert2";
import { useAuthStore } from "@/store/authStore";
import { useTranslations } from "next-intl";

/**
 * Display a grid of assets (images/videos) with optional download button.
 * @param {Object} props
 * @param {string} [props.title=""]
 * @param {Array<{url: string, mediaType?: string}>} [props.items=[]]
 * @param {boolean} [props.isVideo=false]
 * @param {boolean} [props.isMixed=false]
 */
const AssetSection = ({ title = "", items = [], isVideo = false, isMixed = false }) => {
  const { user } = useAuthStore();
  const toastAlert = useTranslations("Sweetalert");
  const t = useTranslations("CampaignDetails");

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url, { mode: "cors" });
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || "downloaded-image";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      Swal.fire({
        title: toastAlert("downloadSuccess"),
        icon: "success",
        toast: true,
        timer: 5000,
      });
    } catch (error) {
      console.error("Download failed:", error);
      Swal.fire({
        title: toastAlert("downloadError"),
        text: toastAlert("downloadErrorText"),
        icon: "error",
        toast: true,
        timer: 5000,
      });
    }
  };

  return (
    <div>
      <h4 className="font-bold text-base mb-3">{title}</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="relative aspect-square rounded-lg overflow-hidden border"
          >
            {isVideo || (isMixed && item.mediaType === "video") ? (
              <video
                src={item.url}
                controls
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <Image
                  src={item.url}
                  fill
                  alt={`${title} ${i + 1}`}
                  className="object-cover"
                />
                {user?.role === "sports-ambassador" && (
                  <button
                    onClick={() =>
                      handleDownload(item.url, `${title}-${i + 1}.jpg`)
                    }
                    className="absolute bottom-2 right-2 bg-blue-600 text-white text-sm px-2 py-1 rounded hover:bg-blue-700"
                  >
                    {t("download")}
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssetSection;
