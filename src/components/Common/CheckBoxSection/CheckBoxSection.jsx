"use client";
import IconsLibrary from "@/util/IconsLibrary";
import { useRouter } from "next/navigation";
import DefaultLayout from "../DefaultLayout.jsx/DefaultLayout";
import { useScrollAnimation, useStaggeredAnimation } from "@/hook/useScrollAnimation";

export default function CheckBoxSection({ data, sideData, styling, bg, id, darkMode = false, hideCtas = false }) {
  const router = useRouter();

  // Scroll animations
  const { ref: sideRef, isVisible: sideVisible } = useScrollAnimation({
    threshold: 0.2,
  });

  const { containerRef, isVisible: itemsVisible, getItemStyle } = useStaggeredAnimation(data.length, {
    staggerDelay: 100,
    threshold: 0.1,
  });

  // Determine text colors based on dark mode
  const textColor = darkMode ? "text-white" : "text-textColor";
  const descriptionColor = darkMode ? "text-gray-300" : "text-gray-700";
  const iconFill = darkMode ? "fill-white" : "fill-[#0C0D06]";
  const arrowFill = darkMode ? "fill-white" : "fill-black";
  const bgColor = bg || (darkMode ? "bg-black" : "bg-[#EBEDF0]");

  return (
    <section id={id} className={bgColor}>
      <DefaultLayout styling="py-[64px] lg:py-[112px]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row gap-12">
          {/* Left Column */}
          <div
            ref={sideRef}
            className={`lg:w-1/2 scroll-slide-right ${sideVisible ? 'scroll-animate-visible' : ''}`}
          >
            <span className={`text-sm font-bold leading-[150%] block mb-2 lg:mb-4 ${textColor}`}>
              {sideData?.checkboxHeading}
            </span>
            <h2 className={`text-3xl font-bold mb-6 ${textColor}`}>
              {sideData?.checkboxSubHeading}
            </h2>
            {!hideCtas && (
              <div className="flex gap-4 mt-6 lg:mt-8">
                <button
                  className="primaryBtnPlain text-white "
                  onClick={() => router.push(`${sideData?.checkboxBtn1Route}`)}
                >
                  {sideData?.checkboxBtn1}
                </button>

                <button
                  className={`flex cursor-pointer items-center  gap-2 lg:gap-4 text-base w-fit ${textColor}`}
                  onClick={() => router.push(`${sideData?.checkboxBtn2Route}`)}
                >
                  {sideData?.checkboxBtn2}
                  <IconsLibrary styling={arrowFill} name="rightChevon" />
                </button>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div
            ref={containerRef}
            className="lg:w-1/2 space-y-10"
          >
            {data.map((step, index) => (
              <div
                key={index}
                className={`flex gap-4 lg:gap-10 items-start mt-10 mb-0 md:mt-4 lg:mt-0 lg:max-h-auto lg:min-h-[164px] drawALine ${darkMode ? 'drawALine-white' : ''} scroll-fade-up scroll-stagger-${index + 1} ${itemsVisible ? 'scroll-animate-visible' : ''}`}
                style={getItemStyle(index)}
              >
                <IconsLibrary
                  name="ball"
                  styling={`min-w-[36px] min-h-[40px] ${iconFill}`}
                />
                <div>
                  <h4 className={`font-normal text-xl ${textColor}`}>{step.title}</h4>
                  <p className={`mt-3 text-base pb-6 ${descriptionColor}`}>
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DefaultLayout>
    </section>
  );
}

