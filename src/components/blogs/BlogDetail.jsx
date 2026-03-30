"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { useRouter, useParams } from "next/navigation";
import { useLocale } from "next-intl";
import moment from "moment";
import Link from "next/link";
import Loader from "../Loader";
import { useTranslations } from "next-intl";

const BlogDetail = () => {
  const [blog, setBlog] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("Admin");
  const router = useRouter();
  const { id } = useParams();
  const locale = useLocale()?.toLowerCase?.() || "en";

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get(`/admin/blogs/${id}`, {
          params: { locale },
        });
        setBlog(resp.blog);
      } catch (err) {
        setError("Failed to load blog. Please try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, locale]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this blog?")) return;
    try {
      await api.delete(`/admin/blogs/${id}`);
      router.push("/admin/blogs");
    } catch (err) {
      toast.error("Failed to delete blog");
    }
  };

  if (loading)
    return (
      <div className="container mx-auto p-4">
        <Loader />
      </div>
    );
  if (error)
    return <div className="container mx-auto p-4 text-red-700">{error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t("blogDetailHeading")}</h1>
      {blog && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          {/* Title */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">
              {typeof blog.title === "object"
                ? blog.title?.en || blog.title?.fi || "Untitled"
                : blog.title || "Untitled"}
            </h2>
            {typeof blog.title === "object" && (
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="font-medium">Title (EN):</span>{" "}
                  {blog.title?.en || "—"}
                </p>
                <p>
                  <span className="font-medium">Title (FI):</span>{" "}
                  {blog.title?.fi || "—"}
                </p>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="mb-6">
            {typeof blog.content === "object" ? (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Content (EN)</h3>
                  <div
                    className="blog-content"
                    dangerouslySetInnerHTML={{ __html: blog.content?.en || "" }}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Content (FI)</h3>
                  <div
                    className="blog-content"
                    dangerouslySetInnerHTML={{ __html: blog.content?.fi || "" }}
                  />
                </div>
              </div>
            ) : (
              <div
                className="blog-content"
                dangerouslySetInnerHTML={{ __html: blog.content || "" }}
              />
            )}
          </div>
          <p className="text-sm text-gray-600">
            {t("author")}: {blog.author?.name || "Unknown"}
          </p>
          <p className="text-sm text-gray-600">Status: {blog.status}</p>
          <p className="text-sm text-gray-600">
            {t("tags")}: {blog.tags.map((tag) => tag.name).join(", ") || "None"}
          </p>
          {blog.image?.url && (
            <img
              src={blog.image.url}
              alt={blog.title}
              className="mt-4 max-w-full h-auto"
            />
          )}
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              {t("created")}: {moment(blog.createdAt).format("LLL")}
            </p>
            <p className="text-sm text-gray-600">
              {t("updated")}: {moment(blog.updatedAt).format("LLL")}
            </p>
          </div>

          <div className="mt-4 flex space-x-4">
            <Link
              href="/admin/blogs"
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              {t("backBlog")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogDetail;
