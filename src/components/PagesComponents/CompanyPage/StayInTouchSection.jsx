"use client";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import IconsLibrary from "@/util/IconsLibrary";
import { useTranslations } from "next-intl";
import React from "react";

export default function StayInTouchSection() {
  const t = useTranslations("Company");
  const contactItems = [
    {
      icon: "emailOutline",
      title: t("contactDetails.one.title"),
      description: t("contactDetails.one.description"),
      value: t("contactDetails.one.value"),
    },
    {
      icon: "phoneOutline",
      title: t("contactDetails.two.title"),
      description: t("contactDetails.two.description"),
      value: t("contactDetails.two.value"),
    },
    {
      icon: "officeOutline",
      title: t("contactDetails.three.title"),
      description: t("contactDetails.three.description"),
      value: t("contactDetails.three.value"),
    },
  ];
  return (
    <section className="bg-bgGraySmoke">
      <DefaultLayout styling="py-[64px] lg:py-[112px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 text-center">
          {contactItems.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center space-y-4">
              <div>
                <IconsLibrary name={item.icon} />
              </div>
              <h3 className="text-[24px] lg:text-[32px]">{item.title}</h3>
              <p className="text-base mt-3 lg:mt-4 mb-5 lg:mb-6">
                {item.description}
              </p>
              <a className="text-base underline leading-[150%]">{item.value}</a>
            </div>
          ))}
        </div>
      </DefaultLayout>
    </section>
  );
}
