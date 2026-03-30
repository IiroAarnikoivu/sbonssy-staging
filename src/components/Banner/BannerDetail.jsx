"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { useRouter, useParams } from "next/navigation";
import moment from "moment";
import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import Loader from "../Loader";

const BannerDetail = () => {
  const [banner, setBanner] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("Admin");
  const router = useRouter();
  const { id } = useParams();
  const locale = useLocale();

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get(`/admin/banner/${id}?locale=${locale}`);
        setBanner(resp.data);
      } catch (err) {
        setError("Failed to load banner. Please try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, locale]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this banner?")) return;
    try {
      await api.delete(`/admin/banner/${id}`);
      router.push("/admin/banner");
    } catch (err) {
      setError("Failed to delete banner");
    }
  };

  if (loading)
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-screen">
        <div className="text-lg font-medium text-gray-600 animate-pulse">
          <Loader />{" "}
        </div>
      </div>
    );

  if (error)
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-screen">
        <div className="text-lg font-medium text-red-600 bg-red-50 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          {t("detailHeading")}
        </h1>
        <Link
          href="/admin/banner"
          className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          ← {t("back")}
        </Link>
      </div>

      {banner && (
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            {banner.title}
          </h2>

          <div className="relative w-full h-64 sm:h-80 md:h-96 mb-6 overflow-hidden rounded-lg">
            <Image
              src={banner.image}
              alt={banner.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>

          <p className="text-gray-600 leading-relaxed mb-6">
            {banner.description}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {banner?.ctaOne?.label && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  {t("ctaLabel1")}
                </p>
                <p className="text-gray-600">{banner.ctaOne.label}</p>
                <p className="text-sm font-medium text-gray-700 mt-2">
                  {t("ctaPath1")}
                </p>
                <p className="text-gray-600 break-all">{banner.ctaOne.path}</p>
              </div>
            )}
            {banner?.ctaTwo?.label && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  {t("ctaLabel2")}
                </p>
                <p className="text-gray-600">{banner.ctaTwo.label}</p>
                <p className="text-sm font-medium text-gray-700 mt-2">
                  {t("ctaPath2")}
                </p>
                <p className="text-gray-600 break-all">{banner.ctaTwo.path}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500 mb-6">
            <p>
              {t("created")}: {moment(banner.createdAt).format("LLL")}
            </p>
            <p>
              {t("updated")}: {moment(banner.updatedAt).format("LLL")}
            </p>
          </div>

          {/* <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
            <Link
              href={`/admin/banner/edit/${id}`}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
            >
              Edit Banner
            </Link>
            <button
              onClick={handleDelete}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Banner
            </button>
          </div> */}
        </div>
      )}
    </div>
  );
};

export default BannerDetail;
