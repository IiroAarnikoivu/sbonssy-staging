"use client";
import React from "react";
import DefaultLayout from "../DefaultLayout.jsx/DefaultLayout";
import { useRouter } from "next/navigation";
import { useScrollAnimation } from "@/hook/useScrollAnimation";

export default function HeroSection({ data, centerContent, hideButtons = false }) {
  const router = useRouter();

  // Scroll animations
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation({
    threshold: 0, // Trigger immediately since it's above the fold
  });

  const { ref: buttonsRef, isVisible: buttonsVisible } = useScrollAnimation({
    threshold: 0,
    delay: 200,
  });

  return (
    <section
      className={`bg-cover bg-center w-full h-screen flex justify-start items-center overflow-hidden relative`}
      style={{
        backgroundImage: `linear-gradient(0deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), linear-gradient(to bottom, transparent 0%, transparent 50%, rgba(0, 0, 0, 0.6) 80%, rgba(0, 0, 0, 1) 100%), url(${data?.img?.src || data?.img})`,
        backgroundPosition: data?.bgPosition,
      }}
    >
      <DefaultLayout>
        <div
          className={`z-20 relative ${
            centerContent === "true"
              ? "w-fit text-center lg:max-w-[768px]"
              : "lg:w-screen"
          }`}
        >
          <div 
            ref={contentRef}
            className={`scroll-blur-in ${contentVisible ? 'scroll-animate-visible' : ''}`}
          >
            <span className="text-left text-white text-base font-bold leading-[150%]  mb-3 lg:mb-5">
              {data.subTitle}
            </span>
            <h1
              className={`text-white font-[400] text-[40px] leading-[120%] tracking-[-1%] lg:text-[56px]`}
              style={{ maxWidth: data.maxWidthContent }}
            >
              {data.title}
            </h1>
            <p
              className={`mt-5 lg:mt-6 text-white font-[400] text-lg leading-[150%]`}
              style={{ maxWidth: data.maxWidthContent }}
            >
              {data.content}
            </p>
          </div>

          {!hideButtons && data.button1 ? (
            <div
              ref={buttonsRef}
              className={`${
                centerContent === "true" ? " mx-auto w-fit text-center" : ""
              } scroll-fade-up scroll-stagger-2 ${buttonsVisible ? 'scroll-animate-visible' : ''}`}
            >
              <div className="mt-6 lg:mt-8 flex items-center gap-4">
                <button
                  className="primaryBtn"
                  onClick={() => router.push(`${data?.button1Route}`)}
                >
                  {data.button1}
                </button>
                <button
                  className="secondaryBtn text-white"
                  onClick={() => router.push(`${data?.button2Route}`)}
                >
                  {data?.button2}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </DefaultLayout>
    </section>
  );
}

