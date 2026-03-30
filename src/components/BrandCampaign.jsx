import React, { useState } from "react";
import Image from "next/image";
import Pagination from "./Pagination/pagination";
import AmbassadorModal from "./AmbassadorModal";
import { useTranslations } from "next-intl";
import DefaultLayout from "./Common/DefaultLayout.jsx/DefaultLayout";

const BrandCampaign = ({ data, pagination, handlePageChange, onBack }) => {
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const t = useTranslations("Brand.edit");
  const handleSelectAmbassador = (campaign) => {
    setSelectedCampaign(campaign);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCampaign(null);
  };

  return (
    <div className="min-h-screen bg-[#F1F1F1]">
      {/* <div className="bg-[#390a21] lg:bg-[#1E1E1E]">
        <DefaultLayout styling="py-[64px] lg:py-[150px] ">
          <div className="flex items-center justify-between gap-10 flex-col lg:flex-row">
            <div className="max-w-[806px]">
              <h1 className=" text-white font-[400] text-[40px] leading-[120%] tracking-[-1%] lg:text-[56px] ">
                Explore Campaigns Backed by Sport Ambassadors
              </h1>
              <p className="mt-5 lg:mt-6 max-w-[600px] text-white font-[400] text-lg leading-[150%]">
                Discover the campaigns our ambassadors have chosen to promote —
                each one represents a real connection between our brand and the
                world of sport.
              </p>
            </div>

            <div className="hidden lg:block">
              <Image
                src="/assets/images/brand-logo.png"
                width={172}
                height={172}
                alt="brand logo"
                className="w-[172px] h-[172px]"
              />
            </div>
          </div>
        </DefaultLayout>
      </div> */}

      <DefaultLayout styling="py-[64px] lg:pt-[112px] pb-[70px]">
        <div className="">
          <button
            className="text-center lg:text-left shadow-none cursor-pointer border-0 text-base leading-[150%] tracking-normal"
            onClick={onBack}
          >
            <span className="">{`< `}</span>
            {t("back")}
          </button>

          <div className="w-full mt-3 lg:mt-4">
            <h1 className="text-[36px] lg:text-[48px] text-center">
              {/* {t("allc")} */}
              Purchase & Support
            </h1>
            <p className="text-center mt-5 lg:mt-6 text-lg text-textColor leading-[150%] font-normal">
              You’ll start by selecting a campaign, then choose who to support —
              your purchase is completed on the brand’s site, but your impact
              stays with your chosen ambassador.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4  gap-6 lg:gap-8 pt-10 lg:pt-20">
          {data.map((campaign, index) => (
            <div key={index} className="w-full">
              <Image
                src={campaign.img || "/assets/images/placeholder.jpg"}
                alt={campaign.title || "Campaign Image"}
                width={304}
                height={304}
                draggable={false}
                className="w-full h-[304px] object-cover rounded-2xl"
              />
              <div className="p-4">
                <p className="text-[18px] text-center font-bold leading-6 text-[#0C0D06] mt-4">
                  {campaign.title}
                </p>
                <h2 className="text-[14px] text-center font-normal leading-6 text-[#0C0D06] mt-1 mb-4">
                  {campaign.brand}
                </h2>
                <button
                  className="w-full bg-[#0C0D060D] text-[#0C0D06] h-10 px-5 text-center rounded-full transition-colors hover:bg-[#0C0D061A]"
                  onClick={() => handleSelectAmbassador(campaign)}
                >
                  {t("Select")}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Ambassador Modal */}
        <AmbassadorModal
          isOpen={isModalOpen}
          onClose={closeModal}
          ambassadors={selectedCampaign?.ambassadors || []}
          campaignTitle={selectedCampaign?.title || "Campaign"}
        />

        {pagination.totalPages > 1 && (
          <div className="mt-[48px] lg:mt-[47px]">
            <Pagination
              currentPage={pagination.currentPage}
              pageCount={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </DefaultLayout>
    </div>
  );
};

export default BrandCampaign;
