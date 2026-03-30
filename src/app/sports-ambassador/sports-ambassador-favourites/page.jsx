"use client";

import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import React from "react";
import discoverImg from "../../../../public/assets/images/discover.png";
import Image from "next/image";

const SportsAmbassadorFavourites = () => {
  const campaigns = [
    {
      id: 1,
      image: "/images/campaign1.jpg",
      title: "Campaign title Lorem Ipsum",
      brand: "Red Bull",
    },
    {
      id: 2,
      image: "/images/campaign2.jpg",
      title: "Campaign title Lorem Ipsum",
      brand: "Red Bull",
    },
    {
      id: 3,
      image: "/images/campaign3.jpg",
      title: "Campaign title Lorem Ipsum",
      brand: "Red Bull",
    },
    {
      id: 4,
      image: "/images/campaign4.jpg",
      title: "Campaign title Lorem Ipsum",
      brand: "Red Bull",
    },
    {
      id: 5,
      image: "/images/campaign1.jpg",
      title: "Campaign title Lorem Ipsum",
      brand: "Red Bull",
    },
    {
      id: 6,
      image: "/images/campaign2.jpg",
      title: "Campaign title Lorem Ipsum",
      brand: "Red Bull",
    },
  ];

  return (
    <div className="">
      {/* Hero Section */}
      <div className="bg-[#390A21] text-white py-16 px-6">
        <div className="max-w-[1312px] py-0 m-auto">
          <h1 className="text-[40px] md:text-[56px] font-normal mb-6 max-w-3xl leading-[50px] md:leading-[70px]">
            Support My Journey — One Campaign at a Time
          </h1>
          <p className="text-base sm:text-lg font-normal max-w-2xl">
            Every campaign here helps me grow, compete, and keep doing what I
            love. Thanks for being part of my journey — your support means
            everything.
          </p>
        </div>
      </div>
      {/* Support Me Section */}
      <DefaultLayout>
        <div className="py-10 max-w-7xl">
          <div className="text-center sm:text-left">
            <a
              href="#"
              className="text-base font-bold text-[#0C0D06] mb-3 sm:mb-4 inline-block"
            >
              &lt; Back to profile
            </a>
          </div>
          <h2 className="text-4xl md:text-5xl font-normal text-center mb-6 text-[#0C0D06]">
            Support me
          </h2>
          <p className="text-center text-base sm:text-[18px] font-normal text-[#0C0D06] mb-12 sm:mb-20">
            Every purchase directly supports my journey and helps me keep doing
            what I love.
          </p>

          {/* Campaign Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-[74px]">
            {campaigns.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden"
              >
                <Image
                  src={discoverImg}
                  alt={item.title}
                  className="w-full h-[280px] md:h-[360px] rounded-2xl object-cover border border-gray-200"
                />
                <div className="mt-4">
                  <h3 className="text-[18px] font-normal text-[#0C0D06] mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-base font-bold text-[#0C0D06] mb-2">
                    {item.brand}
                  </p>
                  <button className="w-full bg-[#0C0D060D] text-[#0C0D06] text-sm px-4 py-2 rounded-full">
                    Shop Now
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* View All Button */}
          <div className="flex justify-center mt-12">
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-[26px] py-[10px] rounded-full  transition">
              View all
            </button>
          </div>
        </div>
      </DefaultLayout>
    </div>
  );
};

export default SportsAmbassadorFavourites;
