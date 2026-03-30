import FansHeroSection from "@/components/PagesComponents/FansPage/FansHeroSection/FansHeroSection";
import React from "react";
import ImgNinfo from "@/components/Common/ImgNinfo/ImgNinfo";
import inairbike from "@/../public/assets/images/inairbike.png";
import CardSection from "@/components/PagesComponents/FansPage/CardSection/CardSection";
import Gallary from "@/components/PagesComponents/FansPage/Gallary/Gallary";
import CheckBoxSection from "@/components/Common/CheckBoxSection/CheckBoxSection";
import SingleReview from "@/components/Common/SingleReview/SingleReview";
import CTASection from "@/components/Common/CTASection/CTASection";
import { useTranslations } from "next-intl";
import FAQSection from "@/components/Common/FAQSection/FAQSection";
import AccordionSection from "@/components/PagesComponents/AthletesNTeamsPage/AccordionSection/AccordionSection";
import { getLocale } from "next-intl/server";

export async function generateMetadata() {
  const locale = await getLocale();

  if (locale === "fi") {
    return {
      title: "Faneille | Tue urheilua ostamalla mitä tarvitset | sbonssy",
      description: "Ole enemmän kuin fani. Tue urheilijoita ja joukkueita ostamalla kuten ennenkin – brändit maksavat osuuden ilman lisäkuluja sinulle.",
      openGraph: {
        title: "Faneille | Tue urheilua ostamalla mitä tarvitset | sbonssy",
        description: "Tutustu sbonssyyn – fanien mahdollistamaan urheilun kauppapaikkaan, jossa jokainen ostos tukee urheilijoita, joukkueita ja vaikuttajia. Jokaisella ostoksella on nyt suurempi merkitys.",
      },
    };
  }

  return {
    title: "For Fans | Support Athletes & Shop With Purpose | sbonssy",
    description: "Be more than a fan — support your favorite athletes and teams with every purchase. Discover athlete-backed brands and make your shopping count.",
    openGraph: {
      title: "For Fans | Support Athletes & Shop With Purpose | sbonssy",
      description: "Discover sbonssy — a fan-powered sports marketplace where every purchase supports athletes, teams, and ambassadors. Shop the brands they love and help them grow — at no extra cost to you.",
    },
  };
}

