import BigCard from "@/components/Common/BigCard/BigCard";
import CTAwithFormSection from "@/components/Common/CTAwithFormSection/CTAwithFormSection";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import React from "react";
import Image from "next/image";
import IconsLibrary from "@/util/IconsLibrary";
import NewsHeroSection from "@/components/PagesComponents/News/ReviewsContainerSection/NewsHeroSection/NewsHeroSection";
import TripleTestimonialSection from "@/components/Common/TripleTestimonialSection/TripleTestimonialSection";

export default function page() {
  return (
    <>
      <NewsHeroSection />

      <section>
        <DefaultLayout styling="py-[64px] lg:py-[112px]">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-base font-bold">Blog</span>
              <h2 className="text-[36px] lg:text-[48px] mt-3 lg:mt-4 mb-5 lg:mb-6">
                Short heading goes here
              </h2>
              <p className="text-base font-normal tracking-[0%] leading-[150%]">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.{" "}
              </p>
            </div>
            <button className="primaryBtnPlain text-white">View all</button>
          </div>
          {/* card section */}
          <div className="grid mt-12 lg:mt-20 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-8">
            {cardData.map((post) => (
              <div key={post.id} className="rounded-2xl">
                <div className="">
                  <Image
                    src={post.image}
                    alt={post.title}
                    width={300}
                    height={180}
                    className="object-cover w-full h-full rounded-2xl overflow-hidden"
                  />
                </div>
                <span
                  className={`text-sm border-${cardData.textColor} border rounded-full px-3 py-1 block w-fit mt-6`}
                >
                  {post.tag}
                </span>
                <h3 className="mt-2 text-xl lg:text-2xl">{post.title}</h3>
                <p className="text-base mt-2">{post.description}</p>
                <div className="flex items-center gap-2 mt-6">
                  <Image
                    src={post.avatar}
                    alt={post.author}
                    width={48}
                    height={48}
                    className="rounded-full w-12 h-12 overflow-hidden"
                  />
                  <div>
                    <span>{post.author}</span>
                    <div className="flex items-center gap-2 text-sm">
                      <span>{post.date}</span>
                      <span className="mx-2">•</span>
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* news letter start here */}
          <div className="max-w-[768px] mx-auto py-[64px] lg:py-[112px]">
            {/* top heading bar */}
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-0  lg:justify-between lg:items-center text-base">
              <div className="flex gap-2 items-center">
                <p>News</p> <IconsLibrary name="followPathArrow" />
                <p>Press</p>
              </div>

              <div className="flex items-center gap-3">
                {socialMediaIcon.map((i, idx) => {
                  return (
                    <a
                      key={idx}
                      className="block w-8 h-8 rounded-full bg-[#F2F2F2] flex justify-center items-center"
                    >
                      <IconsLibrary name={i.name} />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* content */}
            <div className="mt-8 lg:mt-10">
              <h2 className="py-6 lg:text-[40px]">Introduction</h2>

              <div className="text-base flex-col flex gap-4">
                <p>
                  Mi tincidunt elit, id quisque ligula ac diam, amet. Vel etiam
                  suspendisse morbi eleifend faucibus eget vestibulum felis.
                  Dictum quis montes, sit sit. Tellus aliquam enim urna, etiam.
                  Mauris posuere vulputate arcu amet, vitae nisi, tellus
                  tincidunt. At feugiat sapien varius id.
                </p>

                <p>
                  Eget quis mi enim, leo lacinia pharetra, semper. Eget in
                  volutpat mollis at volutpat lectus velit, sed auctor.
                  Porttitor fames arcu quis fusce augue enim. Quis at habitant
                  diam at. Suscipit tristique risus, at donec. In turpis vel et
                  quam imperdiet. Ipsum molestie aliquet sodales id est ac
                  volutpat.
                </p>
                <div className="my-10 lg:my-12">
                  <Image
                    alt="img"
                    width={600}
                    height={400}
                    src={"/assets/images/footaballTeam.jpg"}
                    className="w-full h-auto object-cover rounded-2xl max-h-[400px] mb-2"
                  />
                  <span className="text-sm">Image caption goes here</span>
                </div>
                <p>
                  Dolor enim eu tortor urna sed duis nulla. Aliquam vestibulum,
                  nulla odio nisl vitae. In aliquet pellentesque aenean hac
                  vestibulum turpis mi bibendum diam. Tempor integer aliquam in
                  vitae malesuada fringilla.
                </p>

                <p>
                  Elit nisi in eleifend sed nisi. Pulvinar at orci, proin
                  imperdiet commodo consectetur convallis risus. Sed condimentum
                  enim dignissim adipiscing faucibus consequat, urna. Viverra
                  purus et erat auctor aliquam. Risus, volutpat vulputate
                  posuere purus sit congue convallis aliquet. Arcu id augue ut
                  feugiat donec porttitor neque. Mauris, neque ultricies eu
                  vestibulum, bibendum quam lorem id. Dolor lacus, eget nunc
                  lectus in tellus, pharetra, porttitor.
                </p>

                {/* quote */}
                <q className="border-l pl-5 lg:pl-[22px] border-[#0C0D0626]">
                  Ipsum sit mattis nulla quam nulla. Gravida id gravida ac enim
                  mauris id. Non pellentesque congue eget consectetur turpis.
                  Sapien, dictum molestie sem tempor. Diam elit, orci, tincidunt
                  aenean tempus.
                </q>
                <p>
                  Tristique odio senectus nam posuere ornare leo metus,
                  ultricies. Blandit duis ultricies vulputate morbi feugiat cras
                  placerat elit. Aliquam tellus lorem sed ac. Montes, sed mattis
                  pellentesque suscipit accumsan. Cursus viverra aenean magna
                  risus elementum faucibus molestie pellentesque. Arcu ultricies
                  sed mauris vestibulum.
                </p>

                <h2>Conclusion</h2>
                <p>
                  Morbi sed imperdiet in ipsum, adipiscing elit dui lectus.
                  Tellus id scelerisque est ultricies ultricies. Duis est sit
                  sed leo nisl, blandit elit sagittis. Quisque tristique
                  consequat quam sed. Nisl at scelerisque amet nulla purus
                  habitasse.
                </p>
                <p>
                  Nunc sed faucibus bibendum feugiat sed interdum. Ipsum egestas
                  condimentum mi massa. In tincidunt pharetra consectetur sed
                  duis facilisis metus. Etiam egestas in nec sed et. Quis
                  lobortis at sit dictum eget nibh tortor commodo cursus.
                </p>

                <p>
                  Odio felis sagittis, morbi feugiat tortor vitae feugiat fusce
                  aliquet. Nam elementum urna nisi aliquet erat dolor enim.
                  Ornare id morbi eget ipsum. Aliquam senectus neque ut id eget
                  consectetur dictum. Donec posuere pharetra odio consequat
                  scelerisque et, nunc tortor.Nulla adipiscing erat a erat.
                  Condimentum lorem posuere gravida enim posuere cursus diam.
                </p>
              </div>
            </div>

            {/* share */}
            <div className="mt-8 lg:mt-12">
              <h3 className="text-base lg:text-lg text-center">
                Spread the word
              </h3>
              <div className="flex items-center gap-3 justify-center mt-6">
                {socialMediaIcon.map((i, idx) => {
                  return (
                    <a
                      key={idx}
                      className="w-8 h-8 rounded-full  bg-[#F2F2F2] flex justify-center items-center"
                    >
                      <IconsLibrary name={i.name} />
                    </a>
                  );
                })}
              </div>

              <div className="border-b border-[#0C0D0626] flex items-center gap-2 overflow-x-auto scrollwidtg mt-8 lg:mt-12 pb-8 lg:pb-12">
                {hasTag.map((i, index) => {
                  return (
                    <p
                      key={index}
                      className="px-3 py-2 rounded-full whitespace-nowrap bg-orange text-white"
                    >
                      {i}
                    </p>
                  );
                })}
              </div>
              {/* author */}
              <div className="mx-auto mt-8 lg:mt-12 text-center block">
                <Image
                  alt="img"
                  width={48}
                  height={48}
                  src={"/assets/images/Avatar.png"}
                  className="w-12 h-12 rounded-full mx-auto"
                />
                <h6>John Doe</h6>
                <p>Marketing Manager, Sbonssy</p>
              </div>
            </div>
          </div>
          {/* news letter end here */}
        </DefaultLayout>
      </section>

      <TripleTestimonialSection data={testimonials} bgColor="neonGreen" />

      <CTAwithFormSection data={newsletterData} />
    </>
  );
}
const cardData = [
  {
    id: 1,
    image: "/assets/images/defaultimg.png", // Replace with actual image path
    title: "Maximize Your Game Day Experience",
    description: "Discover how to enhance your game day with these tips.",
    tag: "Sports",
    textColor: "", // Tailwind color class
    avatar: "/assets/images/Avatar.png", // Replace with actual avatar path
    author: "John Doe",
    date: "Apr 20, 2025",
    readTime: "5 min read",
  },
  {
    id: 2,
    image: "/assets/images/defaultimg.png", // Replace with actual image path
    title: "Building Stronger Brand Partnerships",
    description:
      "Learn how to create impactful partnerships in sports marketing.",
    tag: "Marketing",
    textColor: "", // Tailwind color class
    avatar: "/assets/images/Avatar.png", // Replace with actual avatar path
    author: "John Doe",
    date: "Apr 20, 2025",
    readTime: "5 min read",
  },
  {
    id: 3,
    image: "/assets/images/defaultimg.png", // Replace with actual image path
    title: "The Future of Sports Sponsorship",
    description: "Explore emerging trends in sports sponsorship and marketing.",
    tag: "Insights",
    textColor: "", // Tailwind color class
    avatar: "/assets/images/Avatar.png", // Replace with actual avatar path
    author: "John Doe",
    date: "Apr 20, 2025",
    readTime: "5 min read",
  },
];

const newsletterData = {
  heading: "Stay Updated with Our Newsletter",
  description:
    "Sign up to receive the latest blog updates, promotions, and news from your favorite athletes.",
  placeholder: "Enter your email",
  buttonText: "Sign up",
  disclaimer:
    "By clicking Sign Up you’re confirming that you agree with our Terms and Conditions.",
  bgImage: "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103790/sbonssy_feb26_webhero_6_viczxo.webp",
};

const socialMediaIcon = [
  {
    name: "linkSolidDark",
  },

  {
    name: "linkdinSolidDark",
  },
  {
    name: "XSolidDark",
  },
  {
    name: "facebookSolidDark",
  },
];

const hasTag = [
  "new Features",
  "Partnership Announcements",
  "User Experience",
  "Market Updates",
];

const testimonials = [
  {
    id: 1,
    name: "Alex Johnson",
    role: "CEO, Sports Inc.",
    image: "/assets/images/Avatar.png", // replace with actual path
    text: "Sbonssy has revolutionized athlete-brand partnerships!",
    rating: 5,
    companyLogo: "/assets/logo/Logo.png", // replace with actual path
  },
  {
    id: 2,
    name: "Jamie Lee",
    role: "Marketing Director, Brand Co.",
    image: "/assets/images/Avatar.png",
    text: "A game-changer for sports marketing strategies!",
    rating: 5,
    companyLogo: "/assets/logo/Logo.png",
  },
  {
    id: 3,
    name: "Chris Smith",
    role: "Founder, Fan Hub",
    image: "/assets/images/Avatar.png",
    text: "The best way to engage with our audience!",
    rating: 5,
    companyLogo: "/assets/logo/Logo.png",
  },
];
