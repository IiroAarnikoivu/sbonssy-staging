"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import SettingsSidebar from "@/components/SettingsSidebar";
import { useAuthStoreWithTranslations } from "@/store/authStoreHelpers";
import Swal from "sweetalert2";
import Loader from "@/components/Loader";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import Image from "next/image";
import Pagination from "@/components/Pagination/pagination";
import { configureYupLocale } from "@/lib/yupLocales";

const AccountSettingsPage = () => {
  const { user, loading, logout } = useAuthStoreWithTranslations();
  const t = useTranslations("Settings.account");
  const toastAlert = useTranslations("Sweetalert");
  const locale = useLocale();
  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const router = useRouter();
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalItems: null,
    totalPages: null,
    limit: 10,
  });

  // Configure Yup locale and memoize schema for translated messages
  const normLocale =
    (typeof locale === "string" && locale.split("-")?.[0]) || locale;
  configureYupLocale(normLocale);
  const validationSchema = useMemo(
    () =>
      Yup.object({
        newMemberEmail: Yup.string().email().required().label(t("emailAdd")),
      }),
    [normLocale, t],
  );

  useEffect(() => {
    if (!loading && user) {
      const fetchInvites = async () => {
        try {
          const response = await fetch(
            `/api/invite?page=${pagination.currentPage}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            },
          );

          const { data, paginationData } = await response.json();

          if (response.ok) {
            setTeamMembers(data.accepted || []);
            setPendingInvites(data.pending || []);
            setPagination((p) => ({
              ...p,
              currentPage: paginationData?.page,
              totalItems: paginationData?.totalCount,
              totalPages: paginationData?.totalPages,
            }));
          } else {
            throw new Error(data.error || "Failed to fetch team members");
          }
        } catch (error) {
          Swal.fire({
            title: toastAlert("teamError"),
            text: error.message,
            icon: "error",
            toast: true,
            position: "top-right",
            showConfirmButton: false,
            timerProgressBar: false,
            timer: 3000,
          });
        }
      };
      fetchInvites();
    }
  }, [loading, user, pagination.currentPage]);

  const handlePageChange = (selectedPage) => {
    setPagination((p) => ({
      ...p,
      currentPage: selectedPage,
    }));
  };

  const formik = useFormik({
    initialValues: {
      newMemberEmail: "",
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        const response = await fetch("/api/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invitedEmail: values.newMemberEmail,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to send invitation");
        }

        setPendingInvites([...pendingInvites, result.invite]);
        resetForm({ values: { ...values, newMemberEmail: "" } });

        Swal.fire({
          title: toastAlert("invitationSent"),
          icon: "success",
          toast: true,
          position: "top-right",
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 3000,
        });
      } catch (error) {
        Swal.fire({
          title: toastAlert("invitationError"),
          text: error.message,
          icon: "error",
          toast: true,
          position: "top-right",
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 3000,
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

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
            position: "top-right",
            toast: true,
            showConfirmButton: false,
          });
        } finally {
          // Ensure client auth state is cleared so Header updates
          await logout();
          router.push("/");
        }
      }
    });
  };

  const handleRevokeInvite = async (inviteId) => {
    try {
      const response = await fetch(`/api/invite/${inviteId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        setPendingInvites(
          pendingInvites.filter((invite) => invite._id !== inviteId),
        );
        Swal.fire({
          title: toastAlert("revoked"),
          icon: "success",
          toast: true,
          position: "top-right",
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 3000,
        });
      } else {
        const { error } = await response.json();
        throw new Error(error || "Failed to revoke invitation");
      }
    } catch (error) {
      Swal.fire({
        title: toastAlert("revokedError"),
        text: error.message,
        icon: "error",
        toast: true,
        position: "top-right",
        showConfirmButton: false,
        timerProgressBar: false,
        timer: 3000,
      });
    }
  };

  const handleUpdatePermission = async (memberId, newPermission) => {
    if (user.onboardedDetails.permission === "Can View") {
      Swal.fire({
        title: toastAlert("denied"),
        text: toastAlert("revokePer"),
        icon: "error",
        toast: true,
        position: "top-right",
        showConfirmButton: false,
        timerProgressBar: false,
        timer: 3000,
      });
      return;
    }

    try {
      const response = await fetch(`/api/invite/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission: newPermission }),
      });
      if (response.ok) {
        setTeamMembers(
          teamMembers.map((member) =>
            member._id === memberId
              ? { ...member, permission: newPermission }
              : member,
          ),
        );
        Swal.fire({
          title: toastAlert("perUpdate"),
          icon: "success",
          toast: true,
          position: "top-right",
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 3000,
        });
      } else {
        const { error } = await response.json();
        throw new Error(error || "Failed to update permission");
      }
    } catch (error) {
      Swal.fire({
        title: toastAlert("perError"),
        text: error.message,
        icon: "error",
        toast: true,
        position: "top-right",
        showConfirmButton: false,
        timerProgressBar: false,
        timer: 3000,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!user || !["brand", "sports-ambassador"].includes(user.role)) {
    return (
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <p className="text-gray-700">{t("fallback")}</p>
      </div>
    );
  }

  return (
    <div className="md:flex min-h-screen bg-gray-50">
      <SettingsSidebar role={user.role} />

      {user?.onboardedDetails?.invitedBy ? (
        <div className="w-full px-3 py-6 pt-8 lg:p-6 lg:pt-8 max-w-4xl">
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {t("invite")}
            </h2>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 relative rounded-full overflow-hidden border-2 border-gray-200">
                <Image
                  src={user?.onboardedDetails?.invitedBy?.brand?.companyLogo}
                  alt="Company Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {user?.onboardedDetails?.invitedBy?.brand?.companyName}
                </h3>
                <p className="text-gray-600">
                  {t("invitedBy")}: {user?.onboardedDetails?.invitedBy?.email}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-red-100">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-1">
                  {t("deleteAc")}
                </h2>
                <p className="text-gray-600">{t("click")}</p>
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
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full px-3 py-6 pt-8 lg:p-6 lg:pt-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {t("heading")}
            </h1>
            <p className="text-gray-600">
              {t("para")} {user.role === "brand" ? t("brand") : t("ambassador")}{" "}
              {t("account")}
            </p>
          </div>

          {/* Team Members Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between gap-2 md:items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {user.role === "brand" ? t("Brand") : t("Ambassador")}{" "}
                {t("subHeading")}
              </h2>
              <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 w-fit rounded-full">
                {pagination.totalItems}{" "}
                {pagination.totalItems === 1 ? "member" : "members"}
              </span>
            </div>

            {teamMembers.length > 0 ? (
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                        {member.invitedEmail.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-700">
                        {member.invitedEmail}
                      </span>
                    </div>
                    <span className="bg-gray-50 text-gray-600 text-sm px-3 py-1.5 rounded-lg border border-gray-200 font-medium">
                      {t("modify")}
                    </span>
                  </div>
                ))}
                <Pagination
                  currentPage={pagination.currentPage}
                  pageCount={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">{t("fallback2")}</p>
              </div>
            )}
          </div>

          {/* Pending Invitations Section */}
          {pendingInvites.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  {t("pending")}
                </h2>
                <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full">
                  {pendingInvites.length} {t("pendinga")}
                </span>
              </div>

              <div className="space-y-4">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite._id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                        {invite.invitedEmail.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">
                          {invite.invitedEmail}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t("pendinga")} • {invite.permission}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeInvite(invite._id)}
                      className="text-red-500 hover:text-red-700 text-sm px-3 py-1 rounded-md hover:bg-red-50 transition-colors"
                      disabled={user.onboardedDetails.permission === "Can View"}
                    >
                      {t("revoke")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Team Member Section */}
          <form
            onSubmit={formik.handleSubmit}
            className="bg-white rounded-xl shadow-sm p-6 mb-6"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {t("add")}
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="newMemberEmail"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t("emailAdd")}
                </label>
                <input
                  type="email"
                  id="newMemberEmail"
                  name="newMemberEmail"
                  value={formik.values.newMemberEmail}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    formik.touched.newMemberEmail &&
                    formik.errors.newMemberEmail
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  placeholder="team.member@example.com"
                  disabled={user.onboardedDetails.permission === "Can View"}
                />
                {formik.touched.newMemberEmail &&
                  formik.errors.newMemberEmail && (
                    <p className="mt-1 text-sm text-red-600">
                      {formik.errors.newMemberEmail}
                    </p>
                  )}
              </div>

              {/* <div>
                <label
                  htmlFor="newMemberPermission"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t("permission")}
                </label>
                <select
                  id="newMemberPermission"
                  name="newMemberPermission"
                  value={formik.values.newMemberPermission}
                  onChange={formik.handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  disabled={user.onboardedDetails.permission === "Can View"}
                >
                  <option value="Can View">
                    {t("view")} - {t("canView")}
                  </option>
                  <option value="Can Modify">
                    {t("modify")} - {t("canModify")}
                  </option>
                </select>
              </div> */}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => formik.resetForm()}
                className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={user.onboardedDetails.permission === "Can View"}
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                disabled={
                  formik.isSubmitting ||
                  user.onboardedDetails.permission === "Can View"
                }
              >
                {formik.isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                    {t("sending")}
                  </span>
                ) : (
                  t("send")
                )}
              </button>
            </div>
          </form>

          {/* Delete Account Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-red-100">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-1">
                  {t("deleteAc")}
                </h2>
                <p className="text-gray-600">{t("click")}</p>
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
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettingsPage;
