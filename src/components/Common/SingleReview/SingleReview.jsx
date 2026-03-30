import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import IconsLibrary from "@/util/IconsLibrary";
import Image from "next/image";
import React from "react";

export default function SingleReview({ bg, data, noStars }) {
  return (
    <>
      <section className={`bg-[${bg}]`}>
        <DefaultLayout styling="py-[64px] lg:py-[112px]">
          <div className="lg:max-w-[768px] mx-auto">
            {/* stars */}
            {noStars ? (
              <Image
                src={data.logo}
                width={120}
                height={50}
                alt="brand logo"
                className="w-[115px] h-[19.29px] mt-4 mx-auto"
              />
            ) : (
              <div className="flex gap-1 justify-center">
                {[...Array(5)].map((_, i) => (
                  <IconsLibrary key={i} name="solidStar" />
                ))}
              </div>
            )}

            {/* content */}
            <div className="mt-6 lg:mt-8">
              <h2 className="text-xl text-center lg:text-2xl">
                "{data.content}"
              </h2>

              {/* profile */}
              <div
                className={`flex  items-center justify-center my-6 lg:my-8 lg:items-center lg:gap-5 ${
                  noStars
                    ? "flex-col text-center items-center"
                    : "flex-col lg:flex-row text-center lg:text-left "
                }`}
              >
                {/* image */}
                <Image
                  src={data.authorImg}
                  width={56}
                  height={56}
                  alt={data.author}
                  className="w-[56px] h-[56px] mb-0"
                />

                {/* name + title */}
                <div>
                  <h6 className="mt-4 lg:mt-0">{data.author}</h6>
                  <p>{data.position}</p>
                </div>
                {!noStars ? (
                  <>
                    {/* separator */}
                    <span className="h-[61px] w-[1px] bg-[#0C0D0626] hidden lg:block" />

                    {/* logo */}
                    <Image
                      src={data.logo}
                      width={120}
                      height={50}
                      alt="brand logo"
                      className="w-[115px] h-[19.29px] mt-4"
                    />
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </DefaultLayout>
      </section>
    </>
  );
}
