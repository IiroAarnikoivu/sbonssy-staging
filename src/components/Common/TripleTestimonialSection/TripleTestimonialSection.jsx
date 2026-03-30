import React from "react";
import Image from "next/image";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import IconsLibrary from "@/util/IconsLibrary";
import { useTranslations } from "next-intl";

export default function TripleTestimonialSection({ data, bgColor }) {
  const t = useTranslations();
  return (
    <section className={`bg-${bgColor}`}>
      <DefaultLayout styling="py-[64px] lg:py-[112px]">
        <div className="text-textColor">
          <h2 className="text-[36px] lg:text-[48px]">
            {" "}
            {t("Company.testimonialsData.heading")}
          </h2>
          <p className="text-base lg:text-lg lg:mt-6 mt-5">
            {t("Company.testimonialsData.para")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-12 lg:mt-20">
          {data.map(({ id, name, role, image, text, rating, companyLogo }) => (
            <div key={id} className="">
              <div className="flex gap-1 text-xl text-black mt-12 lg:mt-0">
                {Array.from({ length: rating }).map((_, i) => (
                  <span key={i}>
                    <IconsLibrary name="solidStar" />
                  </span>
                ))}
              </div>
              <p className="text-lg mt-6 lg:mt-8">“{text}”</p>

              <div className="flex items-start flex-col gap-4 mt-6 lg:mt-8">
                <Image
                  src={image}
                  alt={name}
                  width={40}
                  height={40}
                  className="rounded-full w-14 h-14 bg-gray-300"
                />
                <div>
                  <p className="font-semibold">{name}</p>
                  <p className="text-sm">{role}</p>
                </div>
              </div>

              <div className="mt-[30px]">
                <Image
                  src={companyLogo}
                  alt="Company logo"
                  width={90}
                  height={24}
                  className="mt-6"
                />
              </div>
            </div>
          ))}
        </div>
      </DefaultLayout>
    </section>
  );
}

const testimonials = [
  {
    id: 1,
    name: "Alex Johnson",
    role: "CEO, Sports Inc.",
    image: "/assets/images/Avatar.png", // replace with actual path
    text: "Sbonssy has revolutionized athlete-brand partnerships!",
    rating: 5,
    companyLogo: "/assets/logo/Logo.png", // replace with actual path
  },
  {
    id: 2,
    name: "Jamie Lee",
    role: "Marketing Director, Brand Co.",
    image: "/assets/images/Avatar.png",
    text: "A game-changer for sports marketing strategies!",
    rating: 5,
    companyLogo: "/assets/logo/Logo.png",
  },
  {
    id: 3,
    name: "Chris Smith",
    role: "Founder, Fan Hub",
    image: "/assets/images/Avatar.png",
    text: "The best way to engage with our audience!",
    rating: 5,
    companyLogo: "/assets/logo/Logo.png",
  },
];
