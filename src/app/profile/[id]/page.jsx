"use client";

import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import SwiperJsCarousel from "@/components/Common/SwiperJsCarousel/SwiperJsCarousel";
import { useAuthStore } from "@/store/authStore";
import Image from "next/image";
import { useRouter } from "next/navigation";
import brandLogo from "../../../../public/assets/images/brand-logo.png";

const ViewProfile = () => {
  const { user } = useAuthStore();
  const onboardedDetails = user?.onboardedDetails;
  const brand = onboardedDetails?.brand;
  const router = useRouter();

  return (
    <div className="">
      {/* <div
        className="fixed  right-4 cursor-pointer"
        onClick={() => {
          router.push("/brand/edit-profile");
        }}
      >
        <FaEdit className="w-10 h-10" />
      </div> */}

      <div className="bg-[#390A21] px-8 py-20 w-full">
        <div className="max-w-[1312px] m-auto pl-0 pr-0 flex items-center justify-between">
          <div>
            <h1 className="text-[56px] font-normal text-white mb-6 leading-5">
              {brand?.companyName}
            </h1>
            <p className="text-[18px] font-normal  text-white mb-8 leading-6">
              {brand?.intro}
            </p>
            {/* <p>{brand?.currentJobTitle}</p> */}
            <a
              href={brand?.websiteUrl}
              target="_blank"
              className="underline text-[#fff] mb-8 block text-shadow-amber-800"
            >
              {brand?.websiteUrl}
            </a>
            <button className="bg-[#F26915] text-white text-base   py-2 px-6 rounded-full transition duration-300 h-11">
              Campaigns
            </button>
          </div>

          <div>
            <Image src={brandLogo} alt="brandlogo" width={200} height={100} />
          </div>
        </div>
      </div>

      {/* {my team section} */}
      <div>
        <div className="max-w-[1312px] m-auto pl-0 pr-0 pt-28 pb-28">
          <h1 className="text-[48px] leading-[64px] font-normal text-[#0C0D06] text-center mb-6">
            My team
          </h1>
          <p className="text-[18px] leading-6 font-normal text-center">
            Built through shared goals. Backed by real partnerships
          </p>

          <div className="flex justify-end">
            <button className="bg-[#F26915] text-[#fff] rounded-full h-11 px-5 mb-[29px]">
              View All
            </button>
          </div>

          <SwiperJsCarousel
            data={carouselContent}
            imgStyling="w-full h-[416px] object-cover rounded-2xl"
            breakpoint={CarouselBreakPoint}
            simpleCarousel="true"
            slidesCount={3}
            slideSpace={30}
            swiperBtnStl="!w-full "
          />
        </div>
      </div>
      {/* {my campaign section} */}
      <div className="bg-[#F1F1F1]">
        <DefaultLayout>
          <div className="pt-28">
            <p className="text-base font-bold leading-6 text-[#0C0D06] mb-4">
              Shop
            </p>
            <h1 className="text-5xl font-normal text-[#0C0D06] mb-4">
              My campaigns
            </h1>

            <div className="flex items-center justify-between mb-20 ">
              <p className="text-[18px] font-normal">
                Explore the campaigns and make impact, every purchase matters!
              </p>
              <button className="bg-[#F26915] text-[#fff] rounded-full h-11 px-5">
                View all
              </button>
            </div>

            <SwiperJsCarousel
              data={carouselData}
              imgStyling="w-full h-[368px] object-cover rounded-2xl"
              breakpoint={myCampBreakPoint}
              slidesCount={4}
              slideSpace={30}
              showImgContent={true}
              campaignBtnStyl="!bg-[#F26915ED] !text-[#fff]"
              ceoCards="true"
              myCampCarousel="!mt-5 !pb-[30px]"
            />
          </div>
        </DefaultLayout>
        <div></div>
      </div>

      {/* future sports section */}
      <div className="bg-[#F9FD99]">
        <DefaultLayout>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-16 md:py-28 gap-6 md:gap-0">
            <div className="text-3xl md:text-[56px] font-normal leading-tight md:leading-[64px]">
              Fuel the Future of Sports.
            </div>
            <div className="text-base md:text-[18px] font-normal md:w-[50%]">
              Support athletes, teams, and creators by backing ambassador-led
              campaigns. Be part of something bigger.
            </div>
          </div>
          {/* <div className="flex items-center justify-between py-28 px-0">
            <div className="text-[56px] font-normal leading-[64px]">Fuel the Future of Sports.
            </div>
            <div className="text-[18px] font-normal w-[50%]">Support athletes, teams, and creators by backing ambassador-led campaigns. Be part of something bigger.</div>
          </div> */}
        </DefaultLayout>
      </div>
    </div>
  );
};

export default ViewProfile;
const carouselContent = [
  {
    img: "/assets/images/dicoverCarousel/3.png",
    //  h1: "Campaign title Lorem IpsumCampaign title  Lorem ",
    // p: "Red Bull",
  },
  {
    img: "/assets/images/dicoverCarousel/2.png",
  },
  {
    img: "/assets/images/dicoverCarousel/3.png",
  },
  {
    img: "/assets/images/dicoverCarousel/4.jpg",
  },
  {
    img: "/assets/images/dicoverCarousel/3.png",
  },
  {
    img: "/assets/images/dicoverCarousel/2.png",
  },
  {
    img: "/assets/images/dicoverCarousel/3.png",
  },
  {
    img: "/assets/images/dicoverCarousel/4.jpg",
  },
  {
    img: "/assets/images/dicoverCarousel/3.png",
  },
  {
    img: "/assets/images/dicoverCarousel/2.png",
  },
];

const carouselData = [
  {
    img: "/assets/images/dicoverCarousel/3.png",
    title: "Campaign title Lorem Ipsum Campaign title Lorem",
    brand: "Red Bull",
  },
  {
    img: "/assets/images/dicoverCarousel/2.png",
    title: "Campaign title Lorem Ipsum Campaign title Lorem",
    brand: "Red Bull",
  },
  {
    img: "/assets/images/dicoverCarousel/4.jpg",
    title: "Campaign title Lorem Ipsum Campaign title Lorem",
    brand: "Red Bull",
  },
  {
    img: "/assets/images/dicoverCarousel/3.png",
    title: "Campaign title Lorem Ipsum Campaign title Lorem",
    brand: "Red Bull",
  },
  {
    img: "/assets/images/dicoverCarousel/2.png",
    title: "Campaign title Lorem Ipsum Campaign title Lorem",
    brand: "Red Bull",
  },
];

const CarouselBreakPoint = {
  320: {
    slidesPerView: 2.3,
    spaceBetween: 24,
  },

  640: {
    slidesPerView: 4.4,
  },

  1280: {
    spaceBetween: 32,
  },

  1600: {
    slidesPerView: 3.2,
    spaceBetween: 32,
  },
};

const myCampBreakPoint = {
  320: {
    slidesPerView: 2.5,
    spaceBetween: 24,
  },

  640: {
    slidesPerView: 2.5,
  },
  1200: {
    slidesPerView: 3.5,
    spaceBetween: 32,
  },
  1340: {
    slidesPerView: 3.5,
    spaceBetween: 32,
  },
  1600: {
    slidesPerView: 4.3,
    spaceBetween: 32,
  },
};
