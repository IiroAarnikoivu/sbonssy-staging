"use client";

import React from "react";
import DefaultLayout from "../DefaultLayout.jsx/DefaultLayout";
import { useScrollAnimation } from "@/hook/useScrollAnimation";

export default function TextContainer({
  data,
  styling,
  contentAlliment,
  bgClass,
  centerText = false,
  orangeTitle = false,
  removeTopPadding = false,
  extraTopPadding = false,
  singleLineTitle = false,
  singleLineSubtitle = false,
}) {
  const { ref: containerRef, isVisible } = useScrollAnimation({
    threshold: 0.2,
  });

  // Determine text colors based on props
  const getTitleColor = () => {
    if (orangeTitle) return "text-orange";
    if (bgClass === "bg-reddishPurple") return "text-white";
    if (bgClass === "bg-black") return "text-white";
    if (bgClass === "bg-[#F1F1F1]") return "text-textColor";
    return "text-textColor";
  };

  const getTextColor = () => {
    if (bgClass === "bg-reddishPurple") return "text-white";
    if (bgClass === "bg-black") return "text-white";
    if (bgClass === "bg-[#F1F1F1]") return "text-textColor";
    if (bgClass === "white" || bgClass === "bg-white") return "text-black";
    return "text-white";
  };

  const paddingClass = removeTopPadding
    ? "pt-0 pb-[64px] lg:pb-[112px]"
    : extraTopPadding
    ? "pt-32 md:pt-48 pb-[64px] lg:pb-[112px]"
    : bgClass === "bg-black"
    ? "pt-[112px] lg:pt-[140px] pb-[64px] lg:pb-[112px]"
    : "py-[64px] lg:py-[112px]";

  return (
    <div className={bgClass}>
      <DefaultLayout styling={`${paddingClass} ${styling}`}>
        <div
          ref={containerRef}
          className={`${centerText ? 'flex flex-col items-center text-center' : 'grid lg:grid-cols-2 lg:justify-between'} scroll-blur-in ${isVisible ? 'scroll-animate-visible' : ''}`}
        >
          <div className={centerText ? 'w-full max-w-[1200px]' : ''}>
            <span
              className={`text-base font-bold leading-[150%] block mb-2 lg:mb-4 ${getTextColor()} ${singleLineSubtitle ? 'lg:line-clamp-1' : ''}`}
            >
              {data.subTitle}
            </span>
            <h3
              className={`leading-[120%] tracking-[-1%] font-[400] text-[32px] lg:text-[40px] ${centerText ? '' : 'lg:max-w-[616px]'} ${getTitleColor()} ${singleLineTitle ? 'lg:line-clamp-2' : ''}`}
            >
              {data.title}
            </h3>
            {contentAlliment && !centerText ? null : (
              <p
                className={`text-base tracking-[0%] leading-[150%] mt-5 lg:text-lg ${getTextColor()}`}
              >
                {data.para}
              </p>
            )}
          </div>

          {contentAlliment && !centerText ? (
            <p
              className={`text-base tracking-[0%] leading-[150%] mt-5 lg:text-lg lg:max-w-[616px] ${getTextColor()}`}
            >
              {data.para}
            </p>
          ) : null}
          {!centerText && <p></p>}
        </div>
      </DefaultLayout>
    </div>
  );
}

