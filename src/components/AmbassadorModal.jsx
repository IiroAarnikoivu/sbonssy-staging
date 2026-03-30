import IconsLibrary from "@/util/IconsLibrary";
import { useTranslations } from "next-intl";
import React, { useEffect } from "react";

const AmbassadorModal = ({ isOpen, onClose, ambassadors, campaignTitle }) => {
  if (!isOpen) return null;
  const t = useTranslations("Brand.edit");

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  // Helper function to convert string to camelCase
  const toCamelCase = (str) => {
    if (!str) return "";
    return str
      .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
        if (+match === 0) return "";
        return index === 0 ? match.toLowerCase() : match.toUpperCase();
      })
      .replace(/-/g, "");
  };

  return (
    <div className="fixed inset-0 bg-white/90 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-[#0C0D06]">
              {t("ambHeading")} {campaignTitle}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <IconsLibrary name="close" size={24} />
            </button>
          </div>

          {ambassadors?.length > 0 ? (
            <div className="space-y-4">
              {ambassadors.map((ambassador) => {
                const subRole = toCamelCase(ambassador.subRole);
                const name = ambassador[subRole]?.name;
                const image = ambassador[subRole]?.images?.[0]?.url;
                const email = ambassador.email;

                return (
                  <div
                    key={ambassador._id || ambassador.id}
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
                      {image ? (
                        <img
                          src={image}
                          alt={name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gray-300">
                          <IconsLibrary
                            name="user"
                            size={20}
                            className="text-gray-500"
                          />
                        </div>
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-[#0C0D06]">
                        {name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <IconsLibrary
                name="user"
                size={48}
                className="mx-auto text-gray-400"
              />
              <p className="mt-4 text-gray-500">{t("fallback")}</p>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-[#0C0D06] text-white rounded-md hover:bg-[#1a1b13] transition-colors"
            >
              {t("close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmbassadorModal;
