"use client";
import Link from "next/link";
import DefaultLayout from "../DefaultLayout.jsx/DefaultLayout";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useScrollAnimation } from "@/hook/useScrollAnimation";

export default function CTASection({ data, centerAlign }) {
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  
  // Scroll animations
  const { ref: headingRef, isVisible: headingVisible } = useScrollAnimation({
    threshold: 0.2,
  });
  
  const { ref: buttonsRef, isVisible: buttonsVisible } = useScrollAnimation({
    threshold: 0.2,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem("locale");
        if (stored) setSelectedLanguage(stored);
      } catch (_) {
        // ignore
      }
    }
  }, []);

  const getOptimizedUrl = (url) => {
    if (typeof url !== "string" || !url.includes("cloudinary")) return url;
    if (url.includes("upload/")) {
      return url.replace("upload/", "upload/f_auto,q_auto,w_1920/");
    }
    return url;
  };

  const bgImgUrl = data.img.src || data.img;

  return (
    <div
      className={`relative overflow-hidden w-full h-fit flex after:w-screen after:h-screen after:bg-black/40 after:absolute after:top-0 after:left-0 ${
        centerAlign === "true"
          ? "justify-center items-center"
          : "justify-left items-center"
      }`}
    >
      <Image
        src={getOptimizedUrl(bgImgUrl)}
        alt="CTA background"
        fill
        className="object-cover object-bottom"
        sizes="100vw"
      />
      <DefaultLayout styling="py-[64px] lg:py-[112px]">
        <div
          className={`z-20 relative ${
            centerAlign === "true" ? "w-fit text-center" : "w-screen text-left "
          }`}
        >
          <div 
            ref={headingRef}
            className={`scroll-blur-in ${headingVisible ? 'scroll-animate-visible' : ''}`}
          >
            <h2
              className={`text-white text-[36px] lg:text-[48px] ${
                selectedLanguage === "fi" ? "w-[90%]" : ""
              }`}
            >
              {data.title}
            </h2>

            <p className="text-white pt-5 lg:pt-6 lg:max-w-[768px]">
              {data.para}
            </p>
          </div>

          <div
            ref={buttonsRef}
            className={`flex ${
              centerAlign === "true" ? "justify-center " : "justify-start"
            } gap-4 items-center mt-6 lg:mt-8 scroll-fade-up scroll-stagger-2 ${buttonsVisible ? 'scroll-animate-visible' : ''}`}
          >
            <Link
              href={data.route1}
              className={`${
                centerAlign === "true"
                  ? "primaryBtnPlain text-white "
                  : "primaryBtn"
              } ${data.imposeBtnClass}`}
            >
              {data.btn1}
            </Link>
            <Link 
              href={data.route2} 
              className="secondaryBtn text-white"
              aria-label={`${data.btn2} about ${data.title}`}
            >
              {data.btn2}
            </Link>
          </div>
        </div>
      </DefaultLayout>
    </div>
  );
}

