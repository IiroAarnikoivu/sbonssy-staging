"use client";
import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import api from "@/lib/axios";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { uploadToCloudinary } from "@/lib/helper";
import Swal from "sweetalert2";
import { useTranslations } from "next-intl";
import Loader from "../Loader";

const EditBanner = () => {
  const router = useRouter();

  const { id } = useParams();
  const [serverError, setServerError] = useState(null);
  const [loading, setLoading] = useState(true);
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
      //   en: Yup.string().min(10).max(500).required("English description is required"),
      //   fi: Yup.string().min(10).max(500).required("Finnish description is required"),
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
      try {
        const result = await Swal.fire({
          title: toastAlert("sure"),
          text: toastAlert("updateBannerTxt"),
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: toastAlert("updateBtn"),
          cancelButtonText: toastAlert("cancel"),
          customClass: {
            confirmButton: "confirmButton",
            cancelButton: "cancelButton",
          },
        });

        if (result.isConfirmed) {
          const resp = await api.put(`/admin/banner/${id}`, values);
          if (resp) {
            Swal.fire({
              title: toastAlert("bannerUpdatedTxt"),
              position: "top-right",
              icon: "success",
              toast: true,
              showConfirmButton: false,
              timerProgressBar: false,
              timer: 3000,
            });
            router.push(`/admin/banner`);
          }
        }
      } catch (err) {
        setServerError("Failed to update FAQ. Please try again.");
      }
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get(`/admin/banner/${id}`);
        const banner = resp.data; // API returns { data: banner }
        const doc = banner?.data || banner; // support both shapes if interceptor changes

        formik.setValues({
          title: { en: doc?.title?.en || "", fi: doc?.title?.fi || "" },
          description: {
            en: doc?.description?.en || "",
            fi: doc?.description?.fi || "",
          },
          image: doc?.image || "",
          ctaOne: {
            label: {
              en: doc?.ctaOne?.label?.en || "",
              fi: doc?.ctaOne?.label?.fi || "",
            },
            path: doc?.ctaOne?.path || "",
          },
          ctaTwo: {
            label: {
              en: doc?.ctaTwo?.label?.en || "",
              fi: doc?.ctaTwo?.label?.fi || "",
            },
            path: doc?.ctaTwo?.path || "",
          },
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
  const handlePhoto = async (e) => {
    const file = e.target.files[0]; // Get the first file since it's a single upload
    if (file) {
      try {
        // Upload the file to Cloudinary
        const uploaded = await uploadToCloudinary({
          file,
          folder: "banner_photos",
        });

        const newImage = {
          ...uploaded,
          isProfile: true,
        };

        formik.setFieldValue("image", newImage.url);
      } catch (error) {
        console.error("Error uploading photo or updating user data:", error);
      }
    }
  };
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4"> {t("editheading")}</h1>
      <form
        onSubmit={formik.handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md"
      >
        {/* title (EN) */}
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

        {/* title (FI) */}
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

        {/* description (EN) */}
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

        {/* description (FI) */}
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

        <div className="mb-6">
          <label
            htmlFor="image"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t("img")}
          </label>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Image
                src={formik?.values?.image || "/placeholder-image.jpg"} // Fallback image
                alt="banner image"
                height={100}
                width={100}
                className="object-cover rounded-lg border border-gray-200 shadow-sm"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label
                htmlFor="image-upload"
                className="cursor-pointer bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200"
              >
                {t("upload")}
                <input
                  id="image-upload"
                  type="file"
                  onChange={(e) => {
                    handlePhoto(e);
                  }}
                  className="hidden"
                  accept="image/*"
                />
              </label>
              {formik?.values?.image && (
                <button
                  onClick={handleRemovePhoto}
                  className="text-sm text-red-600 hover:text-red-800  transition duration-200"
                >
                  {t("remove")}
                </button>
              )}
            </div>
          </div>
          {formik.touched.image && formik.errors.image && (
            <div className="text-red-500 text-sm mt-2">
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
            className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${
              formik.isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {t("update")}
          </button>
          <Link
            href={`/admin/banner`}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {t("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
};

export default EditBanner;
