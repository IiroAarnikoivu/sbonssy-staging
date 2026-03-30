"use client";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import IconsLibrary from "@/util/IconsLibrary";
import { useTranslations } from "next-intl";
import Link from "next/link";
import React from "react";
import { useScrollAnimation, useStaggeredAnimation } from "@/hook/useScrollAnimation";

export default function SmartCampaign({ data }) {
  const t = useTranslations();

  // Scroll animations
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation({
    threshold: 0.2,
  });

  const { containerRef, isVisible: itemsVisible, getItemStyle } = useStaggeredAnimation(data.length, {
    staggerDelay: 120,
    threshold: 0.15,
  });

  return (
    <section className="bg-black">
      <DefaultLayout styling="py-[64px] lg:py-[112px]">
        <div className="">
          <h2 
            ref={headerRef}
            className={`text-[32px] lg:text-[40px] text-white mb-20 scroll-fade-up ${headerVisible ? 'scroll-animate-visible' : ''}`}
          >
            {t("Brands.smartCampaignData.heading")}
          </h2>

          <div ref={containerRef} className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {data.map((tool, index) => (
              <div 
                key={index} 
                className={`text-white text-left scroll-fade-up ${itemsVisible ? 'scroll-animate-visible' : ''}`}
                style={getItemStyle(index)}
              >
                <IconsLibrary
                  name="ball"
                  styling="fill-white"
                  filled="#fffff"
                />

                <h4 className="text-xl lg:text-2xl mt-3 lg:pt-6 text-[#f26915]">
                  {tool.title}
                </h4>
                <p className="text-base mt-3 lg:pt-6">{tool.description}</p>
                <Link
                  className="flex cursor-pointer items-center font-[400] gap-2 lg:gap-4 text-base w-fit mt-6 lg:mt-8"
                  href={tool.route}
                >
                  {tool.linkLabel}{" "}
                  <IconsLibrary styling="fill-white" name="rightChevon" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </DefaultLayout>
    </section>
  );
}

