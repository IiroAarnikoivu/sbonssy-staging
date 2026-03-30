"use client";
import IconsLibrary from "@/util/IconsLibrary";
import { useRouter } from "next/navigation";

export default function FansCheckBoxSection({ data, sideData, id }) {
  const router = useRouter();
  return (
    <section
      id={id}
      className="w-full flex flex-col items-start px-8 md:px-16 py-14 md:py-28 gap-20 bg-white"
    >
      {/* Content Container */}
      <div className="w-full max-w-[1312px] mx-auto flex flex-col lg:flex-row items-start gap-12 lg:gap-20">
        {/* Left Column - Content */}
        <div className="flex flex-col items-start gap-8 w-full lg:w-[48%] flex-shrink-0">
          {/* Content */}
          <div className="flex flex-col items-start gap-4 w-full">
            {/* Tagline Wrapper */}
            {sideData?.checkboxHeading && (
              <div className="flex flex-row items-center">
                <span className="text-[#0C0D06] text-base font-bold leading-[150%]">
                  {sideData?.checkboxHeading}
                </span>
              </div>
            )}

            {/* Heading */}
            <h2 className="text-[#0C0D06] font-normal text-[32px] md:text-[48px] leading-[120%] tracking-[-0.01em] w-full">
              {sideData?.checkboxSubHeading}
            </h2>
          </div>

          {/* Actions */}
          <div className="flex flex-row items-center gap-6 w-fit">
            <button
              className="flex flex-row justify-center items-center px-6 py-2.5 gap-2 bg-[rgba(242,105,21,0.93)] shadow-[0px_1px_2px_rgba(12,13,6,0.05),inset_0px_0px_0px_1px_rgba(12,13,6,0.05),inset_0px_-2px_1px_rgba(12,13,6,0.05)] rounded-full text-white font-normal text-base leading-[150%] hover:bg-[rgba(242,105,21,1)] transition-colors"
              onClick={() => router.push(`${sideData?.checkboxBtn1Route}`)}
            >
              {sideData?.checkboxBtn1}
            </button>

            <button
              className="flex flex-row justify-center items-center gap-2 text-[#0C0D06] font-normal text-base leading-[150%] hover:opacity-70 transition-opacity"
              onClick={() => router.push(`${sideData?.checkboxBtn2Route}`)}
            >
              {sideData?.checkboxBtn2}
              <IconsLibrary styling="w-6 h-6 fill-[#0C0D06]" name="rightChevon" />
            </button>
          </div>
        </div>

        {/* Right Column - Timeline */}
        <div className="flex flex-col items-start gap-4 w-full lg:flex-1">
          {data.map((step, index) => (
            <div
              key={index}
              className="flex flex-row items-start gap-8 md:gap-10 w-full min-h-[164px]"
            >
              {/* Icon Column */}
              <div className="flex flex-col items-center gap-4 w-12 flex-shrink-0">
                {/* Icon */}
                <div className="w-12 h-12 flex-shrink-0">
                  {step.icon ? (
                    <img
                      src={step.icon}
                      alt="icon"
                      className="w-12 h-12"
                    />
                  ) : (
                    <IconsLibrary
                      name="ball"
                      styling="w-12 h-12 fill-[#0C0D06]"
                    />
                  )}
                </div>

                {/* Divider - only show if not last item */}
                {index < data.length - 1 && (
                  <div
                    className="w-0.5 flex-1 bg-[rgba(12,13,6,0.15)]"
                    style={{ minHeight: '100px' }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex flex-col items-start gap-4 flex-1">
                {/* Heading */}
                <h4 className="text-[#0C0D06] font-normal text-xl leading-[140%] tracking-[-0.01em]">
                  {step.title}
                </h4>

                {/* Text */}
                <p className="text-[#0C0D06] font-normal text-base leading-[150%]">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
