import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import IconsLibrary from "@/util/IconsLibrary";
import { useTranslations } from "next-intl";
import Image from "next/image";
import React from "react";

export default function TestmonialSection({ data }) {
  const t = useTranslations();
  return (
    <section className="bg-[#EBEDF0]">
      <DefaultLayout styling="py-[64px] lg:py-[112px]">
        <div className="text-left text-textColor pb-12 lg:mb-20">
          <h2 className="text-[32px] lg:text-[48px] ">
            {t("AthleteTeam.testimonials.heading")}
          </h2>
          <p className="text-base lg:text-lg tracking-[0%] leading-[150%] font-[400] pt-5 lg:pt-6">
            {t("AthleteTeam.testimonials.para")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {data.map((item, index) => (
            <div key={index} className="lg:max-w-[768px] mx-auto">
              {/* stars */}
              <div className="flex gap-1">
                <IconsLibrary name="solidStar" />
                <IconsLibrary name="solidStar" />
                <IconsLibrary name="solidStar" />
                <IconsLibrary name="solidStar" />
                <IconsLibrary name="solidStar" />
              </div>

              {/* content */}
              <div className="mt-6 lg:mt-8">
                <h2 className="text-xl lg:text-2xl">"{item.quote}"</h2>

                {/* profile */}
                <div className="flex flex-col items-start my-6 lg:my-8 lg:flex-row lg:items-center lg:gap-5">
                  {/* img box */}
                  <Image
                    src={item.image}
                    width={56}
                    height={56}
                    alt="avatar"
                    className="w-[56px] h-[56px]"
                  />

                  <div>
                    <h6 className="mt-4 lg:mt-0">{item.name}</h6>
                    <p>{item.position}</p>
                  </div>

                  <span className="h-[61px] w-[1px] bg-[#0C0D0626] hidden lg:block" />

                  <Image
                    src={item.logo}
                    width={115}
                    height={20}
                    alt="logo"
                    className="w-[115px] h-[19.29px] mt-4"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </DefaultLayout>
    </section>
  );
}
