"use client";

// import in your component file
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import Image from "next/image";
import "swiper/css";
import "swiper/css/free-mode";
import { useTranslations } from "next-intl";

export default function TopBrandMarqueSection() {
  const t = useTranslations();
  return (
    <>
      <div className="py-[64px] lg:py-[112px]">
        <h3 className="font-bold text-base mb-8 lg:mb-[48px] text-left lg:text-center">
          {t("Company.trustBy")}
        </h3>
        <div className="linearCarousel ">
          <Swiper
            modules={[Autoplay, FreeMode]}
            freeMode={true}
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
            }}
            loop={true}
            speed={5000}
            slidesPerView={1.4}
            spaceBetween={20}
            grabCursor={false}
            allowTouchMove={false}
            className="w-full"
            breakpoints={{
              320: {
                slidesPerView: 1.4,
                spaceBetween: 20,
              },
              640: {
                slidesPerView: 4.4,
                spaceBetween: 20,
              },
              1280: {
                slidesPerView: 6.4,
                spaceBetween: 24,
              },
            }}
          >
            {logoContainer.map((logo, idx) => (
              <SwiperSlide
                key={idx}
                className="flex justify-center items-center"
              >
                <Image src={logo} alt={`logo-${idx}`} width={140} height={60} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </>
  );
}

const logoContainer = [
  "/assets/logo/Logo.png",
  "/assets/logo/relume.png",
  "/assets/logo/Logo.png",
  "/assets/logo/relume.png",
  "/assets/logo/Logo.png",
  "/assets/logo/relume.png",
  "/assets/logo/Logo.png",
  "/assets/logo/relume.png",
  "/assets/logo/Logo.png",
  "/assets/logo/relume.png",
  "/assets/logo/Logo.png",
  "/assets/logo/relume.png",
  "/assets/logo/Logo.png",
  "/assets/logo/relume.png",
  "/assets/logo/Logo.png",
];
