"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useScrollAnimation } from "@/hook/useScrollAnimation";
import Link from "next/link";

export default function FansHeroSection({ data, hideButtons = false }) {
  const router = useRouter();

  // Scroll animations
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation({
    threshold: 0, // Trigger immediately on load as it's at the top
  });

  const { ref: buttonsRef, isVisible: buttonsVisible } = useScrollAnimation({
    threshold: 0,
    delay: 200, // Slight delay after text
  });

  return (
    <section
      className="relative w-full h-screen flex flex-col items-start justify-center px-8 md:px-16 gap-8 bg-cover bg-center overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(0deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), linear-gradient(to bottom, transparent 0%, transparent 50%, rgba(0, 0, 0, 0.6) 80%, rgba(0, 0, 0, 1) 100%), url(${data?.img?.src || data?.img})`,
        backgroundPosition: data?.bgPosition || '50% 0',
        border: '1px solid #000000',
        marginBottom: 0,
      }}
    >
      {/* Content */}
      <div 
        ref={contentRef}
        className={`relative z-10 flex flex-col items-start gap-6 w-full max-w-[594px] scroll-blur-in ${contentVisible ? 'scroll-animate-visible' : ''}`}
      >
        {/* Tagline */}
        {data.subTitle && (
          <span className="text-white text-base font-bold leading-[150%]">
            {data.subTitle}
          </span>
        )}

        {/* Heading */}
        <h1 className="text-white font-normal text-[32px] md:text-[56px] leading-[120%] tracking-[-0.01em] w-full">
          {data.title}
        </h1>

        {/* Description */}
        <p className="text-white font-normal text-lg leading-[150%] w-full">
          {data.content}
        </p>
      </div>

      {/* Actions */}
      {!hideButtons && data.button1 && (
        <div
          ref={buttonsRef}
          className={`relative z-10 flex flex-row items-start gap-4 w-fit scroll-fade-up scroll-stagger-2 ${buttonsVisible ? 'scroll-animate-visible' : ''}`}
        >
          <Link
            href={data?.button1Route || "#"}
            className="flex flex-row justify-center items-center px-6 py-2.5 gap-2 bg-[rgba(242,105,21,0.93)] rounded-full text-white font-normal text-base leading-[150%] hover:bg-[rgba(242,105,21,1)] transition-colors"
          >
            {data.button1}
          </Link>
          <Link
            href={data?.button2Route || "#"}
            className="flex flex-row justify-center items-center px-6 py-2.5 gap-2 bg-[rgba(0,0,0,0.2)] rounded-full text-white font-normal text-base leading-[150%] hover:bg-[rgba(0,0,0,0.3)] transition-colors"
          >
            {data.button2}
          </Link>
        </div>
      )}
    </section>
  );
}

