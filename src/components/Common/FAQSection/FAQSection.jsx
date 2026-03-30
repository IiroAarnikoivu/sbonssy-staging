"use client";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import React from "react";
import { useScrollAnimation, useStaggeredAnimation } from "@/hook/useScrollAnimation";

export default function FAQSection({ data, content, route }) {
  const router = useRouter();
  const t = useTranslations();

  // Scroll animations
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation({
    threshold: 0.15,
  });

  const { containerRef, isVisible: itemsVisible, getItemStyle } = useStaggeredAnimation(data.length, {
    staggerDelay: 100,
    threshold: 0.15,
  });

  return (
    <section className="bg-white">
      <DefaultLayout styling="py-[64px] lg:py-[112px]">
        <div className="flex flex-col lg:flex-row gap-12 lg:justify-between lg:gap-20">
          <div 
            ref={contentRef}
            className={`lg:max-w-[500px] text-textColor scroll-slide-right ${contentVisible ? 'scroll-animate-visible' : ''}`}
          >
            <h2 className="text-[32px] lg:text-[48px] font-semibold">
              {t("Brands.faqData.heading")}
            </h2>
            <p className="mt-5 lg:mt-6">
              {content}
            </p>

            <button
              className="primaryBtnPlain text-white  mt-6 lg:mt-8"
              onClick={() => router.push(`${route}`)}
            >
              {t("Brands.faqData.btn")}
            </button>
          </div>

          <div ref={containerRef} className="lg:max-w-[732px]">
            {data.map((faq, index) => {
              return (
                <div 
                  key={index} 
                  className={`mt-10 lg:mt-12 scroll-fade-up ${itemsVisible ? 'scroll-animate-visible' : ''}`}
                  style={getItemStyle(index)}
                >
                  <h4 className="font-semibold">{faq.title}</h4>
                  <p className=" mt-3 lg:mt-4 ">{faq.content}</p>
                </div>
              );
            })}
          </div>
        </div>
      </DefaultLayout>
    </section>
  );
}