export default function page() {
  const t = useTranslations("Fans");
  const tt = useTranslations("Faqs");

  const fansHeroData = {
    img: "https://res.cloudinary.com/dz2506ydg/image/upload/v1772549744/sbonssy_feb26_11_lwxfbo.webp",
    title: t("fanTitle"),
    content: t("fanDesc"),
    button1: t("fanBtn1"),
    button2: t("fanBtn2"),
    subTitle: t("subTitle"),
    button1Route: "/marketplace",
    button2Route: "/authentication?role=fan",
    subHeading: t("fanSubHeading"),
    height: "55vh",
    bgPosition: "50% 0",
  };

  const inAirBikeData = {
    titleFontSize: "change",
    title: t("airTitle"),
    description: t("airDesc"),
    image:
      "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103948/sbonssy_feb26_web_4_cj0u43.webp",
  };

  const checkBoxData = [
    {
      title: t("checkboxTitle1"),
      description: t("checkboxDesc1"),
      icon: "/icons/cube.svg",
    },
    {
      title: t("checkboxTitle2"),
      description: t("checkboxDesc2"),
      icon: "/icons/cube.svg",
    },
    {
      title: t("checkboxTitle3"),
      description: t("checkboxDesc3"),
      icon: "/icons/cube.svg",
    },
    {
      title: t("checkboxTitle4"),
      description: t("checkboxDesc4"),
      icon: "/icons/cube.svg",
    },
  ];
  const checkHeaderData = {
    checkboxHeading: t("checkboxHeading"),
    checkboxSubHeading: t("checkboxSubHeading"),
    checkboxBtn1: t("checkboxBtn1"),
    checkboxBtn2: t("checkboxBtn2"),
    checkboxBtn1Route: "/marketplace",
    checkboxBtn2Route: "/authentication?role=fan",
  };

  const fanDealData = {
    titleFontSize: "change",
    title: t("dealTitle"),
    // description: t("dealDesc"),
    description: "",
    features: [
      {
        title: t("dealFeaturedL1"),
        text: t("dealFeaturedT1"),
        button: t("dealFeaturedBtn1"),
        buttonRoute: "/marketplace",
      },
      {
        title: t("dealFeaturedL2"),
        text: t("dealFeaturedT2"),
        button: t("dealFeaturedBtn2"),
        buttonRoute: "/marketplace",
      },
    ],
    image: "/assets/images/gallary/tenishGuy.png",
  };

  const singleReviewData = {
    content: t("reviewContent"),
    author: t("reviewAuthor"),
    position: t("reviewPosition"),
    authorImg: "/assets/images/Avatar.png",
    logo: "/assets/logo/Logo.png",
  };

  const ctaContent = {
    img: "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103790/sbonssy_feb26_webhero_6_viczxo.webp",
    title: t("ctaTitle"),
    btn1: t("ctaBtn1"),
    route1: "/marketplace",
    btn2: t("ctaBtn2"),
    route2: "/authentication?role=fan",
    para: t("ctaPara"),
  };

  const cardData = {
    cardTitle1: t("cardTitle1"),
    cardLabel1: t("cardLabel1"),
    cardPBtn1: t("cardPBtn1"),
    cardSBtn1: t("cardSBtn1"),
    cardPBtn1Route: "/marketplace",
    cardSBtn1Route: "/authentication?role=fan",
    cardDesc1: t("cardDesc1"),
    cardTitle2: t("cardTitle2"),
    cardLabel2: t("cardLabel2"),
    cardPBtn2: t("cardPBtn2"),
    cardSBtn2: t("cardSBtn2"),
    cardDesc2: t("cardDesc2"),
    cardPBtn2Route: "/marketplace",
    cardSBtn2Route: "/authentication?role=fan",
  };
  const gallaryData = {
    galleryHeading: t("galleryHeading"),
    galleryDesc: t("galleryDesc"),
  };
  const faqDataFan = [
    {
      title: tt("faqDataFan.one.question"),
      content: tt("faqDataFan.one.answer"),
    },
    {
      title: tt("faqDataFan.two.question"),
      content: tt("faqDataFan.two.answer"),
    },
    {
      title: tt("faqDataFan.three.question"),
      content: tt("faqDataFan.three.answer"),
    },
    {
      title: tt("faqDataFan.four.question"),
      content: tt("faqDataFan.four.answer"),
    },
    {
      title: tt("faqDataFan.five.question"),
      content: tt("faqDataFan.five.answer"),
    },
    {
      title: tt("faqDataFan.six.question"),
      content: tt("faqDataFan.six.answer"),
    },
  ];
  const content = {
    heading: tt("faqDataFan.faq"),
    para: tt("faqDataFan.para"),
  };
  return (
    <>
      <FansHeroSection data={fansHeroData} />
      <CheckBoxSection data={checkBoxData} sideData={checkHeaderData} darkMode={true} hideCtas={true} />
      <ImgNinfo
        data={inAirBikeData}
        changeBG="[#F1F1F1]"
        // changeBG={"white"}
        flexDirections="flex-col-reverse lg:flex-row-reverse"
        fontSize="!text-[36px] lg:!text-[40px]"
      />
      {/* <CardSection data={cardData} /> */}
      
      {/* <Gallary data={gallaryData} /> */}
      {/* <ImgNinfo
        changeBG="orange"
        data={fanDealData}
        flexDirections="flex-col-reverse lg:flex-row-reverse"
      /> */}
      <AccordionSection data={faqDataFan} content={content} bg="true" />

      { <CTASection data={ctaContent} centerAlign="false" /> }
    </>
  );
}
