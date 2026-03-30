import React from "react";
import CampaignFavouritesFan from "./CampaignFavouritesFan";
import AmbassadorFavouritesFan from "./AmbassadorFavouritesFan";
import { useTranslations } from "next-intl";
import DefaultLayout from "./Common/DefaultLayout.jsx/DefaultLayout";

const FavouritesFan = ({
  campaigns = [],
  ambassadors = [],
  paginationCmg,
  paginationAmb,
}) => {
  const tt = useTranslations("Favourites");
  return (
    <DefaultLayout>
      <div>
        <div>
          <h1 className="text-xl font-bold m-5">{tt("fvrtBrand")}</h1>

          <div className=""></div>
          {campaigns.length > 0 ? (
            <CampaignFavouritesFan
              campaigns={campaigns}
              paginationCmg={paginationCmg}
            />
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                {/* <HeartIcon className="h-12 w-12 text-gray-400" /> */}
              </div>
              <h3 className="text-xl lg:text-2xl mb-2">{tt("fallback3")}</h3>
            </div>
          )}
        </div>

        <div>
          <h1 className="text-xl font-bold m-5">{tt("fvrtAmbassador")}</h1>
          <div className="">
            {ambassadors.length > 0 ? (
              <AmbassadorFavouritesFan
                ambassadors={ambassadors}
                paginationAmb={paginationAmb}
              />
            ) : (
              <div className="text-center py-12">
                <h3 className="text-xl lg:text-2xl mb-2">{tt("fallback")}</h3>
                <p className="text-base text-[#0C0D06] lg:text-lg ">
                  {tt("fallback2")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default FavouritesFan;
