"use client";

import Loader from "@/components/Loader";
import SettingsSidebar from "@/components/SettingsSidebar";
import api from "@/lib/axios";
import { configureYupLocale } from "@/lib/yupLocales";
import { useAuthStoreWithTranslations } from "@/store/authStoreHelpers";
import { useFormik } from "formik";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";
import Swal from "sweetalert2";
import * as Yup from "yup";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const BrandSettingsPage = () => {
  const { user, loading, logout } = useAuthStoreWithTranslations();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const t = useTranslations("Settings.general");
  const toastAlert = useTranslations("Sweetalert");
  const router = useRouter();
  const locale = useLocale();
  const normLocale =
    (typeof locale === "string" && locale.split("-")?.[0]) || locale;
  // Ensure Yup uses active locale for translated messages
  configureYupLocale(normLocale);

  const validationSchema = useMemo(
    () =>
      Yup.object({
        companyName: Yup.string().required().label(t("companyName")),
        phoneNumber: Yup.string()
          .matches(/^[0-9]*$/, "Invalid phone number format")
          .min(7, "Invalid phone number format")
          .max(15, "Invalid phone number format")
          .label(t("phone")),
        currentPassword: Yup.string()
          .when("newPassword", {
            is: (np) => !!np,
            then: () => Yup.string().required(),
          })
          .label(t("password")),
        newPassword: Yup.string().min(6).label(t("newPassword")),
        confirmPassword: Yup.string()
          .when("newPassword", {
            is: (np) => !!np,
            then: () =>
              Yup.string()
                .oneOf([Yup.ref("newPassword"), null])
                .required(),
          })
          .label(t("confirmPassword")),
      }),
    [normLocale, t],
  );

  const toggleCurrentPasswordVisibility = () => {
    setShowCurrentPassword(!showCurrentPassword);
  };
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };
  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const formik = useFormik({
    initialValues: {
      companyName: "",
      phoneNumber: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const inviterCompanyName =
          user?.onboardedDetails?.invitedBy?.brand?.companyName || "";
        const chosenCompanyName =
          (values.companyName && values.companyName.trim()) ||
          inviterCompanyName;
        const payload = {
          ...user.onboardedDetails,
          role: "brand",
          phoneNumber: values.phoneNumber,
          brand: {
            ...user.onboardedDetails.brand,
            companyName: chosenCompanyName,
          },
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
        // Only logout if a password change actually occurred
        if (response.success && values.newPassword) {
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
      user.onboardedDetails.role === "brand"
    ) {
      const ownCompanyName = user.onboardedDetails.brand?.companyName || "";
      const inviterCompanyName =
        user.onboardedDetails?.invitedBy?.brand?.companyName || "";
      const effectiveCompanyName = ownCompanyName || inviterCompanyName;
      formik.setValues(
        {
          companyName: effectiveCompanyName,
          phoneNumber: user.onboardedDetails?.phoneNumber || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        },
        false,
      );
    }
  }, [loading, user]);

  const userEmail = user?.onboardedDetails?.email || "";

  if (loading) {
    return (
      <div className="flex min-h-screen bg-white items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!user || user.onboardedDetails?.role !== "brand") {
    return (
      <div className="flex min-h-screen bg-white items-center justify-center">
        <p>{t("fallback")}</p>
      </div>
    );
  }

  return (
    <div className="md:flex min-h-screen bg-white">
      <SettingsSidebar role={"brand"} />
      <div className="md:w-4/5 md:p-6 md:pt-10 px-3 py-6 pt-8">
        <div className="max-w-2xl">
          <form onSubmit={formik.handleSubmit} autoComplete="off">
            <div className="mb-6">
              <label
                htmlFor="companyName"
                className="block text-sm font-medium text-gray-700"
              >
                {t("companyName")}
              </label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={formik.values.companyName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={`mt-1 block w-full border border-gray-300 rounded-md p-3 shadow-sm focus:ring-orange-500 focus:border-orange-500 ${
                  formik.touched.companyName && formik.errors.companyName
                    ? "border-red-500"
                    : ""
                }`}
              />
              {formik.touched.companyName && formik.errors.companyName && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.companyName}
                </p>
              )}
            </div>
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
                htmlFor="phoneNumber"
                className="block text-sm font-medium text-gray-700"
              >
                {t("phone")}
              </label>
              <div className="mt-1">
                <PhoneInput
                  country={"us"}
                  value={formik.values.phoneNumber}
                  onChange={(value) =>
                    formik.setFieldValue(
                      "phoneNumber",
                      (value || "").replace(/\D/g, ""),
                    )
                  }
                  onBlur={() => formik.setFieldTouched("phoneNumber", true)}
                  inputProps={{
                    name: "phoneNumber",
                    id: "phoneNumber",
                    autoComplete: "tel",
                    autoCorrect: "off",
                    autoCapitalize: "off",
                  }}
                  containerClass="w-full"
                  inputClass="!w-full !h-[48px] !py-3 !pl-12 !pr-3 !border !border-gray-300 !rounded-md focus:!ring-orange-500 focus:!border-orange-500"
                  buttonClass="!h-[48px]"
                />
              </div>

              {formik.touched.phoneNumber && formik.errors.phoneNumber && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.phoneNumber}
                </p>
              )}
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
                {t("confirmPassword")}
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
        </div>
      </div>
    </div>
  );
};

export default BrandSettingsPage;
