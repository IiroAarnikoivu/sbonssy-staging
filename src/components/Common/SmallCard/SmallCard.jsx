"use client";
import SquareImage from "@/components/Common/SquareImage";
import DefaultLayout from "../DefaultLayout.jsx/DefaultLayout";
import { useStaggeredAnimation } from "@/hook/useScrollAnimation";

export default function SmallCard({ data, wrapperStyle, cardWrapper, centerText = false }) {
  const { containerRef, isVisible, getItemStyle } = useStaggeredAnimation(data.length, {
    staggerDelay: 120,
    threshold: 0.1,
  });

  return (
    <div className={wrapperStyle}>
      <DefaultLayout>
        <div ref={containerRef} className={cardWrapper}>
          {data.map((i, index) => {
            return (
              <div
                key={index}
                className={`scroll-fade-up scroll-stagger-${index + 1} ${isVisible ? 'scroll-animate-visible' : ''} ${centerText ? 'flex flex-col items-center' : ''}`}
                style={getItemStyle(index)}
              >
                <SquareImage
                  src={i.image}
                  alt={i.title}
                  rounded
                  className="w-full lg:w-[405px]"
                  imgClassName=""
                  sizes="(max-width: 1024px) 100vw, 405px"
                />

                {/* content section */}
                <div
                  className={`mt-6 lg:mt-8 ${centerText ? 'text-center' : ''} ${
                    wrapperStyle === "bg-reddishPurple" || wrapperStyle === "bg-black"
                      ? "text-white"
                      : "text-textColor"
                  }`}
                >
                  <h2 className="text-2xl leading-[130%] tracking-[-1%] lg:text-[32px]">
                    {i.title}
                  </h2>
                  <p className="text-base leading-[150%] tracking-[0] mt-5">
                    {i.para}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </DefaultLayout>
    </div>
  );
}

