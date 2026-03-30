"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { useRouter, useParams } from "next/navigation";
import moment from "moment";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import Loader from "../Loader";

const HelpDetail = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("Admin.helpCenter");
  const locale = (useLocale?.() || "en")
    ?.toString()
    ?.toLowerCase()
    ?.split("-")?.[0] || "en";
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    (async () => {
      try {
        // Fetch full multilingual data without locale filtering so both EN and FI are available
        const resp = await api.get(`/admin/help/${id}`);
        const item = resp?.data?.data ?? resp?.data ?? null;
        setData(item);
      } catch (err) {
        setError("Failed to load FAQ. Please try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, locale]);

  if (loading)
    return (
      <div className="container mx-auto p-4">
        <Loader />
      </div>
    );
  if (error)
    return <div className="container mx-auto p-4 text-red-700">{error}</div>;

  const titleEn =
    typeof data?.title === "object" ? data?.title?.en || data?.title?.fi : data?.title;
  const titleFi =
    typeof data?.title === "object" ? data?.title?.fi || data?.title?.en : data?.title;
  const descriptionEn =
    typeof data?.description === "object"
      ? data?.description?.en || data?.description?.fi
      : data?.description;
  const descriptionFi =
    typeof data?.description === "object"
      ? data?.description?.fi || data?.description?.en
      : data?.description;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4"> {t("details")}</h1>
      {data && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">{t("title")}:</h2>
          <div className="mb-4 space-y-2">
            <div className="text-gray-800"><span className="font-medium">EN:</span> {titleEn}</div>
            <div className="text-gray-800"><span className="font-medium">FI:</span> {titleFi}</div>
          </div>
          <div className="text-gray-700 mb-4">
            {t("desc")}:
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-medium mb-1">EN</div>
                <div
                  className="prose help-content"
                  dangerouslySetInnerHTML={{ __html: descriptionEn }}
                />
              </div>
              <div>
                <div className="text-sm font-medium mb-1">FI</div>
                <div
                  className="prose help-content"
                  dangerouslySetInnerHTML={{ __html: descriptionFi }}
                />
              </div>
            </div>
          </div>

          <p className="text-gray-700 mb-4">
            {t("type")}:{" "}
            {data?.userType
              ? data?.userType.charAt(0).toUpperCase() + data?.userType.slice(1)
              : "N/A"}
          </p>

          <p className="text-sm text-gray-600">
            {t("created")}: {moment(data.createdAt).format("LLL")}
          </p>
          <p className="text-sm text-gray-600">
            {t("updated")}: {moment(data.updatedAt).format("LLL")}
          </p>
          <div className="mt-4 flex space-x-4">
            {/* <Link
              href={`/admin/faqs/edit/${id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-  700"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button> */}
            <Link
              href="/admin/help-center"
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              {t("back")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpDetail;
