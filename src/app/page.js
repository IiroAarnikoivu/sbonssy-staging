import CTASection from "@/components/Common/CTASection/CTASection";
import TextContainer from "@/components/Common/TextContainer/TextContainer";
import SupportSportsSection from "@/components/HeroSectionComponents/SupportSportsSection/SupportSportsSection";
import LandingHeroSection from "@/components/PagesComponents/LandingPage/LandingHeroSection/LandingHeroSection";
import ReviewSection from "@/components/PagesComponents/LandingPage/ReviewSection/ReviewSection";
import SupportSports from "@/components/PagesComponents/LandingPage/SupportSports/SupportSports";
import HowItWorksSection from "@/components/PagesComponents/LandingPage/HowItWorksSection/HowItWorksSection";
import { getLocale, getTranslations } from "next-intl/server";
import { loadMessages } from "../i18n";
import { cookies, headers } from "next/headers";
import HeroImg from "../../public/assets/banner/desktop.png";
import HeroMblImg from "../../public/assets/banner/mobile.png";
import BasketballPlayer from "../../public/assets/images/basketballPlayer.png";
import SportAmbassadorsCarousel from "@/components/PagesComponents/LandingPage/SportAmbassadorsCarousel/SportAmbassadorsCarousel";
import ShopSmarter from "@/components/PagesComponents/LandingPage/ShopSmarter/ShopSmarter";
import Carousel3DContainer from "@/components/Carousel3D/Carousel3D";
// import ambassador1 from "/assets/Ambassadors/Näyttökuva 2024-06-19 095638.png";

export async function generateMetadata() {
  const locale = await getLocale();

  if (locale === "fi") {
    return {
      title: "Osta ja tue | Löydä urheilijoita ja vaikuttajia | sbonssy",
      description:
        "Tee jokaisesta ostoksesta merkityksellinen. Tue urheilijoita ostamalla heidän kauttaan – brändit maksavat palkkion ilman lisäkuluja sinulle.",
      openGraph: {
        title: "Osta ja tue | Löydä urheilijoita ja vaikuttajia | sbonssy",
        description:
          "Osta kuten ennenkin, nyt vain merkityksellisemmin. Sbonssy yhdistää fanit, urheilijat ja brändit sekä luo ekosysteemin, jossa jokainen ostos tukee urheilua ja kaikki voittavat.",
      },
    };
  }

  return {
    title: "Shop to Support | Explore Athletes & Creators | sbonssy",
    description:
      "Support athletes and teams every time you shop. Brands give back a share of your purchase — no extra cost, just real impact.",
    openGraph: {
      title: "Shop to Support | Explore Athletes & Creators | sbonssy",
      description:
        "Be part of a movement where shopping fuels dreams. On sbonssy, every purchase supports athletes, teams, and creators you believe in.",
    },
  };
}

