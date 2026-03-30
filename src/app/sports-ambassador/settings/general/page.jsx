"use client";

import Loader from "@/components/Loader";
import SettingsSidebar from "@/components/SettingsSidebar";
import api from "@/lib/axios";
import { toCamelCase } from "@/lib/helper";
import { useAuthStoreWithTranslations } from "@/store/authStoreHelpers";
import { useFormik } from "formik";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";
import Swal from "sweetalert2";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import { configureYupLocale } from "@/lib/yupLocales";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const ambassadorTypeOptions = [
  { value: "athlete", label: "Athlete" },
  { value: "team", label: "Team" },
  { value: "influencer", label: "Influencer" },
  { value: "para-athlete", label: "Para-Athlete" },
  { value: "coach", label: "Coach" },
  { value: "ex-athlete", label: "Ex-Athlete" },
];

const SportsAmbassadorSettingsPage = () => {
  const { user, loading, logout } = useAuthStoreWithTranslations();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const toastAlert = useTranslations("Sweetalert");
  const router = useRouter();
  const locale = useLocale();
  const normLocale =
    (typeof locale === "string" && locale.split("-")?.[0]) || locale;
  configureYupLocale(normLocale);

  const t = useTranslations("Settings.general");
  const validationSchema = useMemo(
    () =>
      Yup.object({
        subRole: Yup.string().required().label(t("label")),
        firstName: Yup.string().required().label(t("first")),
        lastName: Yup.string().required().label(t("last")),
        gender: Yup.string()
          .when("subRole", {
            is: (subRole) => subRole !== "team",
            then: () => Yup.string().required(),
          })
          .label(t("gender")),
        phoneNumber: Yup.string()
          .matches(/^[0-9]*$/, "Invalid phone number format")
          .min(7, "Invalid phone number format")
          .max(15, "Invalid phone number format")
          .label(t("phone")),
        currentPassword: Yup.string()
          .when("newPassword", {
            is: (newPassword) => !!newPassword,
            then: () => Yup.string().required(),
          })
          .label(t("password")),
        newPassword: Yup.string().min(6).label(t("newPassword")),
        confirmPassword: Yup.string()
          .when("newPassword", {
            is: (newPassword) => !!newPassword,
            then: () =>
              Yup.string()
                .oneOf([Yup.ref("newPassword"), null])
                .required(),
          })
          .label(t("confirmPassword")),
      }),
    [normLocale, t]
  );

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
      subRole: "",
      firstName: "",
      lastName: "",
      gender: "Male",
      phoneNumber: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const existingUserData = user?.onboardedDetails || {};
        const existingSubRoleData =
          user?.onboardedDetails?.[toCamelCase(values.subRole)] || {};

        const payload = {
          ...existingUserData,
          role: "sports-ambassador",
          subRole: values.subRole,
          phoneNumber: values.phoneNumber,
          [toCamelCase(values.subRole)]: {
            ...existingSubRoleData,
            name: `${values.firstName} ${values.lastName}`.trim(),
          },
        };

        if (values.subRole !== "team") {
          payload[toCamelCase(values.subRole)].gender =
            values.gender.toLowerCase();
        }

        if (values.newPassword) {
          payload.currentPassword = values.currentPassword;
          payload.newPassword = values.newPassword;
        }

        const response = await api.put("/user", payload);
        Swal.fire({
          title: toastAlert("profileUpdateThankYou"),
          position: "top-right",
          icon: "success",
          toast: true,
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 3000,
        });
        if (response.success && values.newPassword) {
          try {
            await logout();
          } finally {
            router.push("/authentication?tab=login");
          }
        }
      } catch (error) {
        Swal.fire({
          title: toastAlert("profileUpdateError"),
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
      user.onboardedDetails.role === "sports-ambassador"
    ) {
      const { subRole, email } = user.onboardedDetails;
      let firstName = "";
      let lastName = "";
      let fullName = "";
      if (subRole === "athlete" && user.onboardedDetails.athlete)
        fullName = user.onboardedDetails.athlete.name || "";
      else if (subRole === "team" && user.onboardedDetails.team)
        fullName = user.onboardedDetails.team.name || "";
      else if (subRole === "influencer" && user.onboardedDetails.influencer)
        fullName = user.onboardedDetails.influencer.name || "";
      else if (subRole === "para-athlete" && user.onboardedDetails.paraAthlete)
        fullName = user.onboardedDetails.paraAthlete.name || "";
      else if (subRole === "coach" && user.onboardedDetails.coach)
        fullName = user.onboardedDetails.coach.name || "";
      else if (subRole === "ex-athlete" && user.onboardedDetails.exAthlete)
        fullName = user.onboardedDetails.exAthlete.name || "";
      const nameParts = fullName.split(" ");
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(" ") || "";

      let gender = "Male";
      if (subRole !== "team") {
        if (subRole === "athlete" && user.onboardedDetails.athlete)
          gender = user.onboardedDetails.athlete.gender || "Male";
        else if (subRole === "influencer" && user.onboardedDetails.influencer)
          gender = user.onboardedDetails.influencer.gender || "Male";
        else if (
          subRole === "para-athlete" &&
          user.onboardedDetails.paraAthlete
        )
          gender = user.onboardedDetails.paraAthlete.gender || "Male";
        else if (subRole === "coach" && user.onboardedDetails.coach)
          gender = user.onboardedDetails.coach.gender || "Male";
        else if (subRole === "ex-athlete" && user.onboardedDetails.exAthlete)
          gender = user.onboardedDetails.exAthlete.gender || "Male";
        gender = gender.charAt(0).toUpperCase() + gender.slice(1);
      }

      formik.setValues(
        {
          subRole: subRole || "",
          firstName: firstName,
          lastName: lastName,
          gender: gender,
          phoneNumber: user.onboardedDetails?.phoneNumber || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        },
        false
      );
    }
  }, [loading, user]);

  const userEmail = user?.onboardedDetails?.email || "";
  const showGenderField = formik.values.subRole !== "team";

  if (loading) {
    return (
      <div className="flex min-h-screen bg-white items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!user || user.onboardedDetails?.role !== "sports-ambassador") {
    return (
      <div className="flex min-h-screen bg-white items-center justify-center">
        <p> {t("fallback")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <style jsx>{`
        .custom-select-wrapper {
          position: relative;
        }
        .custom-select-wrapper select {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 3rem;
        }
      `}</style>
      <div className="md:flex flex-1 bg-white">
        <SettingsSidebar role={"sports-ambassador"} />
        <div className="md:w-4/5 md:p-6 px-3 py-6">
          <div className="max-w-2xl">
            <form onSubmit={formik.handleSubmit} autoComplete="off">
              <div className="mb-6">
                <label
                  htmlFor="subRole"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t("label")}
                </label>
                <select
                  id="subRole"
                  name="subRole"
                  value={formik.values.subRole}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`mt-1 block w-full border border-gray-300 rounded-md py-3 px-4 pr-10 shadow-sm focus:ring-orange-500 focus:border-orange-500 ${
                    formik.touched.subRole && formik.errors.subRole
                      ? "border-red-500"
                      : ""
                  }`}
                  disabled
                >
                  <option value=""> {t("optionLabel")}</option>
                  {ambassadorTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {formik.touched.subRole && formik.errors.subRole && (
                  <p className="text-red-500 text-sm mt-1">
                    {formik.errors.subRole}
                  </p>
                )}
              </div>
              <div className="flex space-x-4 mb-6">
                <div className="w-1/2">
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    {t("first")}
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formik.values.firstName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`mt-1 block w-full border border-gray-300 rounded-md p-3 shadow-sm focus:ring-orange-500 focus:border-orange-500 ${
                      formik.touched.firstName && formik.errors.firstName
                        ? "border-red-500"
                        : ""
                    }`}
                  />
                  {formik.touched.firstName && formik.errors.firstName && (
                    <p className="text-red-500 text-sm mt-1">
                      {formik.errors.firstName}
                    </p>
                  )}
                </div>
                <div className="w-1/2">
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    {t("last")}
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formik.values.lastName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`mt-1 block w-full border border-gray-300 rounded-md p-3 shadow-sm focus:ring-orange-500 focus:border-orange-500 ${
                      formik.touched.lastName && formik.errors.lastName
                        ? "border-red-500"
                        : ""
                    }`}
                  />
                  {formik.touched.lastName && formik.errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">
                      {formik.errors.lastName}
                    </p>
                  )}
                </div>
              </div>
              {showGenderField && (
                <div className="mb-6">
                  <label
                    htmlFor="gender"
                    className="block text-sm font-medium text-gray-700"
                  >
                    {t("gender")}
                  </label>
                  <div className="custom-select-wrapper">
                    <select
                      id="gender"
                      name="gender"
                      value={formik.values.gender}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`mt-1 block w-full border border-gray-300 rounded-md py-3 px-4 pr-10 shadow-sm focus:ring-orange-500 focus:border-orange-500 ${
                        formik.touched.gender && formik.errors.gender
                          ? "border-red-500"
                          : ""
                      }`}
                    >
                      <option value="Male"> {t("option1")}</option>
                      <option value="Female"> {t("option2")}</option>
                      <option value="Other"> {t("option3")}</option>
                    </select>
                  </div>
                  {formik.touched.gender && formik.errors.gender && (
                    <p className="text-red-500 text-sm mt-1">
                      {formik.errors.gender}
                    </p>
                  )}
                </div>
              )}
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
                        (value || "").replace(/\D/g, "")
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
                      <LuEyeOff size={20} />
                    ) : (
                      <LuEye size={20} />
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
                      <LuEyeOff size={20} />
                    ) : (
                      <LuEye size={20} />
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
    </div>
  );
};

export default SportsAmbassadorSettingsPage;
