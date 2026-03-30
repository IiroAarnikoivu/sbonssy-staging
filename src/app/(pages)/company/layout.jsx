import { getLocale } from "next-intl/server";

export async function generateMetadata() {
  const locale = await getLocale();

  if (locale === "fi") {
    return {
      title: "Yritys | Yhdistämme fanit, urheilijat ja brändit | sbonssy",
      description: "Tutustu sbonssyn tarinaan ja siihen, miten yhdistämme fanit, urheilijat ja brändit merkityksellisten kumppanuuksien avulla. Urheilu kuuluu kaikille.",
      openGraph: {
        title: "Yritys | Yhdistämme fanit, urheilijat ja brändit | sbonssy",
        description: "Tutustu sbonssyyn — alusta, joka tuo fanit, urheilijat ja brändit yhteen aidon yhteistyön ja vaikuttavien kampanjoiden kautta. Tehtävämme on helpottaa kumppanuuksien syntymistä ja luoda mahdollisuuksia kaikille urheilun parissa.",
      },
    };
  }

  return {
    title: "About Us | Connecting Fans, Athletes & Brands | sbonssy",
    description: "Discover sbonssy's mission to unite fans, athletes, and brands through meaningful partnerships. Learn how we make sports more accessible for everyone.",
    openGraph: {
      title: "About Us | Connecting Fans, Athletes & Brands | sbonssy",
      description: "Learn about sbonssy — a platform built to bring fans, sport ambassadors, and brands together through authentic partnerships and impactful promotions. Our mission is to make supporting sports easier, fairer, and more rewarding for everyone.",
    },
  };
}

export default function CompanyLayout({ children }) {
  return <>{children}</>;
}
