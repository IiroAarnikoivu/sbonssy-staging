"use client";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import SmallCard from "@/components/Common/SmallCard/SmallCard";
import TextContainer from "@/components/Common/TextContainer/TextContainer";
import IconsLibrary from "@/util/IconsLibrary";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { useScrollAnimation } from "@/hook/useScrollAnimation";

export default function SmallCardSection({
  unlockPontentialData,
  smallCardData,
  bg,
  href,
  centerText = false,
  orangeTitle = false,
  centerButtons = false,
  gradientBlend = false,
  singleLineTitle = false,
  singleLineSubtitle = false,
}) {
  const t = useTranslations();
  const router = useRouter();

  // Scroll animations for buttons
  const { ref: footerRef, isVisible: footerVisible } = useScrollAnimation({
    threshold: 0.2,
  });

  // Determine background class or style
  const bgClass = gradientBlend
    ? "-mt-32 md:-mt-48"
    : bg;

  const bgStyle = gradientBlend
    ? { background: "linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.4) 20%, rgba(0, 0, 0, 0.8) 40%, rgb(0, 0, 0) 60%)" }
    : {};

  return (
    <div className={bgClass} style={bgStyle}>
      <TextContainer
        bgClass={bg}
        data={unlockPontentialData}
        contentAlliment={!centerText}
        centerText={centerText}
        orangeTitle={orangeTitle}
        extraTopPadding={gradientBlend}
        singleLineTitle={singleLineTitle}
        singleLineSubtitle={singleLineSubtitle}
      />
      <SmallCard
        data={smallCardData}
        wrapperStyle={bg}
        cardWrapper="grid lg:grid-cols-3 gap-12"
        centerText={centerText}
      />

      <DefaultLayout>
        <div
          ref={footerRef}
          className={`flex gap-4 py-12 lg:py-20 scroll-fade-up scroll-stagger-2 ${centerButtons ? 'justify-center' : ''} ${footerVisible ? 'scroll-animate-visible' : ''}`}
        >
          <Link
            href="/authentication?role=sports-ambassador"
            className="primaryBtnPlain text-white "
          >
            {t("AthleteTeam.smallCard.btn1")}
          </Link>

          <Link
            href={href}
            className={`flex cursor-pointer items-center  gap-2 lg:gap-4 text-base w-fit ${
              bg === "bg-reddishPurple" || bg === "bg-black" ? "text-white" : "text-textColor"
            }`}
            aria-label={`${t("AthleteTeam.smallCard.btn2")} about ${unlockPontentialData?.title}`}
          >
            {t("AthleteTeam.smallCard.btn2")}
            <IconsLibrary
              styling={bg === "bg-reddishPurple" || bg === "bg-black" ? "fill-white" : "fill-black"}
              name="rightChevon"
            />
          </Link>
        </div>
      </DefaultLayout>
    </div>
  );
}

