"use client";
import api from "@/lib/axios";
import Image from "next/image";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import Loader from "./Loader";
import { useTranslations, useLocale } from "next-intl";

const BlogDetail = () => {
  const [blog, setBlog] = useState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { id } = useParams();
  const t = useTranslations("BlogDetail");
  const locale = useLocale();

  // Helper to pick localized values like { en: string, fi: string }
  const pickLocalized = (val) => {
    if (val == null) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object") {
      if (val[locale] && typeof val[locale] === "string") return val[locale];
      if (val.en && typeof val.en === "string") return val.en;
      const firstKey = Object.keys(val).find((k) => typeof val[k] === "string");
      if (firstKey) return val[firstKey];
    }
    return String(val);
  };

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get(`/admin/blogs/${id}`);
        const data = resp?.data ?? resp;
        setBlog(data?.blog ?? data);
      } catch (err) {
        setError("Failed to load blog. Please try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-gray-500">{t("fallback")}</p>
      </div>
    );
  }

  const createdAtText = blog?.createdAt
    ? new Date(blog.createdAt).toLocaleDateString()
    : "";

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      {blog?.image?.url ? (
        <div className="relative w-full h-64 sm:h-80 md:h-96 mb-6 overflow-hidden rounded-lg">
          <Image
            src={blog.image.url}
            alt={blog?.title ?? "Blog cover"}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
            priority
          />
        </div>
      ) : null}

      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-2">
        {pickLocalized(blog?.title)}
      </h1>
      {createdAtText ? (
        <p className="text-sm text-gray-500 mb-6">
          {t("published")} {createdAtText}
        </p>
      ) : null}

      {Array.isArray(blog?.tags) && blog.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-8">
          {blog.tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
            >
              {pickLocalized(tag?.name)}
            </span>
          ))}
        </div>
      ) : null}

      {/* Render HTML content safely. Ensure the content is trusted. */}
      {blog?.content ? (
        <div
          className="max-w-none leading-relaxed text-justify blog-content"
          dangerouslySetInnerHTML={{ __html: pickLocalized(blog.content) }}
        />
      ) : (
        <p className="text-gray-600">{t("content")}</p>
      )}
    </article>
  );
};

export default BlogDetail;
