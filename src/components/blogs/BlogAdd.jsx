"use client";
import React, { useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
const CreatableSelect = dynamic(() => import("react-select/creatable"), {
  ssr: false,
});
import { uploadToCloudinary } from "@/lib/helper";
import { useAuthStore } from "@/store/authStore";
const Editor = dynamic(() => import("primereact/editor").then((mod) => mod.Editor), {
  ssr: false,
});
import { useTranslations, useLocale } from "next-intl";

const BlogAdd = () => {
  const router = useRouter();
  const [serverError, setServerError] = useState(null);
  const [tags, setTags] = useState([]);
  const t = useTranslations("Admin");
  const locale = useLocale()?.toLowerCase?.() || "en";

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get("/admin/tags", {
          params: { limit: 100, page: 1, locale },
        });
        setTags(resp?.tags || []);
      } catch (err) {
        setServerError("Failed to load tags. Please try again later.");
      }
    })();
  }, [locale]);

  const formik = useFormik({
    initialValues: {
      title: { en: "", fi: "" },
      content: { en: "", fi: "" },
      tags: [],
      status: "draft",
      author: "",
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
        url: Yup.string()
          .url("Invalid URL format")
          .required("Image is required"),
        publicId: Yup.string().required("Image is required"),
      }),
    }),
    onSubmit: async (values) => {
      try {
        await api.post("/admin/blogs", values);
        router.push("/admin/blogs");
      } catch (err) {
        setServerError("Failed to create blog. Please try again.");
      }
    },
  });

  const fileInputRef = useRef(null);

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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t("blogLink")}</h1>
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
            className={`mt-1 p-2 w-full border ${formik.touched.title?.en && formik.errors.title?.en
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
            className={`mt-1 p-2 w-full border ${formik.touched.title?.fi && formik.errors.title?.fi
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
            placeholder={t("placeholderText")}
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
            {t("upload")} <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
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
                formik.setFieldValue("image", { url: "", publicId: "" });
              }
            }}
            onBlur={() => {
              // mark the image field as touched for validation display
              formik.setFieldTouched("image.url", true, true);
            }}
            className="mt-1 p-2 border border-gray-300 rounded-md w-full"
          />
          {formik.values.image.url && (
            <div className="mt-2">
              <img
                src={formik.values.image.url}
                alt="Preview"
                className="rounded-md h-40 object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  formik.setFieldValue("image", { url: "", publicId: "" });
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  formik.setFieldTouched("image.url", true, true);
                }}
                className="mt-2 inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Remove image
              </button>
            </div>
          )}
          {(formik.touched.image?.url || formik.submitCount > 0) &&
            (formik.errors.image?.url || formik.errors.image?.publicId) && (
              <div className="text-red-500 text-sm mt-1">
                {formik.errors.image?.url || formik.errors.image?.publicId}
              </div>
            )}
        </div>

        {/* Buttons */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={formik.isSubmitting}
            className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ${formik.isSubmitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
          >
            {t("createBlog")}
          </button>
          <Link
            href="/admin/blogs"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {t("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
};

export default BlogAdd;
