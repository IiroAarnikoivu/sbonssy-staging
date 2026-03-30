"use client";
import HeroSection from "@/components/Common/HeroSection/HeroSection";
import InsightsComponent from "@/components/Common/InsightsComponent/InsightsComponent";
import FAQSection from "@/components/Common/FAQSection/FAQSection";
import React, { useEffect, useState } from "react";
import CTAwithFormSection from "@/components/Common/CTAwithFormSection/CTAwithFormSection";
import ExploreComponent from "@/components/Common/ExploreComponent/ExploreComponent";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import AnimatedSection from "@/components/Common/AnimatedSection";

export default function pages() {
  const t = useTranslations("Resources");
  const tt = useTranslations("Faqs");
  const { user } = useAuthStore();
  const [blogs, setBlogs] = useState([]);

  const faqData = [
    {
      title: tt("faqData.one.question"),
      content: tt("faqData.one.answer"),
    },
    {
      title: tt("faqData.two.question"),
      content: tt("faqData.two.answer"),
    },
    {
      title: tt("faqData.three.question"),
      content: tt("faqData.three.answer"),
    },
    {
      title: tt("faqData.four.question"),
      content: tt("faqData.four.answer"),
    },
    {
      title: tt("faqData.five.question"),
      content: tt("faqData.five.answer"),
    },
  ];
  const faqDataSports = [
    {
      title: tt("faqDataSports.one.question"),
      content: tt("faqDataSports.one.answer"),
    },
    {
      title: tt("faqDataSports.two.question"),
      content: tt("faqDataSports.two.answer"),
    },
    {
      title: tt("faqDataSports.three.question"),
      content: tt("faqDataSports.three.answer"),
    },
    {
      title: tt("faqDataSports.four.question"),
      content: tt("faqDataSports.four.answer"),
    },
    {
      title: tt("faqDataSports.five.question"),
      content: tt("faqDataSports.five.answer"),
    },
    {
      title: tt("faqDataSports.six.question"),
      content: tt("faqDataSports.six.answer"),
    },
  ];
  const faqDataBrand = [
    {
      title: tt("faqDataBrand.one.question"),
      content: tt("faqDataBrand.one.answer"),
    },
    {
      title: tt("faqDataBrand.two.question"),
      content: tt("faqDataBrand.two.answer"),
    },
    {
      title: tt("faqDataBrand.three.question"),
      content: tt("faqDataBrand.three.answer"),
    },
    {
      title: tt("faqDataBrand.four.question"),
      content: tt("faqDataBrand.four.answer"),
    },
    {
      title: tt("faqDataBrand.five.question"),
      content: tt("faqDataBrand.five.answer"),
    },
  ];
  function stripHtml(html) {
    if (typeof html !== "string") return html || "";
    return html.replace(/<[^>]+>/g, "");
  }
  // Safely truncate plain text to a max length without leaving dangling punctuation
  function truncateText(text, maxLength = 100) {
    if (typeof text !== "string") return "";
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean.length <= maxLength) return clean;
    const sliced = clean.slice(0, maxLength);
    // Avoid ending on partial word/punctuation clutter
    const trimmed = sliced.replace(/[\s.,;:!?-]+$/g, "");
    return trimmed + "…";
  }
  useEffect(() => {
    (async () => {
      const resp = await api.get("/admin/blogs?page=1&limit=3");

      setBlogs(resp.blogs);
    })();
  }, []);

  const faqDataFan = [
    {
      title: tt("faqDataFan.one.question"),
      content: tt("faqDataFan.one.answer"),
    },
    {
      title: tt("faqDataFan.two.question"),
      content: tt("faqDataFan.two.answer"),
    },
    {
      title: tt("faqDataFan.three.question"),
      content: tt("faqDataFan.three.answer"),
    },
    {
      title: tt("faqDataFan.four.question"),
      content: tt("faqDataFan.four.answer"),
    },
    {
      title: tt("faqDataFan.five.question"),
      content: tt("faqDataFan.five.answer"),
    },
    {
      title: tt("faqDataFan.six.question"),
      content: tt("faqDataFan.six.answer"),
    },
  ];
  const heroData = {
    title: t("heroData.title"),
    content: t("heroData.content"),

    img: "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103789/sbonssy_feb26_webhero_3_b5olnj.webp",
    height: "369px",
    maxWidthContent: "768px",
    bgPosition: "50% 20%",
  };
  const headingContentData = {
    subTitle: t("headingContentData.subTitle"),
    title: t("headingContentData.title"),
    para: t("headingContentData.para"),
    textColor: "white",
    btnText: t("headingContentData.btn"),
    bottomBtn: "text-white primaryBtnPlain  ",
    route: "/blog",
  };
  function mapBlogData(blogs, t) {
    if (blogs.length === 0) {
      return [];
    }

    return blogs.map((blog) => ({
      id: blog._id,
      tag: blog.tags?.[0]?.name,
      title: blog.title,
      // Strip HTML first, then truncate to avoid leaking broken tags like "</s"
      description: truncateText(stripHtml(blog.content || ""), 100),
      author: blog.author?.name,
      date: new Date(blog.createdAt).toLocaleDateString(),
      image: blog.image?.url,
      avatar: blog.author?.avatar || "/assets/images/Avatar.png",
      _id: blog._id,
    }));
  }

  const companyNewHeadingData = {
    subTitle: t("companyNewHeadingData.subTitle"),
    title: t("companyNewHeadingData.title"),
    para: t("companyNewHeadingData.para"),
    textColor: "textColor",
    bottomBtn: "text-white primaryBtnPlainPurple",
  };

  const newsletterData = {
    heading: t("newsletterData.heading"),
    description: t("newsletterData.description"),
    placeholder: t("newsletterData.placeholder"),
    buttonText: t("newsletterData.buttonText"),
    disclaimer: t("newsletterData.disclaimer"),
    text: t("newsletterData.text"),
    bgImage: "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103790/sbonssy_feb26_webhero_6_viczxo.webp",
  };

  // const roles = [t("roles.one"), t("roles.two"), t("roles.three")];
  const roles = [
    { role: t("roles.one"), route: "/help-center/fans" },
    { role: t("roles.two"), route: "/help-center/brand" },
    { role: t("roles.three"), route: "/help-center/sports" },
  ];

  const faqConfig = {
    default: faqData,
    brand: faqDataBrand,
    "sports-ambassador": faqDataSports,
    fan: faqDataFan,
  };
  const finalfaqData = faqConfig[user?.role] || faqConfig.default;
  const blogData = mapBlogData(blogs, t);
  return (
    <>
      <AnimatedSection effect="blur-in" threshold={0}>
        <HeroSection data={heroData} centerContent="false" />
      </AnimatedSection>
        <InsightsComponent
          bgColor="black"
          headingContent={headingContentData}
          cardData={blogData}
        />
      <AnimatedSection effect="slide-left" delay={150}>
        <FAQSection
          content={t("faqData.para")}
          data={finalfaqData}
          route="/contact"
        />
      </AnimatedSection>

      <AnimatedSection effect="fade-up" delay={200}>
        <ExploreComponent
          bgColor="white"
          headingContent={companyNewHeadingData}
          cardData={roles}
        />
      </AnimatedSection>
      <AnimatedSection effect="scale-in" delay={250}>
        <CTAwithFormSection data={newsletterData} />
      </AnimatedSection>
    </>
  );
}
