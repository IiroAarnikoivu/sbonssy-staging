'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from "next/link";
import IconsLibrary from "@/util/IconsLibrary";
import Image from "next/image";
import { useScrollAnimation } from "@/hook/useScrollAnimation";

export default function HowItWorksSection() {
  const t = useTranslations('HowItWorksSection');
  const [activeTab, setActiveTab] = useState('ambassadors');

  // Scroll animations
  const { ref: titleRef, isVisible: titleVisible } = useScrollAnimation({
    threshold: 0.2,
  });
  
  const { ref: tabRef, isVisible: tabVisible } = useScrollAnimation({
    threshold: 0.2,
  });
  
  const { ref: leftCardRef, isVisible: leftCardVisible } = useScrollAnimation({
    threshold: 0.15,
  });
  
  const { ref: rightCardRef, isVisible: rightCardVisible } = useScrollAnimation({
    threshold: 0.15,
  });

  const tabConfig = {
    ambassadors: {
      bgColor: 'bg-orange',
      textColor: 'text-textColor',
      buttonBg: 'bg-reddishPurple',
      buttonText: 'text-white',
      secondaryText: 'text-textColor',
      iconFill: 'fill-current'
    },
    brands: {
      bgColor: 'bg-reddishPurple',
      textColor: 'text-white',
      buttonBg: 'bg-orange',
      buttonText: 'text-white',
      secondaryText: 'text-white',
      iconFill: 'fill-current'
    },
    fans: {
      bgColor: 'bg-neonGreen',
      textColor: 'text-textColor',
      buttonBg: 'bg-reddishPurple',
      buttonText: 'text-white',
      secondaryText: 'text-textColor',
      iconFill: 'fill-current'
    }
  };

  const currentConfig = tabConfig[activeTab];

  return (
    <section className="w-full bg-white">
      <div className="flex flex-col items-center py-[30px] lg:py-[50px] px-4 lg:px-16 gap-[25px]">
        {/* Section Title */}
        <div 
          ref={titleRef}
          className={`flex flex-col items-center gap-4 w-full max-w-[768px] scroll-fade-up ${titleVisible ? 'scroll-animate-visible' : ''}`}
        >
          <div className="flex flex-col items-center gap-6 w-full">
            <h2 className="text-[32px] lg:text-[48px] font-normal leading-[120%] text-center tracking-[-0.01em] text-textColor w-full">
              {t('sectionTitle')}
            </h2>
            <p className="text-base lg:text-lg font-normal leading-[150%] text-center text-textColor w-full">
              {t('subtitle')}
            </p>
          </div>
        </div>

        {/* Tab Bar */}
        <div 
          ref={tabRef}
          className={`flex flex-row items-start p-1 w-full max-w-[867px] bg-[#F1F1F1] rounded-[200px] scroll-fade-up scroll-stagger-2 ${tabVisible ? 'scroll-animate-visible' : ''}`}
        >
          {Object.keys(tabConfig).map((tabKey) => {
            const isActive = activeTab === tabKey;
            let tabBgClass = 'bg-[#F1F1F1]';
            let tabTextClass = 'text-[#525252]';

            if (isActive) {
              if (tabKey === 'ambassadors') {
                tabBgClass = 'bg-[rgba(242,105,21,0.93)]';
                tabTextClass = 'text-white';
              } else if (tabKey === 'brands') {
                tabBgClass = 'bg-reddishPurple';
                tabTextClass = 'text-white';
              } else if (tabKey === 'fans') {
                tabBgClass = 'bg-neonGreen';
                tabTextClass = 'text-textColor';
              }
            }

            return (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                className={`flex-1 flex flex-row justify-center items-center px-3 h-10 ${tabBgClass} rounded-[200px] transition-all duration-200`}
              >
                <span className={`text-sm font-normal leading-[150%] ${tabTextClass}`}>
                  {t(`tabs.${tabKey}.label`)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Container - 2 Column Layout */}
        <div className="flex flex-col lg:flex-row items-stretch gap-8 w-full max-w-[1312px]">
          {/* Left Column - Full Color Card */}
          <div 
            ref={leftCardRef}
            className={`flex flex-col w-full lg:w-1/2 scroll-slide-right ${leftCardVisible ? 'scroll-animate-visible' : ''}`}
          >
            <div className={`flex flex-col items-start w-full h-full ${currentConfig.bgColor} rounded-2xl overflow-hidden`}>
              <div className="flex flex-col justify-center items-start p-8 lg:p-12 gap-8 w-full flex-grow">
                {/* Tagline */}
                <div className="flex flex-row items-center">
                  <span className={`text-base font-bold leading-[150%] ${currentConfig.textColor}`}>
                    {t(`tabs.${activeTab}.tagline`)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex flex-col items-start gap-6 w-full">
                  {/* Heading */}
                  <h3 className={`text-[32px] lg:text-[40px] font-normal leading-[120%] tracking-[-0.01em] ${currentConfig.textColor} w-full`}>
                    {t(`tabs.${activeTab}.heading`)}
                  </h3>

                  {/* Text */}
                  <div className={`flex flex-col gap-4 text-base leading-[150%] ${currentConfig.textColor}`}>
                    <div className="flex flex-col gap-2">
                      <div className="font-bold text-lg">{t(`tabs.${activeTab}.steps.step1.title`)}</div>
                      <div className="font-normal">{t(`tabs.${activeTab}.steps.step1.description`)}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="font-bold text-lg">{t(`tabs.${activeTab}.steps.step2.title`)}</div>
                      <div className="font-normal">{t(`tabs.${activeTab}.steps.step2.description`)}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="font-bold text-lg">{t(`tabs.${activeTab}.steps.step3.title`)}</div>
                      <div className="font-normal">{t(`tabs.${activeTab}.steps.step3.description`)}</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row items-center gap-6 w-full">
                  {/* Primary Button */}
                  <Link
                    href={t(`tabs.${activeTab}.ctaRoute`)}
                    className={`flex flex-row justify-center items-center px-6 py-[10px] gap-2 ${currentConfig.buttonBg} ${currentConfig.buttonText} rounded-[100px] text-base font-normal leading-[150%]`}
                  >
                    {t(`tabs.${activeTab}.ctaButton`)}
                  </Link>

                  {/* Secondary Button */}
                  <Link
                    href={t(`tabs.${activeTab}.learnMoreRoute`)}
                    className={`flex flex-row justify-center items-center gap-2 rounded-[100px] text-base font-normal leading-[150%] ${currentConfig.secondaryText}`}
                  >
                    <span>{t(`tabs.${activeTab}.ctaButton2`)}</span>
                    <IconsLibrary
                      name="rightChevon"
                      styling={`w-4 h-4 ${currentConfig.iconFill}`}
                    />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Image + Content Card */}
          <div 
            ref={rightCardRef}
            className={`flex flex-col w-full lg:w-1/2 scroll-slide-left ${rightCardVisible ? 'scroll-animate-visible' : ''}`}
          >
            <div className="flex flex-col items-start w-full h-full rounded-2xl overflow-hidden">
              {/* Placeholder Image */}
              <div className="w-full h-[351px] bg-gray-300 relative">
                {t(`tabs.${activeTab}.image`) && (
                  <Image
                    src={t(`tabs.${activeTab}.image`)}
                    alt={t(`tabs.${activeTab}.heading`)}
                    fill
                    className="object-cover"
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex flex-col justify-center items-start p-8 lg:p-12 gap-8 w-full bg-[#F1F1F1] flex-grow rounded-b-2xl">
                <div className="flex flex-col items-start gap-2 w-full">
                  {/* Heading */}
                  <h4 className="text-[24px] lg:text-[30px] font-bold leading-[120%] tracking-[-0.01em] text-textColor w-full">
                    {t(`tabs.${activeTab}.cardHeading`)}
                  </h4>

                  {/* Text */}
                  <p className="text-base font-normal leading-[150%] text-textColor">
                    {t(`tabs.${activeTab}.description`)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
