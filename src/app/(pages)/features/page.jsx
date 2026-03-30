import HeroSection from "@/components/Common/HeroSection/HeroSection";
import React from "react";
import featureHeroImg from "@/../public/assets/heroImages/featureHeroImg.jpeg";
import cyclistVerticle from "@/../public/assets/images/cyclistVertical.jpeg";
import TextContainer from "@/components/Common/TextContainer/TextContainer";
import ImageNcontent from "@/components/Common/ImageNcontent/ImageNcontent";
import ImgNinfo from "@/components/Common/ImgNinfo/ImgNinfo";
import swimingGuys from "@/../public/assets/images/swimingGuys.png";
import driftCar from "@/../public/assets/images/driftCar.png";
import { useTranslations, getTranslations } from "next-intl";
import { getLocale } from "next-intl/server";
import AnimatedSection from "@/components/Common/AnimatedSection";

export async function generateMetadata() {
  const locale = await getLocale();

  if (locale === "fi") {
    return {
      title: "Ominaisuudet | Fanit, Urheilijat ja Brändit | sbonssy",
      description:
        "Tutustu miten fanit, urheilijat ja brändit hyötyvät sbonssystä. Kampanjoita, yhteistyötä ja mahdollisuuksia, jotka tukevat urheilua ja yhteisöä.",
      openGraph: {
        title: "Ominaisuudet | Fanit, Urheilijat ja Brändit | sbonssy",
        description:
          "Tutustu sbonssyn ominaisuuksiin – alustaan, joka yhdistää fanit, urheilijat ja brändit kampanjoiden ja kumppanuuksien avulla. Luo vaikuttavampaa urheilua yhteistyöllä.",
      },
    };
  }

  return {
    title: "Features | How Fans, Athletes & Brands Connect | sbonssy",
    description:
      "Explore how sbonssy brings fans, athletes, and brands together through campaigns, promotions, and shared value. Discover features that empower everyone.",
    openGraph: {
      title: "Features | How Fans, Athletes & Brands Connect | sbonssy",
      description:
        "Discover sbonssy's powerful features — a shared platform where fans, athletes, and brands collaborate through campaigns and partnerships. Empower your sports community today.",
    },
  };
}

export default function page() {
  const t = useTranslations("Features");
  const featureHeroSection = {
    img: "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103789/sbonssy_feb26_webhero_5_mwviut.webp",
    title: t("title"),
    content: t("content"),
    styling: "",
    sectionAligment: "center",
    height: "500px",
  };

  const textContentData = {
    title: t("textTitle"),
    para: t("textDesc"),
  };

  const imgNcontent = {
    title: t("imgTitle"),
    content: t("imgDesc"),
    img: "https://res.cloudinary.com/dz2506ydg/image/upload/v1772694618/sbonssy_feb26_11_ttaehv.webp",
    subTitle: t("imgSubHeading"),
    button1: t("imgBtn"),
    buttonTitle: t("imgBtn"),

    btnRoute: `/fans`,
    smallHeading: t("imgSubHeading"),
  };

  const unlockNew = {
    title: t("newTitle"),
    subtitle: t("newSubTitle"),
    description: t("newDesc"),
    features: [
      {
        title: t("newFeaturesTitle1"),
        text: t("newFeaturesText1"),
      },
      {
        title: t("newFeaturesTitle2"),
        text: t("newFeaturesText2"),
      },
    ],
    buttons: [
      {
        label: t("newBtn1"),
        variant: "primary",
        route: "/athletes-teams",
      },
      {
        label: t("newBtn2"),
        variant: "link",
        route: `/authentication?role=sports-ambassador`,
      },
    ],
    image:
      "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103946/sbonssy_feb26_web_1_idkk0k.webp",
  };

  const brandHero = {
    title: t("brandTitle"),
    subtitle: t("brandSubTitle"),
    description: t("brandDesc"),
    features: [
      {
        title: t("brandFeaturesL1"),
        text: t("brandFeaturesT1"),
      },
      {
        title: t("brandFeaturesL2"),
        text: t("brandFeaturesT2"),
      },
    ],
    buttons: [
      {
        label: t("brandBtnL1"),
        variant: "primary",
        route: "/brands",
      },
      {
        label: t("brandBtnL2"),
        variant: "link",
        route: `/authentication?role=brand`,
      },
    ],
    image:
      "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103951/sbonssy_feb26_web_9_pigwgu.webp",
  };
  return (
    <>
      <AnimatedSection effect="blur-in" threshold={0}>
        <HeroSection data={featureHeroSection} />
      </AnimatedSection>
      <AnimatedSection effect="fade-up" delay={100}>
        <TextContainer
          data={textContentData}
          bgClass={"bg-white"}
          contentAlliment="vertical"
        />
      </AnimatedSection>

      <AnimatedSection effect="slide-left" delay={150}>
        <ImgNinfo
          data={unlockNew}
          changeBG="black"
          flexDirections="flex-col-reverse lg:flex-row-reverse"
          purpleButtons={true}
        />
      </AnimatedSection>

      <AnimatedSection effect="slide-right" delay={200}>
        <ImgNinfo
          data={brandHero}
          changeBG="false"
          flexDirections="flex-col-reverse lg:flex-row"
          purpleButtons={true}
        />
      </AnimatedSection>
      <AnimatedSection effect="scale-in" delay={250}>
        <ImageNcontent
          data={imgNcontent}
          changeBG="black"
        />
      </AnimatedSection>
    </>
  );
}
