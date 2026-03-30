"use client";
import React, { useState } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import Swal from "sweetalert2";

/**
 * Display a generated share link with copy-to-clipboard action.
 * @param {Object} props
 * @param {string} [props.shareUrl=""]
 * @param {(key: string) => string} props.t
 */
const ShareLinkBox = ({ shareUrl = "", t }) => {
  const [copied, setCopied] = useState(false);

  if (!shareUrl) return null;

  const handleCopy = async () => {
    const success = await copyToClipboard(shareUrl);

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Show fallback dialog for manual copy on iOS
      await Swal.fire({
        title: t("copyManually") || "Tap the link to copy",
        html: `
          <textarea
            readonly
            id="copyTextArea"
            style="
              width: 100%;
              min-height: 80px;
              background: #f3f4f6;
              padding: 12px;
              border-radius: 8px;
              border: 1px solid #d1d5db;
              margin: 16px 0;
              word-break: break-all;
              font-size: 14px;
              resize: none;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            "
          >${shareUrl}</textarea>
          <p style="font-size: 14px; color: #6b7280; margin-top: 12px;">
            ${t("copyInstructions") || "Tap the link above to select it, then tap 'Copy' from the menu"}
          </p>
        `,
        confirmButtonText: t("ok") || "OK",
        customClass: {
          confirmButton: "confirmButton",
        },
        didOpen: () => {
          // Focus and select the textarea on iOS
          const textarea = document.getElementById('copyTextArea');
          if (textarea) {
            textarea.focus();
            textarea.select();
            // For iOS, also set selection range
            textarea.setSelectionRange(0, textarea.value.length);
          }
        },
      });
    }
  };

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-700">{t("shareLink")}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={shareUrl}
          readOnly
          className="flex-1 p-2 border border-gray-300 rounded text-sm bg-white"
        />
        <button
          onClick={handleCopy}
          className="px-3 py-2 bg-reddishPurple text-white rounded hover:bg-reddishPurple text-sm"
        >
          {copied ? t("copied") : t("copy")}
        </button>
      </div>
    </div>
  );
};

export default ShareLinkBox;
