"use client";

import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import Image from "next/image";
import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-coverflow";
import { EffectCoverflow } from "swiper/modules";

export default function Gallary({ data }) {
  return (
    <section className="bg-reddishPurple">
      <DefaultLayout styling="py-[64px] lg:py-[112px] ">
        <div className="lg:max-w-[768px] text-center mx-auto text-white">
          <h2 className="text-[32px] lg:text-[48px]">{data.galleryHeading}</h2>
          <p className="text-base lg:text-lg mt-4 lg:mt-6">
            {data.galleryDesc}
          </p>
        </div>

        <div className="mt-12 lg:mt-20">
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
              1024: {
                slidesPerView: 3,
              },
              1280: {
                slidesPerView: 4,
              },
            }}
            modules={[EffectCoverflow]}
            className="coverFlow-carousel"
          >
            {imageData.map((src, index) => (
              <SwiperSlide key={index}>
                <div className="h-[300px] lg:h-[400px] w-auto relative rounded-2xl overflow-hidden">
                  <Image
                    fill
                    alt={`Gallery ${index + 1}`}
                    src={src}
                    className="object-cover"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </DefaultLayout>
    </section>
  );
}

const imageData = [
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
