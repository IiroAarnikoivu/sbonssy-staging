"use client";
import React from "react";
import DefaultLayout from "../DefaultLayout.jsx/DefaultLayout";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

export default function InsightsComponent({
  cardData = [],
  headingContent,
  bgColor,
}) {
  const router = useRouter();
  const t = useTranslations("Blog");
  const locale = useLocale()?.toLowerCase?.() || "en";

  const resolveLocalized = (val) =>
    typeof val === "object" && val !== null
      ? val?.[locale] || val?.en || val?.fi
      : val;

  const resolvedHeading = {
    subTitle: resolveLocalized(headingContent?.subTitle),
    title: resolveLocalized(headingContent?.title),
    para: resolveLocalized(headingContent?.para),
    btnText: resolveLocalized(headingContent?.btnText),
    route: headingContent?.route,
    bottomBtn: headingContent?.bottomBtn,
    textColor: headingContent?.textColor,
  };

  return (
    <section className={`bg-${bgColor} text-${resolvedHeading.textColor}`}>
      <DefaultLayout styling="py-[64px] lg:py-[112px]">
        {/* Heading Content */}
        <div className="lg:max-w-[768px] text-center lg:mx-auto mb-12 lg:mb-20">
          <span className="text-base font-bold  leading-[150%] block mb-2 lg:mb-4">
            {resolvedHeading.subTitle}
          </span>
          <h3 className="leading-[120%] tracking-[-1%] font-[400] text-[32px] lg:text-[40px]">
            {resolvedHeading.title}
          </h3>

          <p className="text-base  tracking-[0%] leading-[150%] mt-5 lg:text-lg">
            {resolvedHeading.para}
          </p>
        </div>

        {/* card section */}
        <div className="grid mt-12 lg:mt-20 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-8">
          {cardData.length > 0 ? (
            cardData.map((post) => {
              const title = resolveLocalized(post?.title);
              const description = resolveLocalized(post?.description);
              const tag = resolveLocalized(post?.tag);
              return (
                <div key={post.id} className="rounded-2xl">
                  <div className="">
                    <Image
                      src={post.image}
                      alt={title || "post"}
                      width={300}
                      height={180}
                      className="object-cover w-full h-full rounded-2xl overflow-hidden cursor-pointer"
                      onClick={() => router.push(`/blog/${post?._id}`)}
                    />
                  </div>
                  <span
                    className={`text-sm border-${cardData.textColor} border rounded-full px-3 py-1 block w-fit mt-6`}
                  >
                    {tag}
                  </span>
                  <h3 className="mt-2 text-xl lg:text-2xl">{title}</h3>
                  <p className="text-base mt-2">{description}</p>
                  {/* <div className="flex items-center gap-2 mt-6">
                  <Image
                    src={post.avatar}
                    alt={post.author}
                    width={48}
                    height={48}
                    className="rounded-full w-12 h-12 overflow-hidden"
                  />
                  <div>
                    <span>{post.author}</span>
                    <div className="flex items-center gap-2 text-sm">
                      <span>{post.date}</span>
                      <span className="mx-2">•</span>
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                </div> */}
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-base text-gray-500">
                {t("fallback") || "No insights available yet."}
              </p>
            </div>
          )}
        </div>

        <button
          className={`mt-12 block lg:mt-20 mx-auto w-fit text-center  ${resolvedHeading.bottomBtn}`}
          onClick={() => router.push(`${resolvedHeading.route}`)}
        >
          {resolvedHeading.btnText}
        </button>
      </DefaultLayout>
    </section>
  );
}
