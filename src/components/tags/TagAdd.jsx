"use client";
import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import { useTranslations } from "next-intl";

const TagAdd = () => {
  const router = useRouter();
  const [serverError, setServerError] = useState(null);
  const t = useTranslations("Admin");
  const toastAlert = useTranslations("Sweetalert");
  const formik = useFormik({
    initialValues: {
      name: { en: "", fi: "" },
    },
    validationSchema: Yup.object({
      name: Yup.object({
        en: Yup.string()
          .min(2, "Tag name must be at least 2 characters")
          .max(50, "Tag name cannot exceed 50 characters")
          .required("English tag name is required"),
        fi: Yup.string()
          .min(2, "Tag name must be at least 2 characters")
          .max(50, "Tag name cannot exceed 50 characters")
          .required("Finnish tag name is required"),
      }),
    }),
    onSubmit: async (values) => {
      try {
        const result = await Swal.fire({
          title: toastAlert("sure"),
          text: toastAlert("addTagTxt"),
          icon: "info",
          showCancelButton: true,
          confirmButtonText: toastAlert("yes"),
          cancelButtonText: toastAlert("cancel"),
          customClass: {
            confirmButton: "confirmButton",
            cancelButton: "cancelButton",
          },
        });

        if (result.isConfirmed) {
          const resp = await api.post("/admin/tags", values);
          if (resp) {
            Swal.fire({
              title: toastAlert("tagAddedSuccess"),
              position: "top-right",
              icon: "success",
              toast: true,
              showConfirmButton: false,
              timerProgressBar: false,
              timer: 3000,
            });
            router.push("/admin/tags");
          }
        }
      } catch (err) {
        setServerError("Failed to create tag. Please try again.");
        toast.error("Failed to create tag");
      }
    },
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t("addTag")}</h1>
      {serverError && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {serverError}
        </div>
      )}
      <form
        onSubmit={formik.handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md"
      >
        <div className="mb-4">
          <label
            htmlFor="name.en"
            className="block text-sm font-medium text-gray-700"
          >
            {t("name")} (EN)
          </label>
          <input
            type="text"
            id="name.en"
            name="name.en"
            value={formik.values.name.en}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`mt-1 p-2 w-full border ${
              formik.touched.name?.en && formik.errors.name?.en
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md`}
          />
          {formik.touched.name?.en && formik.errors.name?.en && (
            <div className="text-red-500 text-sm mt-1">
              {formik.errors.name.en}
            </div>
          )}
        </div>
        <div className="mb-4">
          <label
            htmlFor="name.fi"
            className="block text-sm font-medium text-gray-700"
          >
            {t("name")} (FI)
          </label>
          <input
            type="text"
            id="name.fi"
            name="name.fi"
            value={formik.values.name.fi}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`mt-1 p-2 w-full border ${
              formik.touched.name?.fi && formik.errors.name?.fi
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md`}
          />
          {formik.touched.name?.fi && formik.errors.name?.fi && (
            <div className="text-red-500 text-sm mt-1">
              {formik.errors.name.fi}
            </div>
          )}
        </div>
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={formik.isSubmitting}
            className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ${
              formik.isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {t("createTag")}
          </button>
          <Link
            href="/admin/tags"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {t("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
};

export default TagAdd;
