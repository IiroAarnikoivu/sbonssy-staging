"use client";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";

// Helper to strip HTML (including incomplete tags), decode a few common entities, and normalize whitespace
const stripHtml = (html) => {
  if (!html || typeof html !== "string") return "";
  return (
    html
      .replace(/<[^>]*>/g, " ")
      .replace(/<[^>]*$/g, " ")
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim()
  );
};

// Extract first N sentences from text
const getFirstSentences = (text, count = 2) => {
  if (!text || typeof text !== "string") return "";

  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";

  // Match sentences ending with . ! ?
  const sentences = clean.match(/[^.!?]+[.!?]+/g);

  if (sentences && sentences.length > 0) {
    return sentences.slice(0, count).join(" ").trim();
  }

  // Fallback: return first 150 chars
  if (clean.length > 150) {
    return clean.slice(0, 150).replace(/\s+\S*$/, "") + "...";
  }

  return clean;
};

export default function BlogCardWrapper({
  blogData,
  tabData,
  tags,
  selectedTag,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = tabData.findIndex((tab) => tab === selectedTag) || 0;
  const t = useTranslations("Blog");

  const handleTabClick = (tab) => {
    const newParams = new URLSearchParams(searchParams.toString());

    if (tab === "View All" || tab === tabData[0]) {
      newParams.delete("tag");
    } else {
      newParams.set("tag", tab);
    }

    router.push(`?${newParams.toString()}`, { scroll: false });
  };

  const safeBlogs = Array.isArray(blogData) ? blogData : [];

  return (
    <DefaultLayout styling="pb-[64px] lg:pb-[112px]">
      {/* Tabs Navigation */}
      <div className="mb-12 lg:mb-16 flex w-full overflow-x-auto gap-2">
        {Array.isArray(tabData) &&
          tabData.map((tab, index) => (
            <button
              key={index}
              onClick={() => handleTabClick(tab)}
              className={`py-[10px] px-4 text-nowrap rounded-full transition-all duration-300 cursor-pointer text-white hover:bg-orange ${
                selectedTag === tab || (!selectedTag && index === 0)
                  ? "bg-orange"
                  : "bg-black"
              }`}
            >
              {tab}
            </button>
          ))}
      </div>

      {/* Empty state */}
      {safeBlogs.length === 0 ? (
        <div className="text-center text-white py-10">
          <p>{t("fallback")}</p>
        </div>
      ) : (
        // Blog Cards Grid
        <div className="grid gap-12 lg:gap-8 md:grid-cols-[repeat(auto-fill,_minmax(328px,_1fr))]">
          {safeBlogs.map((item) => {
            const title = item?.title ?? "";
            const desc =
              typeof item?.description === "string" ? item.description : "";
            // Get first 2 sentences
            const preview = getFirstSentences(stripHtml(desc), 2);
            const imageSrc = item?.image || "/assets/images/defaultimg.png";

            return (
              <div
                key={item.id}
                className="flex flex-col overflow-hidden text-left text-textColor w-full rounded-2xl h-full hover:shadow-lg transition-shadow duration-300"
              >
                {/* Blog Cover Image */}
                <Link
                  href={`/blog/${item?._id}`}
                  className="relative block w-full h-[221px] flex-shrink-0"
                >
                  <Image
                    src={imageSrc}
                    alt={title || "Blog cover image"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 328px"
                  />
                </Link>

                {/* Blog Content */}
                <div className="bg-orange flex flex-col p-6 flex-grow">
                  <Link href={`/blog/${item?._id}`} className="flex flex-col h-full">
                    <span className="text-base font-bold leading-[150%] block mb-2 lg:mb-2">
                      {item?.tag}
                    </span>
                    <h3 className="text-lg mb-2 line-clamp-1 text-white">{title}</h3>
                    <p className="text-sm text-white">{preview}</p>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DefaultLayout>
  );
}
