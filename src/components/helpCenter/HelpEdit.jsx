"use client";
import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import api from "@/lib/axios";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import Loader from "../Loader";

const Editor = dynamic(
  () => import("primereact/editor").then((mod) => mod.Editor),
  { ssr: false }
);

const HelpEdit = () => {
  const router = useRouter();
  const { id } = useParams();
  const [serverError, setServerError] = useState(null);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("Admin.helpCenter");
  const toastAlert = useTranslations("Sweetalert");

  const formik = useFormik({
    initialValues: {
      title: { en: "", fi: "" },
      userType: "",
      description: { en: "", fi: "" },
    },
    validationSchema: Yup.object({
      title: Yup.object({
        en: Yup.string().required("English title is required").trim(),
        fi: Yup.string().trim(),
      }),
      userType: Yup.string().required("User type is required").trim(),
      description: Yup.object({
        en: Yup.string().required("English description is required").trim(),
        fi: Yup.string().trim(),
      }),
    }),
    onSubmit: async (values) => {
      try {
        const result = await Swal.fire({
          title: toastAlert("updateHelpTxt"),
          showCancelButton: true,
          confirmButtonText: toastAlert("updateBtn"),
          cancelButtonText: toastAlert("cancel"),
        });
        const resp = await api.put(`/admin/help/${id}`, values);
        if (resp) {
          await Swal.fire({
            title: toastAlert("helpUpdated"),
            position: "top-right",
            icon: "success",
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          router.push(`/admin/help-center`);
        }
      } catch (err) {
        setServerError("Failed to update FAQ. Please try again.");
      }
    },
  });

  const editorConfig = {
    readonly: false,
    height: 400,
    toolbarAdaptive: false,
    buttons: [
      "bold",
      "italic",
      "underline",
      "|",
      "ul",
      "ol",
      "|",
      "link",
      "image",
      "|",
      "undo",
      "redo",
    ],
    placeholder: "Start typing your blog content...",
  };
  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get(`/admin/help/${id}`);
        const data = resp.data;

        formik.setValues({
          title: data?.title || { en: "", fi: "" },
          userType: data?.userType || "",
          description: data?.description || { en: "", fi: "" },
        });
      } catch (err) {
        setServerError("Failed to load FAQ. Please try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading)
    return (
      <div className="container mx-auto p-4">
        <Loader />
      </div>
    );
  if (serverError)
    return (
      <div className="container mx-auto p-4 text-red-700">{serverError}</div>
    );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t("edit")}</h1>
      <form
        onSubmit={formik.handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md"
      >
        {/* Title (EN) */}
        <div className="mb-4">
          <label
            htmlFor="title.en"
            className="block text-sm font-medium text-gray-700"
          >
            {t("title")} (EN)
          </label>
          <input
            type="text"
            id="title.en"
            name="title.en"
            value={formik.values.title.en}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`mt-1 p-2 w-full border ${
              formik.touched.title?.en && formik.errors.title?.en
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md`}
          />
          {formik.touched.title?.en && formik.errors.title?.en && (
            <div className="text-red-500 text-sm mt-1">
              {formik.errors.title.en}
            </div>
          )}
        </div>

        {/* Title (FI) */}
        <div className="mb-4">
          <label
            htmlFor="title.fi"
            className="block text-sm font-medium text-gray-700"
          >
            {t("title")} (FI)
          </label>
          <input
            type="text"
            id="title.fi"
            name="title.fi"
            value={formik.values.title.fi}
            onChange={formik.handleChange}
            className={`mt-1 p-2 w-full border ${
              formik.touched.title?.fi && formik.errors.title?.fi
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md`}
          />
        </div>

        {/* User Type */}
        <div className="mb-4">
          <label
            htmlFor="userType"
            className="block text-sm font-medium text-gray-700"
          >
            {t("type")}
          </label>
          <select
            id="userType"
            name="userType"
            value={formik.values.userType}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`mt-1 p-2 w-full border ${
              formik.touched.userType && formik.errors.userType
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md`}
          >
            <option value="">{t("select")}</option>
            <option value="sports-ambassador">{t("ambassador")}</option>
            <option value="fan">{t("fan")}</option>
            <option value="brand">{t("brand")}</option>
          </select>
          {formik.touched.userType && formik.errors.userType && (
            <div className="text-red-500 text-sm mt-1">
              {formik.errors.userType}
            </div>
          )}
        </div>

        {/* Description (EN) */}
        <div className="mb-4">
          <label
            htmlFor="description.en"
            className="block text-sm font-medium text-gray-700"
          >
            {t("desc")} (EN)
          </label>
          <div className="card">
            <Editor
              value={formik.values.description.en}
              onTextChange={(e) => {
                formik.setFieldValue("description.en", e?.htmlValue);
              }}
              style={{ height: "320px" }}
            />
          </div>
          {formik.touched.description?.en && formik.errors.description?.en && (
            <div className="text-red-500 text-sm mt-1">
              {formik.errors.description.en}
            </div>
          )}
        </div>

        {/* Description (FI) */}
        <div className="mb-4">
          <label
            htmlFor="description.fi"
            className="block text-sm font-medium text-gray-700"
          >
            {t("desc")} (FI)
          </label>
          <div className="card">
            <Editor
              value={formik.values.description.fi}
              onTextChange={(e) => {
                formik.setFieldValue("description.fi", e?.htmlValue);
              }}
              style={{ height: "320px" }}
            />
          </div>
        </div>
        {/* Buttons */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={formik.isSubmitting}
            className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${
              formik.isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {t("update")}
          </button>
          <Link
            href={`/admin/help-center`}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {t("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
};

export default HelpEdit;
