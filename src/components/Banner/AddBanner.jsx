"use client";
import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { uploadToCloudinary } from "@/lib/helper";
import Image from "next/image";
import Swal from "sweetalert2";
import { IoMdClose } from "react-icons/io";
import { useTranslations } from "next-intl";

const AddBanner = () => {
  const router = useRouter();
  const [serverError, setServerError] = useState(null);
  const t = useTranslations("Admin");
  const toastAlert = useTranslations("Sweetalert");

  const formik = useFormik({
    initialValues: {
      title: { en: "", fi: "" },
      description: { en: "", fi: "" },
      image: "",
      ctaOne: {
        label: { en: "", fi: "" },
        path: "",
      },
      ctaTwo: {
        label: { en: "", fi: "" },
        path: "",
      },
    },
    validationSchema: Yup.object({
      title: Yup.object({
        en: Yup.string().min(5).max(100).required("English title is required"),
        fi: Yup.string().min(5).max(100).required("Finnish title is required"),
      }),
      // description: Yup.object({
      //   en: Yup.string()
      //     .min(10)
      //     .max(500)
      //     .required("English description is required"),
      //   fi: Yup.string()
      //     .min(10)
      //     .max(500)
      //     .required("Finnish description is required"),
      // }),
      image: Yup.string().required("Image is required"),
      // ctaOne: Yup.object({
      //   label: Yup.object({
      //     en: Yup.string().trim().required("Button One English label is required"),
      //     fi: Yup.string().trim().required("Button One Finnish label is required"),
      //   }),
      //   path: Yup.string().trim().required("Button One Path is required"),
      // }),
      // ctaTwo: Yup.object({
      //   label: Yup.object({
      //     en: Yup.string().trim().required("Button Two English label is required"),
      //     fi: Yup.string().trim().required("Button Two Finnish label is required"),
      //   }),
      //   path: Yup.string().trim().required("Button Two Path is required"),
      // }),
    }),
    onSubmit: async (values) => {
      const resp = await api.post(`/admin/banner`, values);
      if (resp) {
        Swal.fire({
          title: toastAlert("bannerSucessTxt"),
          position: "top-right",
          icon: "success",
          toast: true,
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 3000,
        });
        router.push(`/admin/banner`);
      }
    },
  });

  const handleRemovePhoto = async () => {
    const logoUrl = formik.values.image;
    if (logoUrl) {
      try {
        // Clear the companyLogo field in Formik
        formik.setFieldValue("image", "");
      } catch (error) {
        console.error("Error removing logo from Cloudinary:", error);
        // Optionally, notify the user but still clear the field
        formik.setFieldValue("image", "");
      }
    }
  };
  const handlePhoto = async (e) => {
    const file = e.target.files[0]; // Get the first file since it's a single upload
    if (file) {
      try {
        // Upload the file to Cloudinary
        const uploaded = await uploadToCloudinary({
          file,
          folder: "banner_photos",
        });

        // Create a new image object with the uploaded details
        const newImage = {
          ...uploaded,
          isProfile: true, // Set as profile image since it's replacing the first one
        };

        formik.setFieldValue("image", newImage.url);
      } catch (error) {
        console.error("Error uploading photo or updating user data:", error);
        // Optionally handle the error, e.g., show a notification
        // Optionally revert local state if needed
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t("link")}</h1>
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
          {formik.touched.title?.fi && formik.errors.title?.fi && (
            <div className="text-red-500 text-sm mt-1">
              {formik.errors.title.fi}
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
          <textarea
            id="description.en"
            name="description.en"
            value={formik.values.description.en}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`mt-1 p-2 w-full border ${
              formik.touched.description?.en && formik.errors.description?.en
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md h-40`}
          />
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
          <textarea
            id="description.fi"
            name="description.fi"
            value={formik.values.description.fi}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`mt-1 p-2 w-full border ${
              formik.touched.description?.fi && formik.errors.description?.fi
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md h-40`}
          />
          {formik.touched.description?.fi && formik.errors.description?.fi && (
            <div className="text-red-500 text-sm mt-1">
              {formik.errors.description.fi}
            </div>
          )}
        </div>

        {/* Image */}
        <div className="mb-4">
          <label
            htmlFor="image"
            className="block text-sm font-medium text-gray-700"
          >
            {t("upload")}
          </label>
          <input
            // className="hidden"
            type="file"
            id="image"
            onChange={(e) => {
              handlePhoto(e);
            }}
          />
          {formik.values.image && (
            <>
              <Image
                src={formik.values.image || ""}
                alt="image"
                height={100}
                width={100}
              />
              <button
                className=""
                type="button"
                // className={css.removeImageButton}
                onClick={() => handleRemovePhoto()}
              >
                {t("remove")}
              </button>
            </>
          )}

          {formik.touched.image && formik.errors.image && (
            <div className="text-red-500 text-sm mt-1">
              {formik.errors.image}
            </div>
          )}
        </div>

        {/* CTA One Label (EN) */}
        <div className="mb-4">
          <label
            htmlFor="ctaOne.label.en"
            className="block text-sm font-medium text-gray-700"
          >
            {t("btnLabel1")} (EN)
          </label>
          <input
            type="text"
            id="ctaOne.label.en"
            name="ctaOne.label.en"
            value={formik.values.ctaOne.label.en}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`mt-1 p-2 w-full border ${
              formik.touched.ctaOne?.label?.en &&
              formik.errors.ctaOne?.label?.en
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md`}
          />
          {formik.touched.ctaOne?.label?.en &&
            formik.errors.ctaOne?.label?.en && (
              <div className="text-red-500 text-sm mt-1">
                {formik.errors.ctaOne.label.en}
              </div>
            )}
        </div>

        {/* CTA One Label (FI) */}
        <div className="mb-4">
          <label
            htmlFor="ctaOne.label.fi"
            className="block text-sm font-medium text-gray-700"
          >
            {t("btnLabel1")} (FI)
          </label>
          <input
            type="text"
            id="ctaOne.label.fi"
            name="ctaOne.label.fi"
            value={formik.values.ctaOne.label.fi}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`mt-1 p-2 w-full border ${
              formik.touched.ctaOne?.label?.fi &&
              formik.errors.ctaOne?.label?.fi
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md`}
          />
          {formik.touched.ctaOne?.label?.fi &&
            formik.errors.ctaOne?.label?.fi && (
              <div className="text-red-500 text-sm mt-1">
                {formik.errors.ctaOne.label.fi}
              </div>
            )}
        </div>

        <div className="mb-4">
          <label
            htmlFor="ctaOne"
            className="block text-sm font-medium text-gray-700"
          >
            {t("btnRoute1")}
          </label>
          <input
            type="text"
            id="ctaOne"
            name="ctaOne.path"
            value={formik.values.ctaOne.path}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`mt-1 p-2 w-full border ${
              formik.touched.ctaOne?.path && formik.errors.ctaOne?.path
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md`}
          />
          {formik.touched.ctaOne?.path && formik.errors.ctaOne?.path && (
            <div className="text-red-500 text-sm mt-1">
              {formik.errors.ctaOne?.path}
            </div>
          )}
        </div>

        {/* CTA Two Label (EN) */}
        <div className="mb-4">
          <label
            htmlFor="ctaTwo.label.en"
            className="block text-sm font-medium text-gray-700"
          >
            {t("btnLabel2")} (EN)
          </label>
          <input
            type="text"
            id="ctaTwo.label.en"
            name="ctaTwo.label.en"
            value={formik.values.ctaTwo.label.en}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`mt-1 p-2 w-full border ${
              formik.touched.ctaTwo?.label?.en &&
              formik.errors.ctaTwo?.label?.en
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md`}
          />
          {formik.touched.ctaTwo?.label?.en &&
            formik.errors.ctaTwo?.label?.en && (
              <div className="text-red-500 text-sm mt-1">
                {formik.errors.ctaTwo.label.en}
              </div>
            )}
        </div>

        {/* CTA Two Label (FI) */}
        <div className="mb-4">
          <label
            htmlFor="ctaTwo.label.fi"
            className="block text-sm font-medium text-gray-700"
          >
            {t("btnLabel2")} (FI)
          </label>
          <input
            type="text"
            id="ctaTwo.label.fi"
            name="ctaTwo.label.fi"
            value={formik.values.ctaTwo.label.fi}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`mt-1 p-2 w-full border ${
              formik.touched.ctaTwo?.label?.fi &&
              formik.errors.ctaTwo?.label?.fi
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md`}
          />
          {formik.touched.ctaTwo?.label?.fi &&
            formik.errors.ctaTwo?.label?.fi && (
              <div className="text-red-500 text-sm mt-1">
                {formik.errors.ctaTwo.label.fi}
              </div>
            )}
        </div>

        <div className="mb-4">
          <label
            htmlFor="ctaTwo"
            className="block text-sm font-medium text-gray-700"
          >
            {t("btnRoute2")}
          </label>
          <input
            type="text"
            id="ctaTwo"
            name="ctaTwo.path"
            value={formik.values.ctaTwo.path}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`mt-1 p-2 w-full border ${
              formik.touched.ctaTwo?.path && formik.errors.ctaTwo?.path
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md`}
          />
          {formik.touched.ctaTwo?.path && formik.errors.ctaTwo?.path && (
            <div className="text-red-500 text-sm mt-1">
              {formik.errors.ctaTwo?.path}
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
            {t("link")}
          </button>
          <Link
            href="/admin/banner"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {t("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
};

export default AddBanner;
