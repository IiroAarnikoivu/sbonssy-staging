import CheckBoxSection from "@/components/Common/CheckBoxSection/CheckBoxSection";
import CTASection from "@/components/Common/CTASection/CTASection";
import FansHeroSection from "@/components/PagesComponents/FansPage/FansHeroSection/FansHeroSection";
import ImageNcontent from "@/components/Common/ImageNcontent/ImageNcontent";
import AccordionSection from "@/components/PagesComponents/AthletesNTeamsPage/AccordionSection/AccordionSection";
import CarouselSection from "@/components/PagesComponents/AthletesNTeamsPage/CarouselSection/CarouselSection";
import SmallCardSection from "@/components/PagesComponents/AthletesNTeamsPage/SmallCardSection/SmallCardSection";
import TestmonialSection from "@/components/PagesComponents/AthletesNTeamsPage/TestmonialSection/TestmonialSection";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { getLocale } from "next-intl/server";

export async function generateMetadata() {
  const locale = await getLocale();

  if (locale === "fi") {
    return {
      title: "Urheilulähettiläille |Löydä, suosittele ja ansaitse| sbonssy",
      description: "Hyödynnä yhteisöäsi ja ansaitse. Löydä uusia kumppanuuksia, lisää näkyvyyttäsi ja suosittele tuotteita, johon uskot sbonssy-alustalla.",
      openGraph: {
        title: "Urheilulähettiläille |Löydä, suosittele ja ansaitse| sbonssy",
        description: "Tutustu sbonssyyn – urheilulähettiläille suunnattuun alustaan, jossa voit kasvattaa näkyvyyttäsi, löytää uusia kumppanuuksia ja ansaita suosittelemalla tuotteita, joihin itsekin uskot. Luo itsellesi tapa kaupallistaa brändisi.",
      },
    };
  }

  return {
    title: "For Sport Ambassadors | Grow, Earn & Collaborate | sbonssy",
    description: "Turn your influence into income. Connect with fans and brands, share authentic deals, and grow your reach on the sbonssy sports marketplace.",
    openGraph: {
      title: "For Sport Ambassadors | Grow, Earn & Collaborate | sbonssy",
      description: "Discover sbonssy — the platform built for sport ambassadors. Grow your visibility, collaborate with brands that share your values, and earn through the power of your community. Create authentic partnerships and turn your passion into income.",
    },
  };
}

export default function page() {
  const t = useTranslations("AthleteTeam");
  const tt = useTranslations("Faqs");
  const AthletesNTeamsHeroData = {
    img: "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103789/sbonssy_feb26_webhero_1_mrks22.webp",
    subTitle:t("smallCard.unlockData.subtitle"),  
    title: t("hero.title"),
    content: t("hero.content"),

    sectionAligment: "center",
    height: "369px",
    bgPosition: "50% 28%",
    maxWidthContent: "768px",
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
    /*      {
          title: t("checkData.four.title"),
          description: t("checkData.four.desc"),
          icon: "/icons/cube.svg",
        },  */
    {
      title: t("checkData.five.title"),
      description: t("checkData.five.desc"),
      icon: "/icons/cube.svg",
    },
  ];
  const sideData = {
    checkboxHeading: t("sideData.connect"),
    checkboxSubHeading: t("sideData.how"),
    checkboxBtn1: t("sideData.btn1"),
    checkboxBtn2: t("sideData.btn2"),
    checkboxBtn1Route: "/help-center/sports",
    checkboxBtn2Route: "/authentication?role=sports-ambassador",
  };
  const imgNcontentData = {
    title: t("imageData.title"),
    content: t("imageData.content"),
    img: "https://res.cloudinary.com/dz2506ydg/image/upload/v1769410993/dybn0tqdr8m2or5gkkzj.jpg",
  };

  const ctaData = {
    img: "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103790/sbonssy_feb26_webhero_6_viczxo.webp",
    title: t("ctData.title"),
    para: t("ctData.para"),
    btn1: t("ctData.btn1"),
    route1: "/authentication?role=sports-ambassador",
    btn2: t("ctData.btn2"),
    route2: "/help-center/sports",
  };

  const testimonials = [
    {
      quote: t("testimonials.one.quote"),
      name: t("testimonials.one.name"),
      position: t("testimonials.one.position"),
      image: "/assets/images/Avatar.png",
      logo: "/assets/logo/Logo.png",
    },
    {
      quote: t("testimonials.two.quote"),
      name: t("testimonials.two.name"),
      position: t("testimonials.two.position"),
      image: "/assets/images/Avatar.png",
      logo: "/assets/logo/Logo.png",
    },
  ];
  const unlockPontentialData = {
    title: t("smallCard.unlockData.title"),
    para: t("smallCard.unlockData.para"),

  };

  const smallCardData = [
    {
      image:
        "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103951/sbonssy_feb26_web_8_zjmmzt.webp",
      title: t("smallCard.cardData.one.title"),
      para: t("smallCard.cardData.one.para"),
    },
    {
      image:
        "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103950/sbonssy_feb26_web_7_k6wxdh.webp",
      title: t("smallCard.cardData.two.title"),
      para: t("smallCard.cardData.two.para"),
    },
    {
      image:
        "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103947/sbonssy_feb26_web_3_oosfwm.webp",
      title: t("smallCard.cardData.three.title"),
      para: t("smallCard.cardData.three.para"),
    },
  ];
  const faqDataSports = [
    {
      title: tt("faqDataSports.one.question"),
      content: tt("faqDataSports.one.answer"),
    },
    {
      title: tt("faqDataSports.two.question"),
      content: tt("faqDataSports.two.answer"),
    },
    {
      title: tt("faqDataSports.three.question"),
      content: tt("faqDataSports.three.answer"),
    },
    {
      title: tt("faqDataSports.four.question"),
      content: tt("faqDataSports.four.answer"),
    },
    {
      title: tt("faqDataSports.five.question"),
      content: tt("faqDataSports.five.answer"),
    },
    {
      title: tt("faqDataSports.six.question"),
      content: tt("faqDataSports.six.answer"),
    },
  ];
  const content = {
    para: tt("faqDataSports.para"),
    heading: tt("faqDataSports.faq"),
  };
  return (
    <>
      <FansHeroSection data={AthletesNTeamsHeroData} />
      <SmallCardSection
        unlockPontentialData={unlockPontentialData}
        smallCardData={smallCardData}
        bg={"bg-black"}
        href="#checkboxSection"
        centerText={true}
        orangeTitle={true}
        centerButtons={true}
        gradientBlend={true}
        singleLineTitle={true}
        singleLineSubtitle={true}
      />
      {/* <CarouselSection /> */}
      <ImageNcontent
        data={imgNcontentData}
        textColor="text-textColor"
        noPaddingBottom={true}
      />

      <CheckBoxSection
        id="checkboxSection"
        data={checkBoxData}
        sideData={sideData}
        darkMode={true}
      />
      <CTASection data={ctaData} bgName="" centerAlign="true" />
      <AccordionSection data={faqDataSports} content={content} />
      {/* <TestmonialSection data={testimonials} /> */}

    </>
  );
}
