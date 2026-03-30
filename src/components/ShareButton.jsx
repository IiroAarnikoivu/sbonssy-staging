"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function ShareButton({ shareUrl, onClose }) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("Share");

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Close the share dropdown after copying
    if (onClose) {
      setTimeout(() => onClose(), 500); // Small delay to show the "copied" feedback
    }
  };

  return (
    <div className="flex flex-col gap-3 text-left">
      {/* <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          shareUrl
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="border-b border-[#0C0D0626] pb-2 text-left"
      >
        {t("facebook")}
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
          shareUrl
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="border-b border-[#0C0D0626] pb-2 text-left"
      >
        {t("twitter")}
      </a> */}
      <button onClick={handleCopy} className="text-left cursor-pointer">
        {copied ? `${t("btn1")}` : `${t("copy")}`}
      </button>
    </div>
  );
}
