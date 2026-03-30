"use client";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import SmallCard from "@/components/Common/SmallCard/SmallCard";
import { useTranslations } from "next-intl";
import React from "react";
import { useScrollAnimation } from "@/hook/useScrollAnimation";

export default function SmallCardSectionBrand() {
  const t = useTranslations("Brands");

  // Scroll animations
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation({
    threshold: 0.2,
  });

  const { ref: footerRef, isVisible: footerVisible } = useScrollAnimation({
    threshold: 0.2,
    delay: 150,
  });

  const smallCardData = [
    {
      image: "https://res.cloudinary.com/dz2506ydg/image/upload/v1772104238/sbonssy_feb26_web_11_erft3j.webp",
      title: t("smallCardData.one.title"),
      para: t("smallCardData.one.para"),
    },
    {
      image:
        "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103952/sbonssy_feb26_web_10_sye9x0.webp",
      title: t("smallCardData.two.title"),
      para: t("smallCardData.two.para"),
    },
    {
      image:
        "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103949/sbonssy_feb26_web_5_nfvjhd.webp",
      title: t("smallCardData.three.title"),
      para: t("smallCardData.three.para"),
    },
  ];

  return (
    <div className="bg-black text-center text-white">
      <DefaultLayout styling="pt-[36px] lg:pt-[96px] pb-[64px] lg:pb-[112px]">
        <div 
          ref={headerRef}
          className={`lg:max-w-[768px] lg:mx-auto mb-12 lg:mb-20 scroll-fade-up ${headerVisible ? 'scroll-animate-visible' : ''}`}
        >
          <span className="text-base font-bold leading-[150%] block mb-2 lg:mb-4">
            {t("smallCardData.subHeading")}
          </span>
          <h3 className=" leading-[120%] tracking-[-1%] font-[400] text-[32px] lg:text-[40px]">
            {t("smallCardData.heading")}
          </h3>

          <p className=" text-base  tracking-[0%] leading-[150%] mt-5 lg:text-lg">
            {t("smallCardData.para")}
          </p>
        </div>
        <SmallCard
          data={smallCardData}
          wrapperStyle="bg-black"
          cardWrapper="grid lg:grid-cols-3 gap-12"
        />
      </DefaultLayout>
    </div>
  );
}

