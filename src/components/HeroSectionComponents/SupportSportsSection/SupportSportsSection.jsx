"use client";

import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import IconsLibrary from "@/util/IconsLibrary";
import React from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  useScrollAnimation,
  useStaggeredAnimation,
} from "@/hook/useScrollAnimation";

const SupportSportsSection = () => {
  const t = useTranslations("SupportSportsSection");

  // Scroll animation for heading
  const { ref: headingRef, isVisible: headingVisible } = useScrollAnimation({
    threshold: 0.2,
  });

  // Staggered animation for step cards
  const {
    containerRef,
    isVisible: cardsVisible,
    getItemStyle,
  } = useStaggeredAnimation(3, {
    staggerDelay: 150,
    threshold: 0.1,
  });

  const steps = [
    {
      title: t("steps.discover.title"),
      description: t("steps.discover.description"),
    },
    {
      title: t("steps.choose.title"),
      description: t("steps.choose.description"),
    },
    {
      title: t("steps.shop.title"),
      description: t("steps.shop.description"),
    },
  ];

  return (
    <section className="w-full bg-white">
      <DefaultLayout styling="pt-[95px] pb-[64px] lg:pb-[29px] lg:pt-[60px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Column - Steps */}
          <div
            ref={containerRef}
            className="space-y-8 lg:space-y-10"
          >
            {steps.map((step, index) => (
              <div
                key={index}
                className={`scroll-fade-up scroll-stagger-${
                  index + 1
                } ${cardsVisible ? "scroll-animate-visible" : ""}`}
                style={getItemStyle(index)}
              >
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-3">
                    <p className="text-black text-xl lg:text-2xl font-bold leading-[140%]">{index + 1}</p>
                    <h3 className="text-black text-xl lg:text-2xl font-semibold leading-[140%]">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-black text-base lg:text-lg leading-[150%] mt-3 lg:mt-4">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column - Image */}
          <div className="relative w-full aspect-square lg:aspect-[4/5]">
            <Image
              src="https://res.cloudinary.com/dz2506ydg/image/upload/v1771945749/sbonssy-storefront_xe4kzh.webp"
              alt="Support Sports"
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </DefaultLayout>
    </section>
  );
};

export default SupportSportsSection;
