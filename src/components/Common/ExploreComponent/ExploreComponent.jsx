"use client";

import { usePathname, useRouter } from "next/navigation";
import DefaultLayout from "../DefaultLayout.jsx/DefaultLayout";

export default function ExploreComponent({
  cardData,
  headingContent,
  bgColor,
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <section className={`bg-${bgColor} text-${headingContent.textColor}`}>
      <DefaultLayout styling="py-[64px] lg:py-[112px]">
        {/* Heading Content */}
        <div className="lg:max-w-[900px] lg:mx-auto mb-4">
          <h3 className="leading-[120%] text-left tracking-[-1%] font-normal text-[32px] lg:text-[40px]">
            {headingContent.title}
          </h3>

          <p className="text-base text-left tracking-[0%] leading-[150%] mt-5 lg:text-md">
            {headingContent.para}
          </p>
        </div>

        {/* card section */}
        <div className="min-h-[350px] grid mt-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-[32px] lg:gap-10 px-4 sm:px-6 lg:px-8 ">
          {cardData.map((post, i) => (
            <div
              key={i}
              className="cursor-pointer bg-gradient-to-br from-[#f1f1f1] to-[#e0e0e0] hover:from-[#e8e8e8] hover:to-[#d4d4d4] rounded-2xl p-4 sm:p-6 flex items-center justify-center min-h-[120px] sm:min-h-[150px] transition-all duration-300"
              onClick={() => router.push(`${post.route}`)}
            >
              <h2
                className={` text-3xl lg:text-4xl md:text-3xl sm:text-3xl font-bold text-center
                `}
              >
                {post.role}
              </h2>
            </div>
          ))}
        </div>
      </DefaultLayout>
    </section>
  );
}
