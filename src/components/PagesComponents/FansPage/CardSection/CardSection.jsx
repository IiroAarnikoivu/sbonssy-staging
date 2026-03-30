import BigCard from "@/components/Common/BigCard/BigCard";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import React from "react";
import badmintonGirl from "@/../public/assets/images/badmintonGirl.png";
import iceSkatingGuy from "@/../public/assets/images/iceSkatingGuy.png";

export default function CardSection({ data }) {
  const cardData = [
    {
      subtitle: data.cardLabel1,
      title: data.cardTitle1,
      description: data.cardDesc1,
      image:
        "https://res.cloudinary.com/dz2506ydg/image/upload/sbonssy18_op3mux.jpg",
      buttons: [
        {
          label: data.cardPBtn1,
          variant: "primary",
          route: data.cardPBtn1Route,
        },
        {
          label: data.cardSBtn1,
          variant: "link",
          route: data.cardSBtn1Route,
        },
      ],
    },
    {
      subtitle: data.cardLabel2,
      title: data.cardTitle2,
      description: data.cardDesc2,
      image:
        "https://res.cloudinary.com/dz2506ydg/image/upload/sbonssy4_bguxl7.jpg",
      buttons: [
        {
          label: data.cardPBtn2,
          variant: "primary",
          route: data.cardPBtn2Route,
        },
        {
          label: data.cardSBtn2,
          variant: "link",
          route: data.cardSBtn2Route,
        },
      ],
    },
  ];

  return (
    <section className="bg-[#F1F1F1] w-full">
      <DefaultLayout styling="py-[64px] lg:py-[112px]">
        <BigCard
          data={cardData}
          wrapperStyle="grid lg:grid-cols-2 justify-between gap-8"
        />
      </DefaultLayout>
    </section>
  );
}
