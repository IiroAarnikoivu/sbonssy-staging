import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import CTAwithFormSection from "@/components/Common/CTAwithFormSection/CTAwithFormSection";
import Image from "next/image";
import BlogCardWrapper from "@/components/PagesComponents/BlogPage/BlogCardWrapper/BlogCardWrapper";
import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import AnimatedSection from "@/components/Common/AnimatedSection";

export async function generateMetadata() {
  const locale = await getLocale();

  if (locale === "fi") {
    return {
      title: "Blogi | Urheilumarkkinoinnin uutisia ja vinkkejä | sbonssy",
      description:
        "Lue uusimmat näkemykset urheilumarkkinoinnista, sosiaalisesta myynnistä ja urheilulähettiläiden tarinoista. Inspiroidu ja pysy ajan tasalla trendeistä.",
      openGraph: {
        title: "Blogi | Urheilumarkkinoinnin uutisia ja vinkkejä | sbonssy",
        description:
          "Tutustu sbonssy-blogiin – ajankohtaisia tarinoita, näkemyksiä ja vinkkejä urheilun ja markkinoinnin maailmasta. Lue, miten fanit, brändit ja urheilijat rakentavat yhdessä vaikuttavampaa tulevaisuutta urheilun maailmassa.",
      },
    };
  }

  return {
    title: "Blog | Sports Marketing Insights & Athlete Stories | sbonssy",
    description:
      "Explore the latest insights on sports marketing, affiliate trends, and ambassador stories. Stay inspired with tips that help fans, brands, and athletes thrive.",
    openGraph: {
      title: "Blog | Sports Marketing Insights & Athlete Stories | sbonssy",
      description:
        "Discover the sbonssy Blog — your go-to source for trends, stories, and tips from the world of sports marketing and fan-powered commerce. Learn how athletes, brands, and fans are reshaping how sports are supported and experienced.",
    },
  };
}

function stripHtml(html) {
  if (typeof html !== "string") return html || "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/<[^>]*$/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getFirstSentences(text, count = 2) {
  if (!text || typeof text !== "string") return "";

  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";

  // Match sentences ending with . ! ?
  const sentences = clean.match(/[^.!?]+[.!?]+/g);

  if (sentences && sentences.length > 0) {
    return sentences.slice(0, count).join(" ").trim();
  }

  // Fallback: return first 200 chars for blog page
  if (clean.length > 200) {
    return clean.slice(0, 200).replace(/\s+\S*$/, "") + "...";
  }

  return clean;
}

async function fetchBlogData(selectedTag = null, t, locale) {
  try {
    const url = new URL(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/blogs?page=1&limit=10&locale=${locale}`
    );

    if (selectedTag && selectedTag !== t("tabMenu.one")) {
      url.searchParams.append("tag", selectedTag);
    }

    const response = await fetch(url.toString(), { cache: "no-store" });
    const data = await response.json();
    return {
      blogs: Array.isArray(data?.blogs) ? data.blogs : [],
      pagination: data?.pagination ?? {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    };
  } catch (error) {
    console.error("Failed to fetch blog data:", error);
    return {
      blogs: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
}

async function fetchTags(locale) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/tags?page=1&limit=100&locale=${locale}`,
      { cache: "no-store" }
    );
    const data = await response.json();
    return { tags: Array.isArray(data?.tags) ? data.tags : [] };
  } catch (error) {
    console.error("Failed to fetch tags:", error);
    return { tags: [] };
  }
}

function getTabMenuFromTags(tags, t) {
  const defaultTabs = [
    t("tabMenu.one"),
    t("tabMenu.two"),
    t("tabMenu.three"),
    t("tabMenu.four"),
    t("tabMenu.five"),
  ];

  if (!Array.isArray(tags) || tags.length === 0) {
    return defaultTabs;
  }

  // After passing locale to tags API, tag.name is a string already
  const uniqueTags = [
    ...new Set(tags.map((tag) => tag?.name).filter(Boolean)),
  ].slice(0, 5);
  return uniqueTags.length > 0
    ? [t("tabMenu.one"), ...uniqueTags]
    : defaultTabs;
}

