import CTASection from "@/components/Common/CTASection/CTASection";
import TripleTestimonialSection from "@/components/Common/TripleTestimonialSection/TripleTestimonialSection";
import ContentSection from "@/components/PagesComponents/CompanyPage/ContentSection";
import GetInTouchForm from "@/components/PagesComponents/CompanyPage/GetInTouchForm";
import OurTeamCarousel from "@/components/PagesComponents/CompanyPage/OurTeamCarousel";
import StayInTouchSection from "@/components/PagesComponents/CompanyPage/StayInTouchSection";
import TopBrandMarqueSection from "@/components/PagesComponents/CompanyPage/TopBrandMarqueSection";
import { useTranslations } from "next-intl";
import React from "react";
import AnimatedSection from "@/components/Common/AnimatedSection";

export default function page() {
  const t = useTranslations("Company");
  const testimonials = [
    {
      id: 1,
      name: t("testimonialsData.one.name"),
      role: t("testimonialsData.one.role"),
      image: "/assets/images/Avatar.png", // replace with actual path
      text: t("testimonialsData.one.text"),
      rating: 5,
      companyLogo: "/assets/logo/Logo.png", // replace with actual path
    },
    {
      id: 2,
      name: t("testimonialsData.two.name"),
      role: t("testimonialsData.two.role"),
      image: "/assets/images/Avatar.png",
      text: t("testimonialsData.two.text"),
      rating: 5,
      companyLogo: "/assets/logo/Logo.png",
    },
    {
      id: 3,
      name: t("testimonialsData.three.name"),
      role: t("testimonialsData.three.role"),
      image: "/assets/images/Avatar.png",
      text: t("testimonialsData.three.text"),
      rating: 5,
      companyLogo: "/assets/logo/Logo.png",
    },
  ];

  const ctaData = {
    title: t("ctaData.title"),
    para: t("ctaData.para"),
    img: "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103790/sbonssy_feb26_webhero_6_viczxo.webp",
    route1: "#",
    route2: "#",
    btn1: t("ctaData.btn1"),
    btn2: t("ctaData.btn2"),
  };

  return (
    <>
      {/* <ContentSection />
      <OurTeamCarousel />
      <TopBrandMarqueSection />
      <TripleTestimonialSection data={testimonials} bgColor="bgGraySmoke" />
      <CTASection data={ctaData} centerAlign="true" /> */}
      {/* <StayInTouchSection /> */}
      <AnimatedSection effect="fade-up" threshold={0}>
        <GetInTouchForm />
      </AnimatedSection>
    </>
  );
}