export default async function Home() {
  const cookieStore = await cookies();
  const locale = await getLocale();
  const messages = await loadMessages(locale);
  let bannerData = [];

  try {
    const hdrs = await headers();
    const host = hdrs.get("host"); // Keeping this if needed for other things, or remove if unused.
    const proto = hdrs.get("x-forwarded-proto") ?? "http";
    // Use localhost for internal server-side fetches to avoid connection issues with public IPs
    const port = process.env.PORT || 5200;
    const baseUrl = `http://localhost:${port}`;

    const bannerRes = await fetch(
      `${baseUrl}/api/admin/banner?locale=${locale}`,
      {
        headers: {
          Cookie: cookieStore.toString(),
          Host: host, // Pass original host header to API
        },
        cache: "no-store",
        // Important for routes using Next.js fetch cache semantics
        // next: { revalidate: 0 },
      },
    );

    if (bannerRes.ok) {
      const json = await bannerRes.json();
      bannerData = json?.data?.data ?? [];
    } else {
      console.error(
        "/api/admin/banner responded with status:",
        bannerRes.status,
      );
    }
  } catch (err) {
    console.error("Failed to fetch /api/admin/banner:", err);
  }
  // const images = [ambassador1];
  const t = await getTranslations({ locale, messages, namespace: "Home" });

  const HeroTile = [
    {
      // title: t("title"),
      desc: t("description"),
      // btn1: t("ctaBtn1"),
      // btn2: t("ctaBtn2"),
    },

    // {
    //   title: t("title"),
    //   desc: t("description"),
    //   btn1: t("ctaBtn1"),
    //   btn2: t("ctaBtn2"),
    // },

    // {
    //   title: t("title"),
    //   desc: t("description"),
    //   btn1: t("ctaBtn1"),
    //   btn2: t("ctaBtn2"),
    // },
  ];

  const TextContainerContent = {
    title: t("heroTitle"),
    para: t("heroPara"),
  };
  const Carousel = {
    heading: t("carouselHeading"),
  };
  const ImageNcontentContent = {
    img: BasketballPlayer,
    title: t("imageNcontentTitle"),
    content: t("imageNcontentPara"),
  };

  const ctaContent = {
    img: "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103790/sbonssy_feb26_webhero_6_viczxo.webp",
    title: t("ctaTitle"),
    btn1: t("ctaBtn1"),
    route1: "/authentication",
    btn2: t("ctaBtn2"),
    route2: "/help-center",
  };
  const card = {
    cardTitle1: t("cardTitle1"),
    cardLabel1: t("cardLabel1"),
    cardPBtn1: t("cardPBtn1"),
    cardSBtn1: t("cardSBtn1"),
    cardDesc1: t("cardDesc1"),
    cardTitle2: t("cardTitle2"),
    cardLabel2: t("cardLabel2"),
    cardPBtn2: t("cardPBtn2"),
    cardSBtn2: t("cardSBtn2"),
    cardDesc2: t("cardDesc2"),
  };
  const smart = {
    heading: t("headingSmarter"),
    subHeading: t("subHeadingSmarter"),
  };
  const supportTab = {
    // headingSupport: t("headingSupport"),
    subHeadingSupport1: t("subHeadingSupport1"),
    subHeadingSupport2: t("subHeadingSupport2"),
    colHeadSupport: t("colHeadSupport"),
    colSubHeadSupport: t("colSubHeadSupport"),
    colDescSupport: t("colDescSupport"),
    workSupport: t("workSupport"),
    exploreBtn: t("exploreBtn"),
    colHeadBrand: t("colHeadBrand"),
    colSubHeadBrand: t("colSubHeadBrand"),
    learnMoreBtn: t("learnMoreBtn"),
    explorePartnerShip: t("explorePartnerShip"),
    colHeadSport: t("colHeadSport"),
    colSubHeadSport: t("colSubHeadSport"),
    colFeatures: t("colFeatures"),
    colFeaturesHeading: t("colFeaturesHeading"),
    colFeaturesSubHeading: t("colFeaturesSubHeading"),
    colResources: t("colResources"),
    colResourcesHeading: t("colResourcesHeading"),
    colResourcesSubHeading: t("colResourcesSubHeading"),
    readMoreBtn: t("readMoreBtn"),
  };

  const reviews = {
    testmonialName1: t("testmonialName1"),
    testmonialQuote1: t("testmonialQuote1"),
    testmonialAuthor1: t("testmonialAuthor1"),
    testmonialposition1: t("testmonialposition1"),
    testmonialName2: t("testmonialName2"),
    testmonialQuote2: t("testmonialQuote2"),
    testmonialAuthor2: t("testmonialAuthor2"),
    testmonialposition2: t("testmonialposition2"),
    testmonialName3: t("testmonialName3"),
    testmonialQuote3: t("testmonialQuote3"),
    testmonialAuthor3: t("testmonialAuthor3"),
    testmonialposition3: t("testmonialposition3"),
  };
  return (
    <>
      <LandingHeroSection
        bannerData={bannerData}
        data={HeroTile}
        bgImage="https://res.cloudinary.com/dz2506ydg/image/upload/v1773039812/sbonssy_feb26_web_2_kp4tyk.jpg"
        mblImg="https://res.cloudinary.com/dz2506ydg/image/upload/v1773039812/sbonssy_feb26_web_2_kp4tyk.jpg"
      />
      <SupportSportsSection />

      {/* <Carousel3DContainer data={Carousel.heading} images={[]} /> */}

      {/* <SportAmbassadorsCarousel data={Carousel.heading} images={[]} /> */}
      {/* <FindExclusiveOfferCard data={card} /> */}
      <HowItWorksSection />
      <TextContainer
        bgClass={"bg-white"}
        data={TextContainerContent}
        styling="py-[64px] lg:py-[112px] "
      />
      {/* <ImageNcontent
        data={ImageNcontentContent}
        changeBG="reddishPurple"
        textColor="text-white"
      /> */}
      {/* <ShopSmarter data={smart} /> */}
      {/* <ReviewSection data={reviews} /> */}
      <CTASection data={ctaContent} centerAlign="true" />
    </>
  );
}
