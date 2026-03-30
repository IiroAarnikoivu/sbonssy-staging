import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import IconsLibrary from "@/util/IconsLibrary";
import Image from "next/image";
import React from "react";

export default function NewsHeroSection() {
  return (
    <section className="bg-reddishPurple">
      {/* content */}
      <DefaultLayout styling="py-[64px] lg:py-[112px]">
        <div className="max-w-[768px] mx-auto text-white">
          <div className="flex items-center gap-2">
            <p>News</p>
            <IconsLibrary name="followPathArrowWhite" />
            <p>Updates</p>
          </div>
          <h2 className="text-[32px] lg:text-[48px] mt-6 mb-8 lg:mb-12">
            Latest Developments in Our Platform
          </h2>
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              <Image
                alt="img"
                src="/assets/images/Avatar.png"
                width={56}
                height={56}
                className="w-14 h-14 rounded-full"
              />

              <div>
                <h6>John Doe</h6>
                <div className="flex gap-2">
                  <p>11 Jan 2023</p> <span>•</span> <p>5 min read</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {socialMediaIcon.map((i, idx) => {
                return (
                  <a
                    key={idx}
                    className="w-8 h-8 rounded-full bg-[#0C0D06] flex justify-center items-center"
                  >
                    <IconsLibrary name={i.name} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* image container Big */}
        <Image
          alt="img"
          src="/assets/images/runningFoot.jpg"
          width={1000}
          height={600}
          className="w-full h-auto object-cover mt-12 lg:mt-20 rounded-2xl max-h-[600px]"
        />
      </DefaultLayout>
    </section>
  );
}

const socialMediaIcon = [
  {
    name: "linkSolidGray",
  },

  {
    name: "linkdinSolidGray",
  },
  {
    name: "XSolidGray",
  },
  {
    name: "facebookSolidGray",
  },
];
