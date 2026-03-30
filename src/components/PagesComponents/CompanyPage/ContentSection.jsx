"use client";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import IconsLibrary from "@/util/IconsLibrary";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import React from "react";

export default function ContentSection() {
  const t = useTranslations("Company");
  const router = useRouter();
  return (
    <div>
      <section className="bg-reddishPurple">
        <DefaultLayout styling="py-[64px] lg:py-[112px]">
          {/* hero section start here */}
          <div className="max-w-[768px] text-white text-left">
            <h2 className="text-[32px] lg:text-[48px] mt-6 mb-5 lg:mb-6">
              {t("contentSection.heroHeading")}
            </h2>
            <p className="text-base lg:text-lg font-normal leading-[150%]">
              {t("contentSection.heroPara")}
            </p>
          </div>
          {/* hero section end here */}
        </DefaultLayout>
      </section>

      {/* content section start here */}
      {/* <section className="bg-white">
        <DefaultLayout styling={"py-[64px] lg:py-[112px]"}>
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-0 justify-between items-start text-textColor">
            <div className="max-w-[616px]">
              <span className="text-base font-bold">
                {t("contentSection.subHeading")}
              </span>
              <h2 className="text-[36px] lg:text-[48px] mt-3 lg:mt-4">
                {t("contentSection.heading")}
              </h2>
            </div>

            <div className="max-w-[616px]">
              <p className=" lg:text-lg text-base">
                {t("contentSection.para")}
              </p>

              <div className="flex gap-4 mt-6 lg:mt-8">
                <button
                  className="primaryBtnPlain border-0 text-white "
                  onClick={() => router.push("/features")}
                >
                  {t("contentSection.btn1")}
                </button>

                <button
                  className="flex cursor-pointer items-center  gap-2 lg:gap-4 text-base w-fit"
                  onClick={() => router.push("/authentication")}
                >
                  {t("contentSection.btn2")}
                  <IconsLibrary styling="fill-white" name="rightChevon" />
                </button>
              </div>
            </div>
          </div>
        </DefaultLayout>
      </section> */}

      {/* New content section */}
      <section className="bg-white">
        <DefaultLayout styling={"py-[64px] lg:py-[112px]"}>
          {/* Content wrapper - flex row with 80px gap */}
          <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-20 max-w-[1312px]">
            {/* Left Column */}
            <div className="flex flex-col items-start flex-1 w-full lg:w-[616px]">
              {/* Heading */}
              <h2 className="text-[36px] lg:text-[48px] font-normal leading-[120%] tracking-[-0.01em] text-[#0C0D06] self-stretch">
                {t("contentSection.heading")}
              </h2>

              {/* Tagline Wrapper */}
              <div className="flex flex-row items-center mt-3 lg:mt-4">
                <span className="text-base font-bold">
                  {/* {t("contentSection.subHeading")} */}
                </span>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col items-start gap-8 flex-1 w-full lg:w-[616px]">
              {/* Text */}
              <p className="text-base lg:text-lg font-normal leading-[150%] text-[#0C0D06] self-stretch">
                {t("contentSection.para")}
              </p>

              {/* Actions */}
              <div className="flex flex-row items-center gap-6">
                {/* Primary Button */}
                <button
                  className="flex flex-row justify-center items-center py-[10px] px-6 gap-2 bg-[#F26915] text-white rounded-full shadow-[0px_1px_2px_rgba(12,13,6,0.05),inset_0px_0px_0px_1px_rgba(12,13,6,0.05),inset_0px_-2px_1px_rgba(12,13,6,0.05)] text-base font-normal leading-[150%] cursor-pointer"
                  onClick={() => router.push("/features")}
                >
                  {t("contentSection.btn1")}
                </button>

                {/* Secondary Button */}
                <button
                  className="flex flex-row justify-center items-center gap-2 text-base font-normal leading-[150%] text-black cursor-pointer rounded-full"
                  onClick={() => router.push("/authentication")}
                >
                  {t("contentSection.btn2")}
                  <IconsLibrary styling="fill-[#0C0D06]" name="rightChevon" />
                </button>
              </div>
            </div>
          </div>
        </DefaultLayout>
      </section>
      {/* content section end here */}
    </div>
  );
}
