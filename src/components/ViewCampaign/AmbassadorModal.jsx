"use client";
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/store/authStore";
import IconsLibrary from "@/util/IconsLibrary";
import { toCamelCase } from "@/lib/helper";
import api from "@/lib/axios";

/**
 * Modal to list and manage ambassadors joined to a campaign for a brand.
 * @param {Object} props
 * @param {Array} [props.ambassadors=[]]
 * @param {() => void} [props.onClose=() => {}]
 * @param {string} [props.brandId=""]
 * @param {(id: string) => void} [props.onAmbassadorRemoved=() => {}]
 * @param {string|null} [props.dropdownOpen=null]
 * @param {(v: string|null) => void} [props.setDropdownOpen=() => {}]
 */
const AmbassadorModal = ({
  ambassadors = [],
  onClose = () => {},
  brandId = "",
  onAmbassadorRemoved = () => {},
  dropdownOpen = null,
  setDropdownOpen = () => {},
}) => {
  const t = useTranslations("MarketPlace");
  const toastAlert = useTranslations("Sweetalert");

  const [localAmbassadors, setLocalAmbassadors] = useState(ambassadors);
  const { user } = useAuthStore();

  useEffect(() => {
    setLocalAmbassadors(ambassadors);
  }, [ambassadors]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleRemoveAmbassador = async (interactionId) => {
    try {
      const result = await Swal.fire({
        title: toastAlert("confirmRemove"),
        text: toastAlert("confirmRemoveText"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: toastAlert("yes"),
        cancelButtonText: toastAlert("no"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      });

      if (result.isConfirmed) {
        const response = await api.delete(`/campaign/joined/${interactionId}`);

        if (response.data.success) {
          setLocalAmbassadors((prev) =>
            prev.filter((amb) => amb._id !== interactionId)
          );

          Swal.fire({
            title: toastAlert("removeSuccess"),
            position: "top-right",
            icon: "success",
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });

          if (onAmbassadorRemoved) {
            onAmbassadorRemoved(interactionId);
          }
        } else {
          throw new Error(
            response.data.message || "Failed to remove ambassador"
          );
        }
      }
    } catch (error) {
      console.error("Error removing ambassador:", error);
      Swal.fire({
        title: toastAlert("removeError"),
        text: error.message || toastAlert("removeErrorText"),
        position: "top-right",
        icon: "error",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">{t("campaigns.heading")}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <IconsLibrary name="close" size={24} />
            </button>
          </div>

          {localAmbassadors?.length > 0 ? (
            <div className="space-y-4">
              {localAmbassadors.map((ambassador, i) => {
                const subRole = toCamelCase(ambassador?.user?.subRole);
                const name = ambassador?.user[subRole]?.name;
                const image = ambassador?.user[subRole]?.images[0]?.url;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
                        {image && (
                          <img src={image} alt={name} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{name}</p>
                      </div>
                    </div>

                    {user?.onboardedDetails?._id === brandId && (
                      <div className="relative">
                        <button
                          onClick={() =>
                            setDropdownOpen(
                              dropdownOpen === ambassador?.user._id ? null : ambassador?.user._id
                            )
                          }
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>

                        {dropdownOpen === ambassador?.user._id && (
                          <div className="dropdown-menu absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                            <button
                              onClick={() => {
                                handleRemoveAmbassador(ambassador.interactionId, ambassador?.user?._id);
                                setDropdownOpen(null);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              {t("campaigns.remove")}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <IconsLibrary name="user" size={48} className="mx-auto text-gray-400" />
              <p className="mt-4 text-gray-500">{t("campaigns.fallbackText")}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
              {t("campaigns.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmbassadorModal;
