"use client";
import React from "react";
import DefaultLayout from "../DefaultLayout.jsx/DefaultLayout";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useScrollAnimation } from "@/hook/useScrollAnimation";

export default function ImageNcontent({ data, changeBG, textColor, noPaddingBottom }) {
  const router = useRouter();

  // Scroll animations
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation({
    threshold: 0.15,
  });

  const { ref: imgRef, isVisible: imgVisible } = useScrollAnimation({
    threshold: 0.15,
  });

  return (
    <div className={` bg-${changeBG}`}>
      <DefaultLayout styling={`pt-[64px] lg:pt-[112px] ${noPaddingBottom ? '' : 'pb-[64px] lg:pb-[112px]'} bg-transparent`}>
        <div className="text-black overflow-hidden flex flex-col lg:flex-row">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between lg:w-full">
            <div
              ref={contentRef}
              className={`w-full lg:max-w-[616px] ${changeBG === "black" ? "text-white" : textColor} scroll-slide-left ${contentVisible ? 'scroll-animate-visible' : ''}`}
            >
              <span
                className={`text-left block  text-base font-bold leading-[150%] pb-3 lg:pb-4 ${changeBG === "black" ? "text-white" : ""}`}
              >
                {data.subTitle}
              </span>
              <h3
                className={`${
                  changeBG === "orange"
                    ? "text-[36px] lg:text-[48px]"
                    : "text-[32px]"
                } ${changeBG === "black" ? "text-white" : ""} leading-[120%] font-[400]`}
              >
                {data.title}
              </h3>
              <p className={`mt-4 text-base lg:text-lg leading-[150%] ${changeBG === "black" ? "text-white" : ""}`}>
                {data.content}
              </p>

              {data.button1 ? (
                <button
                  className={`${changeBG === "black" ? "primaryBtnPlain" : "primaryBtnPlainPurple"} text-white w-fit mt-6 lg:mt-8`}
                  onClick={() => router.push(`${data?.btnRoute}`)}
                >
                  {data.button1}
                </button>
              ) : null}
            </div>

            <div 
              ref={imgRef}
              className={`mt-12 lg:mt-0 scroll-scale-in ${imgVisible ? 'scroll-animate-visible' : ''}`}
            >
              <Image
                src={data.img}
                alt="Basketball player"
                width={600}
                height={600}
                className="w-full object-cover h-[335px] lg:h-[640px] lg:w-[616px] rounded-2xl overflow-hidden "
              />
            </div>
          </div>
        </div>
      </DefaultLayout>
    </div>
  );
}

