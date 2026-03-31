"use client";

import React, { useEffect, useRef, useState } from "react";
import DefaultLayout from "../../../Common/DefaultLayout.jsx/DefaultLayout";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode, Pagination, EffectFade } from "swiper/modules";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function LandingHeroSection({
  bannerData = [],
  data = [],
  bgImage,
  mblImg,
}) {
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const [swiperReady, setSwiperReady] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [bgPosition, setbgPosition] = useState();
  const swiperRef = useRef(null);
  const t = useTranslations("Home");

  const router = useRouter();
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);

  // Safely pick localized value from object {en, fi} or return string as-is
  const pick = (val) => {
    if (val && typeof val === "object") {
      return val?.[locale] ?? val?.en ?? val?.fi ?? "";
    }
    return val ?? "";
  };

  useEffect(() => {
    setMounted(true);
    setSwiperReady(true); // ensures refs are attached before rendering Swiper
  }, []);

  // Handle Swiper Slide Change
  const handleSlideChange = () => {
    if (swiperRef.current) {
      setActiveIndex(swiperRef.current.swiper.realIndex);
    }
  };

  useEffect(() => {
    if (swiperRef.current && prevRef.current && nextRef.current) {
      swiperRef.current.swiper.params.navigation.prevEl = prevRef.current;
      swiperRef.current.swiper.params.navigation.nextEl = nextRef.current;

      // Destroy existing navigation, if any
      swiperRef.current.swiper.navigation.destroy();

      // Re-initialize with new refs
      swiperRef.current.swiper.navigation.init();
      swiperRef.current.swiper.navigation.update();
    }
  }, [swiperReady]);

  // Custom Pagination Controls
  const goToSlide = (index) => {
    if (swiperRef.current) {
      swiperRef.current.swiper.slideToLoop(index);
    }
  };

  useEffect(() => {
    if (activeIndex === 0) {
      setbgPosition("50% 60%");
    }
    if (activeIndex === 1) {
      setbgPosition("50% 0%");
    }
    if (activeIndex === 2) {
      setbgPosition("50% 100%");
    }
  }, [activeIndex]);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const slides = [0, 1, 2];
    let currentIndex = 0;

    const intervalId = setInterval(() => {
      currentIndex = (currentIndex + 1) % slides.length;
      if (swiperRef.current) {
        swiperRef.current.swiper.slideTo(slides[currentIndex]);
      }
    }, 7000);

    return () => clearInterval(intervalId);
  }, [data]);

  const getOptimizedUrl = (url) => {
    if (typeof url !== "string" || !url.includes("cloudinary")) return url;
    if (url.includes("upload/")) {
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      const w = isMobile ? "w_828" : "w_1920";
      return url.replace("upload/", `upload/f_auto,q_80,${w}/`);
    }
    return url;
  };

  const currentHeroImg = typeof bgImage === "string" ? bgImage : bgImage?.src;

  return (
    <section className="overflow-hidden">
      <div className="relative w-screen h-screen flex justify-start items-center after:w-screen after:h-full after:bg-black/40 after:absolute after:top-0 after:left-0">
        <Image
          src={getOptimizedUrl(currentHeroImg)}
          alt="Hero background"
          fill
          loading="eager"
          className="object-cover"
          style={{ objectPosition: bgPosition }}
          sizes="100vw"
        />
        <DefaultLayout styling="w-[100vw] sm:w-full">
          {mounted && (
            <Swiper
              modules={[Pagination, Autoplay, FreeMode, EffectFade]}
              freeMode={true}
              ref={swiperRef}
              navigation={{
                prevEl: prevRef.current,
                nextEl: nextRef.current,
              }}
              autoplay={data?.length > 1 ? {
                delay: 5000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              } : false}
              speed={300} // Smooth transition duration
              effect="fade"
              fadeEffect={{
                crossFade: true, // Ensures smooth crossfade, previous slide fades to opacity 0
              }}
              onSlideChange={handleSlideChange}
              className="landingHeroSwiper"
              spaceBetween={20}
              slidesPerView={1}
              loop={data?.length > 1}
            >
              {data?.map((item, index) => {
                return (
                  <SwiperSlide key={index}>
                    <div className="lg:w-screen h-full relative z-20 pt-52 md:pt-64 lg:pt-80">
                      <div className="w-full lg:max-w-[650px]">
                        <h1 className="text-white font-[400] text-[24px] leading-[120%] tracking-[-1%] lg:text-[56px] mb-6 lg:mb-8">
                          {t("descriptionLine1")} {t("descriptionLine2")}
                        </h1>
                        {item?.ctaOne?.path && item?.ctaTwo?.path && (
                          <div className="mt-6 lg:mt-8 flex items-center gap-4">
                            <Link
                              href={item?.ctaOne?.path || "#"}
                              className="primaryBtn"
                            >
                              {pick(item?.ctaOne?.label)}
                            </Link>
                            <Link
                              href={item?.ctaTwo?.path || "#"}
                              className="secondaryBtn text-white"
                            >
                              {pick(item?.ctaTwo?.label)}
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          )}
          {mounted && data?.length > 1 && (
            <div className="flex gap-2 justify-center absolute bottom-[26px] mx-auto left-1/2 transform -translate-x-1/2 z-30">
              {data.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className={`w-2 h-2 rounded-full ${
                    activeIndex === idx ? "bg-white" : "bg-[var(--textColor)]"
                  }`}
                ></button>
              ))}
            </div>
          )}
          {/* Explore button bottom-left */}
          {mounted && (
            <div className="absolute bottom-8 left-4 lg:relative lg:bottom-0 lg:left-0 z-30 lg:mt-28">
              <Link
                href="/marketplace"
                className="text-orange-500 font-medium text-sm flex items-center gap-1"
              >
                <span>{t("explore")}</span>
                <span>{">"}</span>
              </Link>
            </div>
          )}
        </DefaultLayout>
      </div>
    </section>
  );
}
