import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import React from "react";
import SwiperJsCarousel from "@/components/Common/SwiperJsCarousel/SwiperJsCarousel";
import { cookies } from "next/headers";

export default async function SportAmbassadorsCarousel({ data, images = [] }) {
  const cookieStore = await cookies();
  const ambassadorsRes = await fetch(
    `${process.env.NEXTAUTH_URL}/api/sports-ambassadors-list`,
    {
      headers: {
        Cookie: cookieStore.toString(),
      },
      cache: "no-store",
    }
  );

  // const { data: carouselContentData, total } = await ambassadorsRes.json();

  // const carouselContent = carouselContentData.map((data) => {
  //   return { img: data?.image };
  // });

  return (
    <div className="py-[64px] lg:py-[112px] bg-[#F1F1F1]">
      <DefaultLayout>
        <h2 className="text-[36px] lg:text-[48px]">{data}</h2>
      </DefaultLayout>

      <div className="SportAmbassadorsCarouselWrapper mt-[48px]">
        <SwiperJsCarousel
          data={carouselContent}
          imgStyling="w-full h-[144px] object-cover  lg:w-[416px] lg:h-[416px] rounded-2xl"
          breakpoint={breakpoints}
          homePages={true}
        />
      </div>
    </div>
  );
}

const carouselContent = [
  { img: "/assets/Ambassadors/Näyttökuva20240619095638.png" },
  { img: "/assets/Ambassadors/Näyttökuva20240627085948.png" },
  { img: "/assets/Ambassadors/Näyttökuva20240627090108.png" },
  { img: "/assets/Ambassadors/Näyttökuva20240627090449.png" },
  { img: "/assets/Ambassadors/Näyttökuva20240627141722.png" },
  { img: "/assets/Ambassadors/Näyttökuva20240715111351.png" },
  { img: "/assets/Ambassadors/Näyttökuva20240815131632.png" },
  { img: "/assets/Ambassadors/Näyttökuva20240826185018.png" },
  { img: "/assets/Ambassadors/Näyttökuva20240929163138.png" },
  { img: "/assets/Ambassadors/Näyttökuva20240929163442.png" },
  { img: "/assets/Ambassadors/Näyttökuva20240929163622.png" },
  { img: "/assets/Ambassadors/Näyttökuva20240929163650.png" },
  { img: "/assets/Ambassadors/Näyttökuva20241011115615.png" },
  { img: "/assets/Ambassadors/Näyttökuva20241101112432.png" },
  { img: "/assets/Ambassadors/Näyttökuva20241105105712.png" },
  { img: "/assets/Ambassadors/Näyttökuva20241105105808.png" },
  { img: "/assets/Ambassadors/Näyttökuva20241105105858.png" },
  { img: "/assets/Ambassadors/Näyttökuva20241107175408.png" },
  { img: "/assets/Ambassadors/Näyttökuva20241107175713.png" },
  { img: "/assets/Ambassadors/Näyttökuva20241127192900.png" },
];

const breakpoints = {
  320: {
    slidesPerView: 1,
    spaceBetween: 24,
  },

  640: {
    slidesPerView: 3,
    spaceBetween: 24,
  },
  1200: {
    slidesPerView: 4,
    spaceBetween: 32,
  },
  1340: {
    slidesPerView: 5,
    spaceBetween: 32,
  },

  1560: {
    slidesPerView: 6,
    spaceBetween: 32,
  },
};
