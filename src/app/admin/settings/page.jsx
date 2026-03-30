"use client";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useTranslations } from "next-intl";
import React, { useState } from "react";
import Swal from "sweetalert2";

const Settings = () => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("Admin.settings");
  const toastAlert = useTranslations("Sweetalert");
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!user?.email) {
      Swal.fire({
        position: "top-right",
        title: toastAlert("notFound"),
        icon: "error",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });

      return;
    }

    setIsLoading(true);
    try {
      const result = await Swal.fire({
        title: toastAlert("sure"),
        text: toastAlert("reset"),
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
        const response = await api.post("/auth/reset-password", {
          email: user.email,
          origin: "admin",
        });
        if (response) {
          Swal.fire({
            position: "top-right",
            title: toastAlert("resetLink"),
            icon: "success",
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      }
    } catch (error) {
      console.error("Error requesting password reset:", error);
      Swal.fire({
        position: "top-right",
        title: toastAlert("resetError"),
        icon: "error",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">{t("heading")}</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("email")}
          </label>
          <input
            value={user?.email || ""}
            type="text"
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
          />
        </div>

        <button
          onClick={handleChangePassword}
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } transition-colors`}
        >
          {isLoading ? `${t("sending")}` : `${t("send")}`}
        </button>

        <p className="text-sm text-gray-500 mt-2">{t("para")}</p>
      </div>
    </div>
  );
};

export default Settings;
