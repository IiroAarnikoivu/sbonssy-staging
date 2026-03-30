"use client";

import Image from "next/image";

export default function AccountCard({
  role,
  imageSrc,
  alt = "profile",
  onMainClick,
  isShopifyConnected = false,
  overlayLabel = "",
  ctaLabel = "",
  onCTA,
  isConnecting = false,
}) {
  return (
    <div
      onClick={onMainClick}
      className="w-full relative bg-gradient-to-br from-orange-600 to-orange-800 rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
    >
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0">
            <Image
              src={imageSrc}
              alt={alt}
              width={32}
              height={32}
              className="object-contain"
              draggable="false"
            />
          </div>
          <div className="flex flex-col">
            <div className="text-white text-base font-semibold">
              {overlayLabel}
            </div>
            {role === "brand" && (
              <button
                type="button"
                disabled={isConnecting}
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof onCTA === "function") onCTA();
                }}
                className={`mt-2 px-3 py-1 rounded bg-white/90 text-black text-xs md:text-sm hover:bg-white w-fit ${
                  isConnecting ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isConnecting ? (
                  <span className="flex items-center gap-1">
                    <svg
                      className="animate-spin h-3 w-3 text-black"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {ctaLabel}...
                  </span>
                ) : (
                  ctaLabel
                )}
              </button>
            )}
          </div>
        </div>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="flex-shrink-0"
        >
          <path
            d="M9 6L15 12L9 18"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
