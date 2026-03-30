"use client";
import React from "react";
import Image from "next/image";
import DefaultLayout from "../DefaultLayout.jsx/DefaultLayout";
import IconsLibrary from "@/util/IconsLibrary";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useScrollAnimation } from "@/hook/useScrollAnimation";

export default function ImgNinfo({ data, changeBG, flexDirections, fontSize, purpleButtons }) {
  const router = useRouter();

  // Scroll animations
  const { ref: imgRef, isVisible: imgVisible } = useScrollAnimation({
    threshold: 0.15,
  });

  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation({
    threshold: 0.15,
  });

  // Determine slide direction based on flexDirections
  // If it's reverse, image is on right (slides left), text on left (slides right)
  const isReverse = flexDirections?.includes("row-reverse");

  return (
    <>
      <section className={` bg-${changeBG}`}>
        <DefaultLayout styling="py-[64px] lg:py-[112px]">
          <div
            className={`flex ${flexDirections} lg:justify-between gap-12 lg:items-center `}
          >
            <div 
              ref={imgRef}
              className={`lg:max-w-[616px] scroll-scale-in ${imgVisible ? 'scroll-animate-visible' : ''}`}
            >
              <Image
                src={data.image}
                alt="Image content"
                width={600}
                height={400}
                className="rounded-2xl object-cover w-full h-[335px] lg:w-[616px] lg:h-[616px]"
              />
            </div>
            <div
              ref={contentRef}
              className={`lg:max-w-[616px] ${isReverse ? 'scroll-slide-right' : 'scroll-slide-left'} ${contentVisible ? 'scroll-animate-visible' : ''}`}
            >
              <span className={`text-left block  text-base font-bold leading-[150%] pb-3 lg:pb-4 ${changeBG === "black" ? "text-white" : ""}`}>
                {data.subtitle}
              </span>
              <h2
                className={`${changeBG === "black" ? "text-white" : "text-textColor"} ${fontSize} ${
                  data.titleFontSize === "change"
                    ? "text-[36px] lg:text-[47px]"
                    : "text-[36px] lg:text-[50px]"
                }`}
              >
                {data.title}
              </h2>

              <p className={`${changeBG === "black" ? "text-white" : "text-[#0C0D06]"} mt-5 lg:mt-6`}>
                {data.description ? (
                  <>
                    {data.description.split(/(\d+[-–]\d+%)/g).map((part, index) => {
                      const isPercentageRange = /\d+[-–]\d+%/.test(part);

                      if (isPercentageRange) {
                        return (
                          <span
                            key={index}
                            className="text-orange font-semibold"
                          >
                            {part}
                          </span>
                        );
                      }

                      return <React.Fragment key={index}>{part}</React.Fragment>;
                    })}
                  </>
                ) : null}
              </p>

              {Array.isArray(data.features) && data.features.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 py-2">
                  {data.features.map((feature, index) => (
                    <div key={index} className="flex flex-col gap-4">
                      <h6 className={`${changeBG === "black" ? "text-orange" : "text-[#0C0D06]"} font-bold text-base lg:text-[20px] lg:leading-[140%] tracking-[-0.01em]`}>
                        {feature.title}
                      </h6>
                      <p className={`text-base ${changeBG === "black" ? "text-white" : "text-[#0C0D06]"} leading-[150%]`}>
                        {feature.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {Array.isArray(data.buttons) && data.buttons.length > 0 && (
                <div className="flex gap-4 mt-6 lg:mt-8">
                  {data.buttons.map((button, index) =>
                    button.variant === "primary" ? (
                      <button
                        key={index}
                        className={`${changeBG === "black" ? "primaryBtnPlain" : purpleButtons ? "primaryBtnPlainPurple" : "primaryBtnPlain"} text-white`}
                        style={{
                          background: `${
                            !purpleButtons && changeBG === "true" ? "var(--reddishPurple)" : ""
                          }`,
                        }}
                        onClick={() => router.push(`${button.route}`)}
                      >
                        {button.label}
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push(`${button.route}`)}
                        key={index}
                        className={`flex cursor-pointer items-center  gap-2 lg:gap-4 text-base w-fit ${changeBG === "black" ? "text-white" : ""}`}
                      >
                        {button.label}
                        <IconsLibrary styling={`${changeBG === "black" ? "fill-white" : "fill-black"}`} name="rightChevon" />
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </DefaultLayout>
      </section>
    </>
  );
}

