"use client";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import TextContainer from "@/components/Common/TextContainer/TextContainer";
import AccordionSection from "@/components/PagesComponents/AthletesNTeamsPage/AccordionSection/AccordionSection";
import { useAuthStore } from "@/store/authStore";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import React from "react";
import AnimatedSection from "@/components/Common/AnimatedSection";

export default function page() {
  const { user } = useAuthStore();

  const router = useRouter();
  const t = useTranslations("Faqs");
  const FrequentlyAskedData = {
    title: t("frequentData.title"),
    para: t("frequentData.para"),
  };

  const faqData = [
    {
      question: t("faqData.one.question"),
      answer: t("faqData.one.answer"),
    },
    {
      question: t("faqData.two.question"),
      answer: t("faqData.two.answer"),
    },
    {
      question: t("faqData.three.question"),
      answer: t("faqData.three.answer"),
    },
    {
      question: t("faqData.four.question"),
      answer: t("faqData.four.answer"),
    },
    {
      question: t("faqData.five.question"),
      answer: t("faqData.five.answer"),
    },
  ];
  const faqDataSports = [
    {
      title: t("faqDataSports.one.question"),
      content: t("faqDataSports.one.answer"),
    },
    {
      title: t("faqDataSports.two.question"),
      content: t("faqDataSports.two.answer"),
    },
    {
      title: t("faqDataSports.three.question"),
      content: t("faqDataSports.three.answer"),
    },
    {
      title: t("faqDataSports.four.question"),
      content: t("faqDataSports.four.answer"),
    },
    {
      title: t("faqDataSports.five.question"),
      content: t("faqDataSports.five.answer"),
    },
    {
      title: t("faqDataSports.six.question"),
      content: t("faqDataSports.six.answer"),
    },
  ];
  const faqDataBrand = [
    {
      question: t("faqDataBrand.one.question"),
      answer: t("faqDataBrand.one.answer"),
    },
    {
      question: t("faqDataBrand.two.question"),
      answer: t("faqDataBrand.two.answer"),
    },
    {
      question: t("faqDataBrand.three.question"),
      answer: t("faqDataBrand.three.answer"),
    },
    {
      question: t("faqDataBrand.four.question"),
      answer: t("faqDataBrand.four.answer"),
    },
    {
      question: t("faqDataBrand.five.question"),
      answer: t("faqDataBrand.five.answer"),
    },
  ];

  const faqDataFan = [
    {
      title: t("faqDataFan.one.question"),
      content: t("faqDataFan.one.answer"),
    },
    {
      title: t("faqDataFan.two.question"),
      content: t("faqDataFan.two.answer"),
    },
    {
      title: t("faqDataFan.three.question"),
      content: t("faqDataFan.three.answer"),
    },
    {
      title: t("faqDataFan.four.question"),
      content: t("faqDataFan.four.answer"),
    },
    {
      title: t("faqDataFan.five.question"),
      content: t("faqDataFan.five.answer"),
    },
    {
      title: t("faqDataFan.six.question"),
      content: t("faqDataFan.six.answer"),
    },
  ];
  return (
    <>
      <AnimatedSection effect="blur-in" threshold={0}>
        <TextContainer
          data={FrequentlyAskedData}
          contentAlliment="true"
          bgClass={"bg-black"}
        />
      </AnimatedSection>
      <AnimatedSection effect="fade-up" delay={100}>
        <DefaultLayout styling="py-[64px] lg:py-[112px]">
          {user === null && (
            <>
              <h2 className="text-[36px] lg:text-[48px] font-normal mb-5 lg:mb-6">
                {t("header.heading")}
              </h2>
              <p className="text-base lg:text-lg">{t("header.para")}</p>

              <div className="mt-12 lg:mt-20">
                {faqData.map((faq, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b last:border-b-0 border-[#0C0D0626] pt-5 pb-10 lg:pb-12 lg:pt-6 nth-[1]:border-t "
                  >
                    <h6 className="text-lg font-bold">{faq.question}</h6>
                    <p className="text-lg font-normal text-[#0C0D06]">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Sport Ammbassador FAQ */}
          {user && user.role === "sports-ambassador" && (
            <div>
              <AccordionSection
                data={faqDataSports}
                content={{
                  para: t("faqDataSports.para"),
                  heading: t("faqDataSports.faq"),
                }}
              />
            </div>
          )}

          {/* FansFAQ */}
          {user && user.role === "fan" && (
            <div>
              <AccordionSection
                data={faqDataFan}
                content={{
                  para: t("faqDataFan.para"),
                  heading: t("faqDataFan.faq"),
                }}
              />
            </div>
          )}

          {/* Brand FAQ */}
          {user && user.role === "brand" && (
            <>
              <div className="flex justify-between mt-12 lg:mt-20 flex-col lg:flex-row gap-12 lg:gap-20">
                <div className="max-w-[500px] w-full">
                  <h2 className="text-[36px] lg:text-[48px] font-normal mb-5 lg:mb-6">
                    {t("header.heading")}
                  </h2>
                  <p className="text-base lg:text-lg">{t("header.para")}</p>
                </div>

                <div className="max-w-[732px] w-full">
                  {faqDataBrand.map((faq, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b last:border-b-0 border-[#0C0D0626] pt-5 pb-10 lg:pb-12 lg:pt-6 nth-[1]:border-t "
                    >
                      <h6 className="text-lg font-bold">{faq.question}</h6>
                      <p className="text-lg font-normal text-[#0C0D06]">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Still have questions?
            {user.role === "sports-ambassador" || user.role === "fan" ? (
              <div className="mt-12 lg:mt-20">
                <h2 className="text-[24px] lg:text-[32px]">
                  {t("body.heading")}
                </h2>
                <p className="text-base lg:text-lg tracking-[0%] leading-[150%] font-[400] pt-4">
                  {t("body.para")}
                </p>
                <button className="primaryBtnPlain mt-6 text-white">
                  {t("body.btn")}
                </button>
              </div>
            ) : null} */}
            </>
          )}
        </DefaultLayout>
      </AnimatedSection>

      <AnimatedSection effect="slide-right" delay={150}>
        <section className="bg-neonGreen">
          <DefaultLayout styling="py-[64px] lg:py-[112px]">
            <h2 className="text-[36px] lg:text-[48px] text-[#0C0D06]">
              {t("footer.heading")}
            </h2>
            <p className="text-[#0C0D06] text-lg mt-5 lg:mt-6">
              {t("footer.para")}
            </p>

            <div className="flex items-center text-base gap-4 mt-6 lg:mt-8">
              <button
                className="primaryBtnPurple"
                onClick={() => router.push("/contact")}
              >
                {t("footer.btn1")}
              </button>
              <button
                className="primaryBtnGreen"
                onClick={() => router.push("/help-center")}
              >
                {t("footer.btn2")}
              </button>
            </div>
          </DefaultLayout>
        </section>
      </AnimatedSection>
    </>
  );
}
