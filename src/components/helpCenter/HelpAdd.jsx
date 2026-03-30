"use client";
import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/store/authStore";
import { useTranslations } from "next-intl";

const Editor = dynamic(
  () => import("primereact/editor").then((mod) => mod.Editor),
  { ssr: false }
);

const HelpAdd = () => {
  const router = useRouter();
  const [serverError, setServerError] = useState(null);
  const t = useTranslations("Admin.helpCenter");

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
        await api.post("/admin/help", values);
        router.push("/admin/help-center");
      } catch (err) {
        setServerError("Failed to create. Please try again.");
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
    placeholder: "Start typing your content...",
  };
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t("add")} </h1>
      {serverError && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {serverError}
        </div>
      )}
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
            onBlur={formik.handleBlur}
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
            <option value="select">{t("select")}</option>
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
          {formik.touched.description?.fi && formik.errors.description?.fi && (
            <div className="text-red-500 text-sm mt-1">
              {formik.errors.description.fi}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={formik.isSubmitting}
            className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ${
              formik.isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {t("create")}
          </button>
          <Link
            href="/admin/help-center"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {t("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
};

export default HelpAdd;
