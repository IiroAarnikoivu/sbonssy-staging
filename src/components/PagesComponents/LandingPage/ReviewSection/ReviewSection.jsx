import SwiperJsCarousel from "@/components/Common/SwiperJsCarousel/SwiperJsCarousel";
import React from "react";
import clientLogo from "../../../../../public/assets/logo/Logo.png";
import companyLogo from "../../../../../public/assets/logo/blackLogoCompany.png";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";

export default function ReviewSection({ data }) {
  const testmonial = [
    {
      platformLogo: "/assets/logo/Logo.png",
      platformName: data.testmonialName1,
      quote: data.testmonialQuote1,
      author: data.testmonialAuthor1,
      position: data.testmonialposition1,
      companyLogo: "/assets/logo/blackLogoCompany.png",
    },
    {
      platformLogo: "/assets/logo/Logo.png",
      platformName: data.testmonialName2,
      quote: data.testmonialQuote2,
      author: data.testmonialAuthor2,
      position: data.testmonialposition2,
      companyLogo: "/assets/logo/blackLogoCompany.png",
    },
    {
      platformLogo: "/assets/logo/Logo.png",
      platformName: data.testmonialName3,
      quote: data.testmonialQuote3,
      author: data.testmonialAuthor3,
      position: data.testmonialposition3,
      companyLogo: "/assets/logo/blackLogoCompany.png",
    },
  ];
  return (
    <DefaultLayout styling="py-[64px] lg:py-[112px]">
      <SwiperJsCarousel data={testmonial} testimonial simpleCarousel="true" />
    </DefaultLayout>
  );
}
