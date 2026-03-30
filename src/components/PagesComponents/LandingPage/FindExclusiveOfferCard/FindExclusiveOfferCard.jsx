import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import React from "react";
import Image from "next/image";
import discoverImg from "../../../../../public/assets/images/discover.png";
import supportImg from "../../../../../public/assets/images/support.png";
import IconsLibrary from "@/util/IconsLibrary";

export default function FindExclusiveOfferCard({ data }) {
  const CardData = [
    {
      title: data?.cardTitle1,
      label: data?.cardLabel1,
      description: data?.cardDesc1,
      primaryBtn: data?.cardPBtn1,
      secondaryBtn: data?.cardSBtn1,
      image: discoverImg,
    },
    {
      title: data?.cardTitle2,
      label: data?.cardLabel2,
      description: data?.cardDesc2,
      primaryBtn: data?.cardPBtn2,
      secondaryBtn: data?.cardSBtn2,
      image: supportImg,
    },
  ];
  return (
    <section className="bg-reddishPurple text-white py-[64px] lg:py-[112px]">
      <DefaultLayout>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {CardData.map((card, index) => (
            <section
              key={index}
              className={`flex flex-col ${
                index % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"
              } gap-6 items-center lg:flex-col lg:gap-8`}
            >
              {/* Image Section */}
              <div className="w-full md:w-1/2 rounded-xl overflow-hidden lg:w-full">
                <Image
                  src={card.image}
                  alt={card.label}
                  width={500}
                  height={300}
                  className="w-full object-cover lg:w-[624px] lg:h-[320px]"
                />
              </div>

              {/* Text Section */}
              <div className="w-full md:w-1/2 space-y-3 lg:w-full">
                <h5 className="text-sm font-semibold text-gray-300 mb-3 lg:text-base">
                  {card.label}
                </h5>
                <h3 className="text-[32px] font-[400] tracking-[-1%] mb-3 leading-[120%] lg:text-[40px] lg:mt-4">
                  {card.title}
                </h3>
                <p className="text-base mt-6">{card.description}</p>
                <div className="flex gap-4 mt-3 lg:mt-8">
                  <button className="primaryBtnPlain">{card.primaryBtn}</button>
                  <button className="flex cursor-pointer items-center  gap-2 lg:gap-4 text-base">
                    {card.secondaryBtn}{" "}
                    <IconsLibrary styling="fill-white" name="rightChevon" />
                  </button>
                </div>
              </div>
            </section>
          ))}
        </div>
      </DefaultLayout>
    </section>
  );
}
