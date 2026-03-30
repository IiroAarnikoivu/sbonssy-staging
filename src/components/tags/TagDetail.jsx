"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { useRouter, useParams } from "next/navigation";
import moment from "moment";
import Link from "next/link";
import Loader from "../Loader";
import { useTranslations, useLocale } from "next-intl";

const TagDetail = () => {
  const [tag, setTag] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("Admin");
  const router = useRouter();
  const { id } = useParams();
  const locale = useLocale()?.toLowerCase?.() || "en";

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get(`/admin/tags/${id}`, { params: { locale } });
        setTag(resp.tag);
      } catch (err) {
        setError("Failed to load tag. Please try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, locale]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this tag?")) return;
    try {
      await api.delete(`/admin/tags/${id}`);
      router.push("/admin/tags");
    } catch (err) {}
  };

  if (loading)
    return (
      <div className="container mx-auto p-4">
        <Loader />
      </div>
    );
  if (error)
    return <div className="container mx-auto p-4 text-red-700">{error}</div>;

  const localizedName =
    typeof tag?.name === "object"
      ? tag?.name?.[locale] || tag?.name?.en || tag?.name?.fi
      : tag?.name;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t("tagDetails")}</h1>
      {tag && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">{localizedName}</h2>
          {typeof tag.name === "object" && (
            <div className="text-sm text-gray-600 space-y-1 mb-4">
              <p>
                <span className="font-medium">Name (EN):</span>{" "}
                {tag.name?.en || "—"}
              </p>
              <p>
                <span className="font-medium">Name (FI):</span>{" "}
                {tag.name?.fi || "—"}
              </p>
            </div>
          )}
          <p className="text-sm text-gray-600">
            {t("created")}: {moment(tag.createdAt).format("LLL")}
          </p>
          <p className="text-sm text-gray-600">
            {t("updated")}: {moment(tag.updatedAt).format("LLL")}
          </p>
          <div className="mt-4 flex space-x-4">
            <Link
              href="/admin/tags"
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              {t("backTag")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagDetail;
