"use client";
import CTAwithFormSection from "@/components/Common/CTAwithFormSection/CTAwithFormSection";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import ExploreComponent from "@/components/Common/ExploreComponent/ExploreComponent";
import TextContainer from "@/components/Common/TextContainer/TextContainer";
import React from "react";
import { useTranslations } from "use-intl";
import { useScrollAnimation } from "@/hook/useScrollAnimation";

export default function page() {
  const t = useTranslations("Resources");
  const th = useTranslations();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation({
    threshold: 0.1,
  });
  const { ref: exploreRef, isVisible: exploreVisible } = useScrollAnimation({
    threshold: 0.1,
    delay: 100,
  });
  const companyNewHeadingData = {
    subTitle: t("companyNewHeadingData.subTitle"),
    title: t("companyNewHeadingData.title"),
    para: t("companyNewHeadingData.para"),
    textColor: "textColor",
    bottomBtn: "text-white primaryBtnPlainPurple",
  };
  const roles = [
    { role: t("roles.one"), route: "/help-center/fans" },
    { role: t("roles.two"), route: "/help-center/brand" },
    { role: t("roles.three"), route: "/help-center/sports" },
  ];
  const newsletterData = {
    heading: t("newsletterData.heading"),
    description: t("newsletterData.description"),
    placeholder: t("newsletterData.placeholder"),
    buttonText: t("newsletterData.buttonText"),
    disclaimer: t("newsletterData.disclaimer"),
    bgImage: "/assets/images/runningFoot.jpg",
  };
  return (
    <>
      {/* -------- Help Center & How-To Guides ------------- */}
      <section className="bg-black">
        <DefaultLayout styling="py-[64px] lg:py-[112px]">
          <div
            ref={headerRef}
            className={`lg:flex justify-between transition-all duration-700 transform ${
              headerVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            }`}
          >
            <h1 className="font-[400] text-white text-[40px] leading-[120%] tracking-[-1%] lg:text-[56px] max-w-[616px]">
              {th("Help.heading")}
            </h1>
            <p className="max-w-[616px] text-base text-white  text-left tracking-[0%] leading-[150%] mt-5 lg:text-lg">
              {th("Help.para")}
            </p>
          </div>
        </DefaultLayout>
      </section>

      {/* -------------- Explore Our Guides and Tutorials --------------- */}
      <section className="bg-white">
        {/* <DefaultLayout styling="py-[64px] lg:py-[112px]"> */}
        {/* content */}
        <div
          ref={exploreRef}
          className={`transition-all duration-700 transform ${
            exploreVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6"
          }`}
        >
          <ExploreComponent
            bgColor="white"
            headingContent={companyNewHeadingData}
            cardData={roles}
          />
        </div>
        {/* </DefaultLayout> */}
      </section>

      {/* <CTAwithFormSection data={newsletterData} /> */}
    </>
  );
}
