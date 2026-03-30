"use client";

import Loader from "@/components/Loader";
import SettingsSidebar from "@/components/SettingsSidebar";
import api from "@/lib/axios";
import { useAuthStoreWithTranslations } from "@/store/authStoreHelpers";
import { useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LuEye, LuEyeOff } from "react-icons/lu";
import Swal from "sweetalert2";
import * as Yup from "yup";

const FanSettingsPage = () => {
  const { user, loading, logout } = useAuthStoreWithTranslations();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const t = useTranslations("Settings.general");
  const tt = useTranslations("Settings.account");
  const toastAlert = useTranslations("Sweetalert");
  const router = useRouter();
  const toggleCurrentPasswordVisibility = () => {
    setShowCurrentPassword(!showCurrentPassword);
  };

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const formik = useFormik({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      currentPassword: Yup.string().when("newPassword", {
        is: (newPassword) => !!newPassword,
        then: () =>
          Yup.string().required(
            "Current password is required when updating password"
          ),
      }),
      newPassword: Yup.string().min(
        6,
        "New password must be at least 6 characters"
      ),
      confirmPassword: Yup.string().when("newPassword", {
        is: (newPassword) => !!newPassword,
        then: () =>
          Yup.string()
            .oneOf([Yup.ref("newPassword"), null], "Passwords must match")
            .required("Please confirm your new password"),
      }),
    }),

    onSubmit: async (values, { setSubmitting }) => {
      try {
        const payload = {
          ...user.onboardedDetails,
          role: "fan",
        };

        if (values.newPassword) {
          payload.currentPassword = values.currentPassword;
          payload.newPassword = values.newPassword;
        }

        const response = await api.put("/user", payload);
        Swal.fire({
          title: toastAlert("profile"),
          position: "top-right",
          icon: "success",
          toast: true,
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 3000,
        });

        // If password was updated, force logout and redirect to login
        if (response.success) {
          try {
            await logout();
          } finally {
            router.push("/authentication?tab=login");
          }
        }
      } catch (error) {
        Swal.fire({
          title: toastAlert("profileError"),
          position: "top-right",
          icon: "error",
          toast: true,
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 3000,
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    if (
      !loading &&
      user &&
      user.onboardedDetails &&
      user.onboardedDetails.role === "fan"
    ) {
      formik.setValues(
        {
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        },
        false
      );
    }
  }, [loading, user]);
  const handleDeleteAccount = () => {
    Swal.fire({
      title: toastAlert("deleteAc"),
      text: toastAlert("deleteTxt"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: toastAlert("yes"),
      cancelButtonText: toastAlert("cancel"),
      customClass: {
        confirmButton: "confirmButton",
        cancelButton: "cancelButton",
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete("/user");
          Swal.fire({
            title: toastAlert("dltSuccess"),
            icon: "success",
            timer: 3000,
            toast: true,
            position: "top-right",
            showConfirmButton: false,
          });
        } finally {
          await logout();
          router.push("/");
        }
      }
    });
  };
  const userEmail = user?.onboardedDetails?.email || "";

  if (loading) {
    return (
      <div className="flex min-h-screen bg-white items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!user || user.onboardedDetails?.role !== "fan") {
    return (
      <div className="flex min-h-screen bg-white items-center justify-center">
        <p>{t("fallback")}</p>
      </div>
    );
  }

  return (
    <div className="md:flex min-h-screen bg-white">
      <SettingsSidebar role={"fan"} />
      <div className="md:w-4/5 md:p-6 px-3 py-6">
        <div className="max-w-2xl">
          <form onSubmit={formik.handleSubmit}>
            <div className="mb-6">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                {t("email")}
              </label>
              <div className="mt-1 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                  <svg
                    width="20"
                    height="16"
                    viewBox="0 0 20 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18 0H2C0.897 0 0 0.897 0 2V14C0 15.103 0.897 16 2 16H18C19.103 16 20 15.103 20 14V2C20 0.897 19.103 0 18 0ZM18 2V2.511L10 8.734L2 2.512V2H18ZM2 14V5.044L9.386 10.789C9.56111 10.9265 9.77733 11.0013 10 11.0013C10.2227 11.0013 10.4389 10.9265 10.614 10.789L18 5.044L18.002 14H2Z"
                      fill="#0C0D06"
                    />
                  </svg>
                </span>
                <input
                  type="email"
                  id="email"
                  value={userEmail}
                  className="block w-full pl-10 border border-gray-300 rounded-md p-3 shadow-sm bg-gray-100"
                  disabled
                />
              </div>
            </div>
            <div className="mb-6">
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-gray-700"
              >
                {t("password")}
              </label>
              <div className="mt-1 relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  id="currentPassword"
                  name="currentPassword"
                  value={formik.values.currentPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full pr-10 border border-gray-300 rounded-md p-3 shadow-sm focus:ring-orange-500 focus:border-orange-500 ${
                    formik.touched.currentPassword &&
                    formik.errors.currentPassword
                      ? "border-red-500"
                      : ""
                  }`}
                />
                <span
                  onClick={toggleCurrentPasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 cursor-pointer"
                >
                  {showCurrentPassword ? (
                    <LuEye size={20} />
                  ) : (
                    <LuEyeOff size={20} />
                  )}
                </span>
              </div>
              {formik.touched.currentPassword &&
                formik.errors.currentPassword && (
                  <p className="text-red-500 text-sm mt-1">
                    {formik.errors.currentPassword}
                  </p>
                )}
            </div>
            <div className="mb-6">
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700"
              >
                {t("newPassword")}
              </label>
              <div className="mt-1 relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  id="newPassword"
                  name="newPassword"
                  value={formik.values.newPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full pr-10 border border-gray-300 rounded-md p-3 shadow-sm focus:ring-orange-500 focus:border-orange-500 ${
                    formik.touched.newPassword && formik.errors.newPassword
                      ? "border-red-500"
                      : ""
                  }`}
                />
                <span
                  onClick={toggleNewPasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 cursor-pointer"
                >
                  {showNewPassword ? (
                    <LuEye size={20} />
                  ) : (
                    <LuEyeOff size={20} />
                  )}
                </span>
              </div>
              {formik.touched.newPassword && formik.errors.newPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.newPassword}
                </p>
              )}
            </div>
            <div className="mb-6">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                {t("confirmNewPassword")}
              </label>
              <div className="mt-1 relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formik.values.confirmPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full pr-10 border border-gray-300 rounded-md p-3 shadow-sm focus:ring-orange-500 focus:border-orange-500 ${
                    formik.touched.confirmPassword &&
                    formik.errors.confirmPassword
                      ? "border-red-500"
                      : ""
                  }`}
                />
                <span
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <LuEye size={20} />
                  ) : (
                    <LuEyeOff size={20} />
                  )}
                </span>
              </div>
              {formik.touched.confirmPassword &&
                formik.errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">
                    {formik.errors.confirmPassword}
                  </p>
                )}
            </div>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="px-6 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50"
                onClick={() => formik.resetForm()}
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-orange-500 text-white rounded-full hover:bg-orange-600"
                disabled={formik.isSubmitting}
              >
                {formik.isSubmitting ? t("saving") : t("save")}
              </button>
            </div>
          </form>
          {/* Delete Account Section */}
          <div className="mt-8 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-1">
                  {tt("deleteAc")}
                </h2>
                <p className="text-gray-600">{tt("click")}</p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {tt("delete")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FanSettingsPage;
