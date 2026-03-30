"use client";
import Accordion from "@/components/Common/Accordion/Accordion";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import React from "react";
import { useScrollAnimation, useStaggeredAnimation } from "@/hook/useScrollAnimation";

export default function AccordionSection({ data, content }) {
  const t = useTranslations("AthleteTeam");
  const router = useRouter();

  // Scroll animations
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation({
    threshold: 0.2,
  });

  const { containerRef, isVisible: itemsVisible, getItemStyle } = useStaggeredAnimation(data.length, {
    staggerDelay: 80,
    threshold: 0.1,
  });

  return (
    <div className="lg:my-[64px]">
      <DefaultLayout styling="py-[64px] lg:py-[10px]">
        <div 
          ref={headerRef}
          className={`text-left text-textColor pb-12 lg:pb-0 lg:mb-20 scroll-fade-up ${headerVisible ? 'scroll-animate-visible' : ''}`}
        >
          <h2 className="text-[32px] lg:text-[48px] ">{content.heading}</h2>
          <p className="text-base lg:text-lg tracking-[0%] leading-[150%] font-[400] pt-5 lg:pt-6">
            {content.para}
          </p>
        </div>

        <div ref={containerRef}>
          {/* We pass the visibility and stagger info to Accordion if we want individual item animation, 
              but for now we can wrap it or modify Accordion. 
              Let's wrap individual items instead by modifying Accordion to accept animation props or just wrapping here.
              Since data is mapped inside Accordion, it's better to modify Accordion slightly to support animations 
              OR just animate the whole container once. 
              Let's animate the whole container for simplicity if modifying Accordion is too risky, 
              but staggered reveal is better.
          */}
          <Accordion 
            data={data} 
            animationVisible={itemsVisible} 
            getItemStyle={getItemStyle}
          />
        </div>
      </DefaultLayout>
    </div>
  );
}

