import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import { useTranslations } from "next-intl";
import Image from "next/image";
import React from "react";

export default function TrustedBy() {
  const t = useTranslations();
  return (
    <DefaultLayout styling="py-[64px] lg:py-[112px]">
      <div className="flex flex-col lg:flex-row lg:justify-between">
        <h2 className="max-w-[320px] font-bold text-base lg:text-lg ">
          {t("Brands.trustByHeading")}
        </h2>

        <div className="grid grid-cols-2 gap-8 lg:flex justify-end">
          {logoContaine.map((i, index) => {
            return (
              <Image
                key={index}
                src={i}
                width={134}
                height={22}
                alt="..."
                className="w-[134px] h-auto object-contain"
              />
            );
          })}
        </div>
      </div>
    </DefaultLayout>
  );
}

const logoContaine = [
  "/assets/logo/Logo.png",
  "/assets/logo/relume.png",
  "/assets/logo/Logo.png",
  "/assets/logo/relume.png",
  "/assets/logo/Logo.png",
];