function mapBlogData(blogs, t, locale) {
  if (!Array.isArray(blogs) || blogs.length === 0) {
    return <p>{t("fallback")}</p>;
  }

  return blogs.map((blog) => ({
    id: blog._id,
    // blog.tags might contain localized object when coming from Blog.populate; map safely
    tag:
      (blog?.tags?.[0]
        ? typeof blog.tags[0].name === "object"
          ? blog.tags[0].name?.[locale] ||
            blog.tags[0].name?.en ||
            blog.tags[0].name?.fi
          : blog.tags[0].name
        : null) || t("blogOrangeData.one.tag"),
    // title/content are returned as strings when locale is passed to blogs API
    title: blog?.title || t("blogOrangeData.one.title"),
    description: stripHtml(blog?.content) || t("blogOrangeData.one.desc"),
    author: blog?.author?.name || t("blogOrangeData.one.author"),
    date:
      new Date(blog?.createdAt).toLocaleDateString() ||
      t("blogOrangeData.one.date"),
    image: blog?.image?.url || "/assets/images/defaultimg.png",
    avatar: blog?.author?.avatar || "/assets/images/Avatar.png",
    _id: blog?._id,
  }));
}

function isRealTag(selectedTag, tags) {
  if (!selectedTag || !Array.isArray(tags)) return false;
  return tags.some((t) => t?.name === selectedTag);
}

export default async function BlogPage({ searchParams }) {
  const t = await getTranslations("Blog");
  const locale = (await getLocale())?.toLowerCase?.() || "en";

  const params = await searchParams;
  const selectedTag = params?.tag || null;

  // Fetch tags first to validate selectedTag
  const { tags } = await fetchTags(locale);
  const validSelectedTag = isRealTag(selectedTag, tags) ? selectedTag : null;

  // Then fetch blogs with validated tag
  const { blogs } = await fetchBlogData(validSelectedTag, t, locale);

  const newsletterData = {
    heading: t("newsletterData.heading"),
    description: t("newsletterData.description"),
    placeholder: t("newsletterData.placeholder"),
    buttonText: t("newsletterData.btnTxt"),
    disclaimer: t("newsletterData.disclaimer"),
    text: t("newsletterData.text"),
    bgImage: "https://res.cloudinary.com/dz2506ydg/image/upload/v1772103790/sbonssy_feb26_webhero_6_viczxo.webp",
  };

  const tabMenu = getTabMenuFromTags(tags ?? [], t);
  const blogOrangeData = mapBlogData(
    Array.isArray(blogs) ? blogs : [],
    t,
    locale
  );

  // Featured blog gets 3 sentences
  const featuredBlog =
    Array.isArray(blogOrangeData) && blogOrangeData.length > 0
      ? {
          ...blogOrangeData[0],
          description: getFirstSentences(blogOrangeData[0].description, 3),
        }
      : {};

  return (
    <div className="bg-black min-h-screen pt-10 lg:pt-10">
      <DefaultLayout styling="pb-[64px] lg:pb-[112px]">
        {Object.keys(featuredBlog).length > 0 && (
          <AnimatedSection effect="fade-up" delay={100}>
            <div>
              <div className="lg:max-w-[768px] text-left mb-12 lg:mb-20">
                <span className="text-base font-bold leading-[150%] block mb-2 lg:mb-4 text-white">
                  {t("header.heading")}
                </span>
                <h1 className="leading-[120%] tracking-[-1%] font-[400] text-[32px] lg:text-[40px] text-white">
                  {t("header.subHeading")}
                </h1>
                <p className="text-base tracking-[0%] leading-[150%] mt-5 lg:text-lg text-white">
                  {t("header.para")}
                </p>
              </div>

              <div className="flex flex-col lg:flex-row gap-0">
                <Link
                  className="overflow-hidden rounded-t-2xl lg:rounded-t-none lg:rounded-l-2xl lg:basis-2/5 lg:flex-none"
                  href={`/blog/${featuredBlog?._id}`}
                >
                  {featuredBlog?.image ? (
                    <Image
                      src={featuredBlog.image}
                      width={500}
                      height={500}
                      alt={featuredBlog.title || "Featured blog image"}
                      priority
                      className="w-full h-[221px] lg:h-[500px] object-cover"
                    />
                  ) : null}
                </Link>

                <div className="bg-reddishPurple overflow-hidden text-white rounded-b-2xl lg:rounded-b-none lg:rounded-r-2xl p-6 lg:p-12 flex flex-col justify-between items-start lg:basis-3/5">
                  <div>
                    <span className="text-sm">{featuredBlog.tag}</span>
                    <h5 className="text-2xl">{featuredBlog.title}</h5>
                    <p className="text-base">{featuredBlog.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        )}
      </DefaultLayout>

      <AnimatedSection effect="fade-up" delay={150}>
        <BlogCardWrapper
          tabData={tabMenu}
          blogData={Array.isArray(blogOrangeData) ? blogOrangeData : []}
          tags={tags ?? []}
          selectedTag={selectedTag}
        />
      </AnimatedSection>
      <AnimatedSection effect="scale-in" delay={200}>
        <CTAwithFormSection data={newsletterData} />
      </AnimatedSection>
    </div>
  );
}
