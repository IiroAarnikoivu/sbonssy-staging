"use client";
import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import api from "@/lib/axios";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
const CreatableSelect = dynamic(() => import("react-select/creatable"), {
  ssr: false,
});
const Editor = dynamic(
  () => import("primereact/editor").then((mod) => mod.Editor),
  { ssr: false }
);
import { uploadToCloudinary } from "@/lib/helper";
import Loader from "../Loader";
import Swal from "sweetalert2";
import { useTranslations, useLocale } from "next-intl";

const BlogEdit = () => {
  const router = useRouter();
  const { id } = useParams();
  const [serverError, setServerError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState([]);
  const t = useTranslations("Admin");
  const toastAlert = useTranslations("Sweetalert");
  const locale = useLocale()?.toLowerCase?.() || "en";

  const formik = useFormik({
    initialValues: {
      title: { en: "", fi: "" },
      content: { en: "", fi: "" },
      tags: [],
      status: "draft",
      image: { url: "", publicId: "" },
    },
    validationSchema: Yup.object({
      title: Yup.object({
        en: Yup.string()
          .min(3, "Title must be at least 3 characters")
          .max(100, "Title cannot exceed 100 characters")
          .required("English title is required"),
        fi: Yup.string()
          .min(3, "Title must be at least 3 characters")
          .max(100, "Title cannot exceed 100 characters")
          .required("Finnish title is required"),
      }),
      content: Yup.object({
        en: Yup.string()
          .min(10, "Content must be at least 10 characters")
          .required("English content is required"),
        fi: Yup.string()
          .min(10, "Content must be at least 10 characters")
          .required("Finnish content is required"),
      }),
      tags: Yup.array().of(Yup.string()),
      status: Yup.string()
        .oneOf(["draft", "published"])
        .required("Status is required"),
      image: Yup.object().shape({
        url: Yup.string().url("Invalid URL format").optional(),
        publicId: Yup.string().optional(),
      }),
    }),
    onSubmit: async (values) => {
      try {
        const result = await Swal.fire({
          title: toastAlert("sure"),
          text: toastAlert("blogUpdateTxt"),
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: toastAlert("updateBtn"), // Changed from "Save" to "Delete" for clarity
          cancelButtonText: toastAlert("cancel"), // Explicitly added for better UX
          customClass: {
            confirmButton: "confirmButton",
            cancelButton: "cancelButton",
          },
        });

        if (result.isConfirmed) {
          const resp = await api.put(`/admin/blogs/${id}`, values);
          if (resp) {
            await Swal.fire({
              title: toastAlert("blogUpdateSuccessTxt"),
              position: "top-right",
              icon: "success",
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
            router.push(`/admin/blogs`);
          }
        }
      } catch (err) {
        setServerError("Failed to update blog. Please try again.");
      }
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const [blogResp, tagsResp] = await Promise.all([
          api.get(`/admin/blogs/${id}`),
          api.get("/admin/tags", { params: { limit: 100, page: 1, locale } }),
        ]);
        const blog = blogResp.blog;
        formik.setValues({
          title: blog.title || { en: "", fi: "" },
          content: blog.content || { en: "", fi: "" },
          tags: blog.tags.map((tag) => tag._id),
          status: blog.status,
          image: blog.image || { url: "", publicId: "" },
        });
        setTags(tagsResp?.tags || []);
      } catch (err) {
        setServerError("Failed to load blog or tags. Please try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, locale]);

  const handleCreateTag = async (inputValue) => {
    try {
      const newTag = { name: inputValue };
      const response = await api.post("/admin/tags", newTag);
      const createdTag = response.tag; // Adjust based on your API response structure
      setTags((prev) => [...prev, createdTag]);
      formik.setFieldValue("tags", [...formik.values.tags, createdTag._id]);
    } catch (err) {
      setServerError("Failed to create tag. Please try again.");
    }
  };

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
      <h1 className="text-2xl font-bold mb-4">{t("editBlog")}</h1>
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

        {/* Content (EN) */}
        <div className="mb-4">
          <label
            htmlFor="content.en"
            className="block text-sm font-medium text-gray-700"
          >
            {t("content")} (EN)
          </label>
          <div className="card">
            <Editor
              value={formik.values.content.en}
              onTextChange={(e) => {
                formik.setFieldValue("content.en", e?.htmlValue);
              }}
              style={{ height: "320px" }}
            />
          </div>
          {formik.touched.content?.en && formik.errors.content?.en && (
            <div className="text-red-500 text-sm mt-1">
              {formik.errors.content.en}
            </div>
          )}
        </div>

        {/* Content (FI) */}
        <div className="mb-4">
          <label
            htmlFor="content.fi"
            className="block text-sm font-medium text-gray-700"
          >
            {t("content")} (FI)
          </label>
          <div className="card">
            <Editor
              value={formik.values.content.fi}
              onTextChange={(e) => {
                formik.setFieldValue("content.fi", e?.htmlValue);
              }}
              style={{ height: "320px" }}
            />
          </div>
          {formik.touched.content?.fi && formik.errors.content?.fi && (
            <div className="text-red-500 text-sm mt-1">
              {formik.errors.content.fi}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            {t("tags")}
          </label>
          <CreatableSelect
            isMulti
            name="tags"
            options={tags.map((tag) => ({
              value: tag._id,
              label:
                typeof tag.name === "object"
                  ? tag.name?.[locale] || tag.name?.en || tag.name?.fi
                  : tag.name,
            }))}
            value={tags
              .filter((tag) => formik.values.tags.includes(tag._id))
              .map((tag) => ({
                value: tag._id,
                label:
                  typeof tag.name === "object"
                    ? tag.name?.[locale] || tag.name?.en || tag.name?.fi
                    : tag.name,
              }))}
            onChange={(selectedOptions) =>
              formik.setFieldValue(
                "tags",
                selectedOptions.map((option) => option.value)
              )
            }
            onCreateOption={handleCreateTag}
            className="mt-1"
            placeholder="Select or type to create tags..."
          />
          {formik.touched.tags && formik.errors.tags && (
            <div className="text-red-500 text-sm mt-1">
              {formik.errors.tags}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="mb-4">
          <label
            htmlFor="status"
            className="block text-sm font-medium text-gray-700"
          >
            {t("status")}
          </label>
          <select
            id="status"
            name="status"
            value={formik.values.status}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className="mt-1 p-2 w-full border border-gray-300 rounded-md"
          >
            <option value="draft">{t("draft")}</option>
            <option value="published">{t("published")}</option>
          </select>
          {formik.touched.status && formik.errors.status && (
            <div className="text-red-500 text-sm mt-1">
              {formik.errors.status}
            </div>
          )}
        </div>

        {/* Image Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            {t("upload")}
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files[0];
              if (!file) return;

              try {
                const uploaded = await uploadToCloudinary({
                  file,
                  folder: "blogs",
                });
                formik.setFieldValue("image", {
                  url: uploaded.url,
                  publicId: uploaded.publicId,
                });
              } catch (error) {
                setServerError("Image upload failed. Please try again.");
              }
            }}
            className="mt-1 p-2 border border-gray-300 rounded-md w-full"
          />
          {formik.values.image.url && (
            <img
              src={formik.values.image.url}
              alt="Preview"
              className="mt-2 rounded-md h-40 object-cover"
            />
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
            {t("updateBlog")}
          </button>
          <Link
            href={`/admin/blogs`}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {t("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
};

export default BlogEdit;
