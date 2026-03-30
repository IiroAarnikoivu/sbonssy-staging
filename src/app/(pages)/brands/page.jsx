import CheckBoxSection from "@/components/Common/CheckBoxSection/CheckBoxSection";
import HeroSection from "@/components/Common/HeroSection/HeroSection";
import ImageNcontent from "@/components/Common/ImageNcontent/ImageNcontent";
import ImgNinfo from "@/components/Common/ImgNinfo/ImgNinfo";
import FAQSection from "@/components/Common/FAQSection/FAQSection";
import SmallCardSectionBrand from "@/components/PagesComponents/BrandsPage/SmallCardSectionBrand/SmallCardSectionBrand";
import SmartCampaign from "@/components/PagesComponents/BrandsPage/SmartCampaign/SmartCampaign";
import TrustedBy from "@/components/PagesComponents/BrandsPage/TrustedBy/TrustedBy";
import SingleReview from "@/components/Common/SingleReview/SingleReview";
import React from "react";
import CTASection from "@/components/Common/CTASection/CTASection";
import { useTranslations } from "next-intl";
import { getLocale } from "next-intl/server";

export async function generateMetadata() {
  const locale = await getLocale();

  if (locale === "fi") {
    return {
      title: "Brändeille | Tee yhteistyötä urheilijoiden kanssa | sbonssy",
      description: "Kasvata näkyvyyttä ja tavoita uusia asiakkaita. Toteuta kampanjoita urheilulähettiläiden kanssa ja maksa vain tuloksista.",
      openGraph: {
        title: "Brändeille | Tee yhteistyötä urheilijoiden kanssa | sbonssy",
        description: "Tutustu sbonssyyn – suoritusperusteiseen markkinointialustaan, jossa brändit ja urheilulähettiläät tekevät yhteistyötä tavoittaakseen uusia asiakkaita aidosti. Käynnistä kampanjoita hetkessä, seuraa tuloksia reaaliajassa ja maksa vain toteutuneista tuloksista.",
      },
    };
  }

  return {
    title: "For Brands | Partner with Athletes & Boost Results | sbonssy",
    description: "Drive real results through authentic sport partnerships. Connect with ambassadors, reach engaged fans, and only pay when campaigns deliver.",
    openGraph: {
      title: "For Brands | Partner with Athletes & Boost Results | sbonssy",
      description: "Discover sbonssy — the performance-based platform where brands collaborate with athletes and ambassadors to reach new audiences authentically. Launch campaigns in minutes, track results in real time, and pay only for success.",
    },
  };
}

export default function page() {
  const t = useTranslations("Brands");
  const tt = useTranslations("Faqs");
  const brandheroData = {
    img: "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103790/sbonssy_feb26_webhero_4_xaos1j.webp",
    subTitle: t("heroData.subTitle"),
    title: t("heroData.title"),
    content: t("heroData.content"),
    height: "525px",
    maxWidthContent: "768px",
    button1: t("heroData.button"),
    button2: t("heroData.button2"),
    button1Route: "/authentication?role=brand",
    button2Route: "/marketplace",
  };
  const checkBoxData = [
    {
      title: t("checkData.one.title"),
      description: t("checkData.one.desc"),
      icon: "/icons/cube.svg",
    },
    {
      title: t("checkData.two.title"),
      description: t("checkData.two.desc"),
      icon: "/icons/cube.svg",
    },
    {
      title: t("checkData.three.title"),
      description: t("checkData.three.desc"),
      icon: "/icons/cube.svg",
    },
    {
      title: t("checkData.four.title"),
      description: t("checkData.four.desc"),
      icon: "/icons/cube.svg",
    },
  ];

  const sideData = {
    checkboxHeading: t("sideData.connect"),
    checkboxSubHeading: t("sideData.how"),
    checkboxBtn1: t("sideData.btn1"),
    checkboxBtn2: t("sideData.btn2"),
    checkboxBtn1Route: "/help-center/brand",
    checkboxBtn2Route: "/authentication?role=brand",
  };
  const measureData = {
    img: "https://res.cloudinary.com/dz2506ydg/image/upload/v1769762189/affiliateroundW_uqeqii.png",
    subTitle: t("measureData.subtitle"),
    title: t("measureData.title"),
    content: t("measureData.content"),
    button1: t("measureData.button1"),
    button2: t("measureData.button2"),
    btnRoute: "/help-center/brand",
  };

  const faqDataBrand = [
    {
      title: tt("faqDataBrand.one.question"),
      content: tt("faqDataBrand.one.answer"),
    },
    {
      title: tt("faqDataBrand.two.question"),
      content: tt("faqDataBrand.two.answer"),
    },
    {
      title: tt("faqDataBrand.three.question"),
      content: tt("faqDataBrand.three.answer"),
    },
    {
      title: tt("faqDataBrand.four.question"),
      content: tt("faqDataBrand.four.answer"),
    },
    {
      title: tt("faqDataBrand.five.question"),
      content: tt("faqDataBrand.five.answer"),
    },
    {
      title: tt("faqDataBrand.six.question"),
      content: tt("faqDataBrand.six.answer"),
    },
  ];

  const SmartCampaignData = [
    {
      title: t("smartCampaignData.one.title"),
      description: t("smartCampaignData.one.desc"),
      linkLabel: t("smartCampaignData.one.label"),
      route: "/help-center/brand",
    },
    {
      title: t("smartCampaignData.two.title"),
      description: t("smartCampaignData.two.desc"),
      linkLabel: t("smartCampaignData.two.label"),
      route: "/authentication?role=brand",
    },
    {
      title: t("smartCampaignData.three.title"),
      description: t("smartCampaignData.three.desc"),
      linkLabel: t("smartCampaignData.three.label"),
      route: "/authentication?role=brand",
    },
  ];

  const singleReviewData = {
    content: t("singleReviewData.content"),
    author: t("singleReviewData.author"),
    position: t("singleReviewData.position"),
    authorImg: "/assets/images/Avatar.png",
    logo: "/assets/logo/Logo.png",
  };
  const ctaData = {
    img: "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103790/sbonssy_feb26_webhero_6_viczxo.webp",
    title: t("ctaData.title"),
    para: t("ctaData.para"),
    route1: "/help-center/brand",
    btn1: t("ctaData.btn1"),
    route2: "/authentication?role=brand",
    btn2: t("ctaData.btn2"),
    imposeBtnClass: "primaryBtn",
  };
  return (
    <>
      <HeroSection data={brandheroData} centerContent="false" />
      <SmallCardSectionBrand
        btn1Route="/authentication?role=brand"
        btn2Route="/contact"
      />
      {/* <TrustedBy /> */}
      <ImageNcontent data={measureData} />
      <CheckBoxSection data={checkBoxData} sideData={sideData} darkMode={true} />
      
      <FAQSection
        data={faqDataBrand}
        content={t("faqData.para")}
        route="/contact"
      />
      <SmartCampaign data={SmartCampaignData} />
      {/* <SingleReview data={singleReviewData} noStars="true" /> */}
      <CTASection data={ctaData} centerAlign="true" />
    </>
  );
}
