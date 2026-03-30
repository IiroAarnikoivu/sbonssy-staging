import Carousel3DContainer from "@/components/Carousel3D/Carousel3D";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import SwiperJsCarousel from "@/components/Common/SwiperJsCarousel/SwiperJsCarousel";
import { useTranslations } from "next-intl";

export default function CarouselSection() {
  const t = useTranslations();
  return (
    <div className="py-[64px] text-white lg:py-[112px] bg-reddishPurple">
      <DefaultLayout>
        <div className="lg:max-w-[768px] lg:mx-auto text-center">
          <h2 className="text-[36px] lg:text-[48px]">
            {t("AthleteTeam.carouselSection.heading")}
          </h2>
          <p className="text-base  lg:text-lg leading-[150%] tracking-[0] mt-5">
            {t("AthleteTeam.carouselSection.para")}
          </p>
        </div>
      </DefaultLayout>

      <div className="SportAmbassadorsCarouselWrapper mt-[48px]">
        {/* <SwiperJsCarousel
          data={carouselContent}
          imgStyling="w-full h-[144px] object-cover  lg:w-[304px] lg:h-[304px] rounded-2xl"
          breakpoint={CarouselBreakPoint}
          simpleCarousel="true"
          darkBG={true}
        /> */}

        <Carousel3DContainer bg={"#390a21"} />
      </div>
    </div>
  );
}

const carouselContent = [
  {
    img: "/assets/images/athleticNteamsCarousel/1.png",
  },
  {
    img: "/assets/images/athleticNteamsCarousel/2.png",
  },
  {
    img: "/assets/images/athleticNteamsCarousel/3.png",
  },
  {
    img: "/assets/images/athleticNteamsCarousel/4.png",
  },
  {
    img: "/assets/images/athleticNteamsCarousel/1.png",
  },
  {
    img: "/assets/images/athleticNteamsCarousel/2.png",
  },
  {
    img: "/assets/images/athleticNteamsCarousel/3.png",
  },
  {
    img: "/assets/images/athleticNteamsCarousel/4.png",
  },
];

const CarouselBreakPoint = {
  320: {
    slidesPerView: 2.3,
    spaceBetween: 24,
  },

  640: {
    slidesPerView: 4.4,
    spaceBetween: 24,
  },

  1280: {
    spaceBetween: 32,
    slidesPerView: 5.4,
  },

  1600: {
    slidesPerView: 6.4,
    spaceBetween: 32,
  },
};
