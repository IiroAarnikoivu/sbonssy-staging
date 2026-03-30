import React from "react";
import Image from "next/image";
import { Pagination } from "swiper/modules";
import { toCamelCase } from "@/lib/helper";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import DefaultLayout from "./Common/DefaultLayout.jsx/DefaultLayout";

const TeamBrand = ({ data, onBack, pagination, handlePagination }) => {
  const router = useRouter();
  const t = useTranslations("Brand.edit");
  return (
    <div className="min-h-screen bg-[#F1F1F1]">
      {/* <div className="bg-[#390a21] lg:bg-[#1E1E1E]">
        <DefaultLayout styling="py-[64px] lg:py-[150px] ">
          <div className="flex items-center justify-between gap-10 flex-col lg:flex-row">
            <div className="max-w-[806px]">
              <h1 className=" text-white font-[400] text-[40px] leading-[120%] tracking-[-1%] lg:text-[56px] ">
                Meet Our Sport Ambassadors
              </h1>
              <p className="mt-5 lg:mt-6 max-w-[600px] text-white font-[400] text-lg leading-[150%]">
                We’re proud to partner with athletes, teams, and creators who
                share our values. Each of these ambassadors represents the
                spirit of our brand — on and off the field.
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
              {/* {t("all")} */}
              My team
            </h1>
            <p className="text-center mt-5 lg:mt-6 text-lg text-textColor leading-[150%] font-normal">
              Built through shared goals. Backed by real partnerships.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8 pt-10 lg:pt-20">
          {data.map((member, index) => {
            return (
              // lg:max-w-[304px]
              <div key={index} className="w-full">
                <Image
                  src={member.img || "/assets/images/placeholder.jpg"}
                  alt={member.name || "Team Member Image"}
                  width={304}
                  height={304}
                  draggable={false}
                  className="w-full h-[304px] object-cover rounded-2xl"
                  onClick={() =>
                    router.push(
                      `/sports-ambassador-profile/${member.role}/${member.id}`
                    )
                  }
                />
                <div className="p-4">
                  <p className="text-[18px] text-center font-bold leading-6 text-[#0C0D06] mt-4">
                    {member.name}
                  </p>
                  <h2 className="text-[14px] text-center font-normal leading-6 text-[#0C0D06] mt-1 mb-4">
                    {member?.sport}
                  </h2>
                  <button
                    className="w-full bg-[#0C0D060D] text-[#0C0D06] h-10 px-5 text-center rounded-full transition-colors hover:bg-[#0C0D061A]"
                    onClick={() =>
                      router.push(
                        `/sports-ambassador-profile/${member.role}/${member.id}`
                      )
                    }
                  >
                    {t("profile")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

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
export default TeamBrand;
