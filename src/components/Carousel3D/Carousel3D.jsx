"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-coverflow";
import { EffectCoverflow } from "swiper/modules";
import Image from "next/image";
import DefaultLayout from "../Common/DefaultLayout.jsx/DefaultLayout";

function Carousel3D() {
  return (
    <div>
      <Swiper
        effect={"coverflow"}
        centeredSlides={true}
        slidesPerView={"4"}
        loop={true}
        speed={600}
        coverflowEffect={{
          rotate: 30,
          stretch: 0,
          depth: 100,
          modifier: 1,
          scale: 1,
          slideShadows: true,
        }}
        breakpoints={{
          320: {
            slidesPerView: 1,
          },
          640: {
            slidesPerView: 2,
          },
          1280: {
            slidesPerView: 3,
          },
          1560: {
            slidesPerView: 4,
          },
        }}
        modules={[EffectCoverflow]}
        className="coverFlow-carousel"
      >
        {img.map((i, index) => {
          return (
            <SwiperSlide>
              {/* 436px */}
              <div className="h-[436px] w-[auto] relative rounded-2xl overflow-hidden ">
                {/* <div className="w-full h-full relative Carousel3d-imgOverlay" /> */}
                <Image
                  fill
                  alt={`img-${index}`}
                  src={i}
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, (max-width: 1560px) 33vw, 25vw"
                />
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}

const img = [
  "https://res.cloudinary.com/dz2506ydg/image/upload/1_maaqoy.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/2_nonc1t.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/3_jslkfa.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/4_mytybn.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/6_wt7fua.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/7_ofjxtq.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/8_g4p8yz.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/9_xznk2t.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/10_lpjs6l.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/11_xxpvjz.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/12_hxtdas.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/13_ahcs9c.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/14_ktao2m.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/15_e1vcws.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/16_yy1tcm.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/17_ljj189.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/18_rcpfoz.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/19_scnnzf.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/20_o3d9he.jpg",
  "https://res.cloudinary.com/dz2506ydg/image/upload/21_rnme8z.jpg",
];

const Carousel3DContainer = ({ data, bg }) => {
  return (
    <div className={`bg-[${bg}] py-10 lg:pt-[100px] lg:pb-[81.94px]`}>
      <DefaultLayout>
        <h2 className="text-[36px] lg:text-[48px] text-center pb-8 lg:pb-10">
          {data}
        </h2>
        <div>
          <Carousel3D />
        </div>
      </DefaultLayout>
    </div>
  );
};

export default Carousel3DContainer;
