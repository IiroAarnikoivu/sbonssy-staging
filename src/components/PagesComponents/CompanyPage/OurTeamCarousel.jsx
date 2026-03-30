"use client";
import IconsLibrary from "@/util/IconsLibrary";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function OurTeamCarousel() {
  const t = useTranslations("Company");

  const teamMembers = [
    // Top Left - Tom
    {
      name: "Tom Helenelund",
      role: "COO",
      socials: [
        { name: "emailOutline", url: "tom@sbonssy.com" }, // Email (left)
        {
          name: "linkdinBlack",
          url: "https://fi.linkedin.com/in/tom-helenelund",
        }, // LinkedIn (right)
      ],
    },
    // Top Right - Marina
    {
      name: "Marina Amorim",
      role: "CTO",
      socials: [
        { name: "emailOutline", url: "marina@sbonssy.com" }, // Email (left)
        {
          name: "linkdinBlack",
          url: "https://www.linkedin.com/in/marina-amorim-46a8791a4/",
        }, // LinkedIn (right)
      ],
    },
    // Bottom Left - Matias
    {
      name: "Matias Poikonen",
      role: "Jr Developer",
      socials: [
        { name: "emailOutline", url: "matias@sbonssy.com" }, // Email (left)
        {
          name: "linkdinBlack",
          url: "https://www.linkedin.com/in/matias-poikonen-46098037a/",
        }, // LinkedIn (right)
      ],
    },
    // Bottom Right - Iiro
    {
      name: "Iiro Aarnikoivu",
      role: "CEO",
      socials: [
        { name: "emailOutline", url: "iiro@sbonssy.com" }, // Email (left)
        { name: "linkdinBlack", url: "https://fi.linkedin.com/in/aarnikoivu" }, // LinkedIn (right)
      ],
    },
  ];

  return (
    <>
      {/* First Section - White Background with 2 Columns */}
      <section className="w-full bg-white">
        <div className="flex flex-col items-start py-[64px] lg:py-[112px] px-4 lg:px-16 gap-20">
          {/* Content - 2 Column Layout */}
          <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-20 w-full max-w-[1312px] mx-auto">
            {/* Left Column - Heading */}
            <div className="flex flex-col items-start gap-4 w-full lg:flex-1">
              <h2 className="text-[32px] lg:text-[48px] font-normal leading-[120%] tracking-[-0.01em] text-textColor">
                {t("header.heading")}
              </h2>
            </div>

            {/* Right Column - Text + Actions */}
            <div className="flex flex-col items-start gap-8 w-full lg:flex-1">
              <p className="text-base lg:text-lg font-normal leading-[150%] text-textColor">
                {t("header.para")}
              </p>

              {/* Actions */}
              <div className="flex flex-row items-center gap-6">
                {/* Primary Button */}
                <Link
                  href="/features"
                  className="flex flex-row justify-center items-center px-6 py-[10px] gap-2 bg-orange text-white rounded-[100px] text-base font-normal leading-[150%] shadow-[0px_1px_2px_rgba(12,13,6,0.05),inset_0px_0px_0px_1px_rgba(12,13,6,0.05),inset_0px_-2px_1px_rgba(12,13,6,0.05)]"
                >
                  {t("contentSection.btn1")}
                </Link>

                {/* Secondary Button */}
                <Link
                  href="/authentication"
                  className="flex flex-row justify-center items-center gap-2 text-base font-normal leading-[150%] text-black"
                >
                  <span>{t("contentSection.btn2")}</span>
                  <IconsLibrary name="rightChevon" styling="w-6 h-6" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Second Section - Neon Green Background with Team */}
      <section className="w-full bg-black">
        <div className="flex flex-col items-start py-[64px] xl:py-[112px] px-0 xl:px-16 gap-12 xl:gap-20 relative">
          <div className="w-full max-w-[1312px] mx-auto relative px-4 xl:px-0">
            {/* Main Content Container */}
            <div className="flex flex-col xl:flex-row items-start gap-8 xl:gap-20 relative mb-12 xl:mb-20">
              {/* Left Column - Heading and Description */}
              <div className="flex flex-col items-start gap-6 xl:gap-8 w-full xl:w-[622px] xl:z-10">
                <div className="flex flex-col items-start gap-4 xl:gap-6">
                  <h2 className="text-[32px] xl:text-[48px] font-normal leading-[120%] tracking-[-0.01em] text-white">
                    {t("teamSection.heading")}
                  </h2>
                  <p className="text-white xl:text-lg font-normal leading-[150%] ">
                    {t("teamSection.description")}
                  </p>
                </div>
              </div>

              {/* Right Column - Large Team Image - On mobile/tablet it appears in flow, on desktop it's absolute */}
              <div className="w-full flex justify-center xl:block xl:w-[500px] xl:absolute xl:right-0 xl:top-0 order-first xl:order-none">
                <div className="w-[92%] sm:w-[88%] md:w-[80%] xl:w-full aspect-square xl:aspect-auto xl:h-[500px] relative rounded-[17px] overflow-hidden shadow-lg">
                  <Image
                    src="/assets/images/team_sbonssy1.jpg"
                    alt="Team sbonssy"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Team Member Cards - 2x2 Grid */}
            <div className="grid grid-cols-2 gap-x-4 sm:gap-x-8 md:gap-x-[85px] gap-y-8 xl:gap-y-20 w-full xl:w-[665px]">
              {teamMembers.map((member, index) => (
                <div key={index} className="flex flex-col items-center gap-4">
                  {/* Title */}
                  <div className="flex flex-col items-center gap-0 w-full max-w-[290px]">
                    <h3 className="text-[20px] font-bold leading-[150%] text-orange text-center w-full">
                      {member.name}
                    </h3>
                    <p className="text-lg font-normal leading-[150%] text-white text-center w-full">
                      {member.role}
                    </p>
                  </div>

                  {/* Social Icons */}
                  <div className="flex flex-row text-white items-center gap-[19px]">
                    {member.socials.map((social, idx) => (
                      <Link
                        key={idx}
                        href={
                          social.name === "emailOutline"
                            ? `mailto:${social.url}`
                            : social.url
                        }
                        target="_blank"
                        className="flex items-center justify-center w-6 h-6 text-white"
                      >
                        <IconsLibrary
                          name={social.name}
                          styling={
                            social.name === "emailOutline"
                              ? "w-5 h-4"
                              : "w-6 h-6"
                          }
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
