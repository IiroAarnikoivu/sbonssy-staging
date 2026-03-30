"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuthStore } from "@/store/authStore";
import Swal from "sweetalert2";
import SettingsSidebar from "@/components/SettingsSidebar";
import { useTranslations, useLocale } from "next-intl";
import { configureYupLocale } from "@/lib/yupLocales";

const NotificationsPage = () => {
  const { user, loading } = useAuthStore();
  const [initialValuesLoaded, setInitialValuesLoaded] = useState(false);
  const t = useTranslations("Settings.notifications");
  const toastAlert = useTranslations("Sweetalert");
  const locale = useLocale();
  const normLocale =
    (typeof locale === "string" && locale.split("-")?.[0]) || locale;
  configureYupLocale(normLocale);

  const validationSchema = useMemo(
    () =>
      Yup.object({
        notificationMethod: Yup.string().required().label(t("heading")),
        emailTypes: Yup.object().shape({
          marketing: Yup.boolean(),
          announcements: Yup.boolean(),
          support: Yup.boolean(),
        }),
      }),
    [normLocale, t]
  );

  const formik = useFormik({
    initialValues: {
      notificationMethod: "email", // Default to SMS as shown in the image
      emailTypes: {
        marketing: true,
        announcements: false,
        support: false,
      },
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const payload = {
          notificationMethod: values.notificationMethod,
          emailPreferences: values.emailTypes,
        };
        // Simulate API call (replace with actual API endpoint)
        const response = await new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                message: "Notification preferences updated successfully!",
              }),
            500
          )
        );
        Swal.fire({
          title: toastAlert("profileUpdateThankYou"),
          position: "top-right",
          icon: "success",
          toast: true,
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 3000,
        });
      } catch (error) {
        Swal.fire({
          title: toastAlert("notificationError"),
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
    if (!loading && user && !initialValuesLoaded) {
      // Simulate loading user preferences (replace with actual data from user.onboardedDetails)
      const userPrefs = user?.onboardedDetails?.notificationPrefs || {
        notificationMethod: "email",
        emailTypes: { marketing: true, announcements: false, support: false },
      };
      formik.setValues(
        {
          notificationMethod: userPrefs.notificationMethod,
          emailTypes: userPrefs.emailTypes,
        },
        false
      );
      setInitialValuesLoaded(true);
    }
  }, [loading, user, initialValuesLoaded]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-white items-center justify-center">
        <p>{t("load")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen bg-white items-center justify-center">
        <p>{t("fallback")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="md:flex flex-1 bg-white">
        {/* Sidebar */}
        <SettingsSidebar role={"sports-ambassador"} />

        {/* Main Content */}
        <div className="md:w-4/5 md:p-6 px-3 py-6">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {t("heading")}
            </h2>
            <p className="text-gray-600 mb-6">{t("para")}</p>

            <form onSubmit={formik.handleSubmit} className="space-y-6">
              {/* Choose where you get notified */}
              {/* <div className="p-4 border border-gray-300 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t("subHeading")}
              </h3>
              <p className="text-gray-600 mb-4">{t("subPara")}</p>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="notificationMethod"
                    value="email"
                    checked={formik.values.notificationMethod === "email"}
                    onChange={formik.handleChange}
                    className="mr-2"
                  />
                  {t("label")}
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="notificationMethod"
                    value="sms"
                    checked={formik.values.notificationMethod === "sms"}
                    onChange={formik.handleChange}
                    className="mr-2"
                  />
                  {t("sms")}
                </label>
              </div>
              {formik.touched.notificationMethod &&
                formik.errors.notificationMethod && (
                  <p className="text-red-500 text-sm mt-1">
                    {formik.errors.notificationMethod}
                  </p>
                )}
            </div> */}

              {/* By Email */}
              <div className="p-4 border border-gray-300 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t("email")}
                </h3>
                <p className="text-gray-600 mb-4">{t("emailPara")}</p>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="emailTypes.marketing"
                      checked={formik.values.emailTypes.marketing}
                      onChange={formik.handleChange}
                      className="mr-2"
                    />
                    {t("marketing")}
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="emailTypes.announcements"
                      checked={formik.values.emailTypes.announcements}
                      onChange={formik.handleChange}
                      className="mr-2"
                    />
                    {t("announce")}
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="emailTypes.support"
                      checked={formik.values.emailTypes.support}
                      onChange={formik.handleChange}
                      className="mr-2"
                    />
                    {t("support")}
                  </label>
                </div>
              </div>

              {/* Buttons */}
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
    </div>
  );
};

export default NotificationsPage;
