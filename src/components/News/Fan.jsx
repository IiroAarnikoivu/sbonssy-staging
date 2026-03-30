"use client";
import React, { useState } from "react";
import DefaultLayout from "../Common/DefaultLayout.jsx/DefaultLayout";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useScrollAnimation,
  useStaggeredAnimation,
} from "@/hook/useScrollAnimation";

const Fan = ({ data }) => {
  // State to track which item's description is visible
  const [activeIndex, setActiveIndex] = useState(null);
  const router = useRouter();
  const t = useTranslations("helpCenterFan");
  const tt = useTranslations("helpCenterCommon");

  // Scroll animations
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation({
    threshold: 0.1,
  });
  const { ref: ctaRef, isVisible: ctaVisible } = useScrollAnimation({
    threshold: 0.1,
    delay: 100,
  });
  const {
    containerRef,
    isVisible: listVisible,
    getItemStyle,
  } = useStaggeredAnimation(data?.length ?? 6, { staggerDelay: 100 });

  // Toggle description visibility for a specific item
  const toggleDescription = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div>
      {/* ---------- Header Section ---------- */}
      <section
        ref={headerRef}
        className={`bg-white text-base pt-20 lg:pt-[140px] pb-10 lg:pb-20 text-center transition-all duration-700 transform ${
          headerVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-6"
        }`}
      >
        <p className="text-[#0C0D06] capitalize">{t("fan")}</p>
        <h1 className="text-3xl md:text-[56px] mt-4 font-gothic">
          {t("heading")}
        </h1>
        <p className="text-[#000000] font-gothic mt-6 max-w-[768px] w-full mx-auto">
          {t("subHeading")}
        </p>
      </section>

      {/* ---------- FAQ/Accordion List ---------- */}
      <section className="bg-white pb-20">
        <DefaultLayout>
          <div ref={containerRef} className="max-w-4xl mx-auto">
            {data?.length > 0
              ? data?.map((item, i) => (
                  <div
                    key={i}
                    className={`border-b border-gray-200 transition-all duration-700 transform ${
                      listVisible
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-4"
                    }`}
                    style={getItemStyle(i)}
                  >
                    <button
                      type="button"
                      className="w-full flex items-center justify-between py-5 text-left focus:outline-none"
                      onClick={() => toggleDescription(i)}
                    >
                      <span className="font-gothic text-[18px] lg:text-[20px] tracking-[-0.2px] text-[#0C0D06]">
                        {item.title || "Blog title heading will go here"}
                      </span>
                      <span
                        aria-hidden
                        className={`transition-transform duration-200 ease-out ${
                          activeIndex === i ? "rotate-180" : "rotate-0"
                        }`}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-black"
                        >
                          <path
                            d="M6 9l6 6 6-6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </button>
                    {activeIndex === i && (
                      <div
                        className="font-gothic text-[#0C0D06] pb-5 help-content help-center-content"
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                    )}
                  </div>
                ))
              : Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`border-b border-gray-200 py-5 transition-all duration-700 transform ${
                      listVisible
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-4"
                    }`}
                    style={getItemStyle(i)}
                  >
                    <span className="font-gothic text-[18px] lg:text-[20px] text-[#0C0D06]">
                      {tt("fallback")}
                    </span>
                  </div>
                ))}
          </div>
        </DefaultLayout>
      </section>

      {/* ---------- CTA Section ---------- */}
      <section className="bg-neonGreen">
        <DefaultLayout
          styling={`py-[64px] lg:py-[112px] transition-all duration-700 transform ${
            ctaVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <h2
            ref={ctaRef}
            className="text-[36px] lg:text-[48px] text-[#0C0D06]"
          >
            {tt("heading")}
          </h2>

          <p className="text-[#0C0D06] text-lg mt-5 lg:mt-6">{tt("para")}</p>

          <div className="flex items-center text-base gap-4 mt-6 lg:mt-8">
            <button
              className="primaryBtnPurple"
              onClick={() => router.push("/contact")}
            >
              {tt("btn")}
            </button>
          </div>
        </DefaultLayout>
      </section>
    </div>
  );
};

export default Fan;
