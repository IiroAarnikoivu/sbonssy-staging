import { getLocale } from "next-intl/server";

export async function generateMetadata() {
  const locale = await getLocale();

  if (locale === "fi") {
    return {
      title: "Tuki & Ohjeet | Oppaat faneille, brändeille ja lähettiläille | sbonssy",
      description: "Löydä ohjeet ja usein kysytyt kysymykset. Tutustu oppaisiin ja artikkeleihin, joiden avulla hyödynnät sbonssyn ominaisuudet parhaalla tavalla.",
      openGraph: {
        title: "Tuki & Ohjeet | Oppaat faneille, brändeille ja lähettiläille | sbonssy",
        description: "Tervetuloa sbonssyn tukikeskukseen – täältä löydät oppaat, UKK-vastaukset ja vinkit Sbonssyn käyttöön. Olitpa fani, brändi tai urheilulähettiläs, löydät ohjeet jokaiseen vaiheeseen helposti yhdestä paikasta.",
      },
    };
  }

  return {
    title: "Help Center | Guides & FAQs for Fans, Brands & Ambassadors | sbonssy",
    description: "Find answers, guides, and tutorials to help you get the most out of sbonssy. Explore FAQs, step-by-step instructions, and support for every user type.",
    openGraph: {
      title: "Help Center | Guides & FAQs for Fans, Brands & Ambassadors | sbonssy",
      description: "Welcome to sbonssy's Help Center — your go-to resource for tutorials, FAQs, and platform tips. Learn how fans, brands, and ambassadors can make the most of our features with easy step-by-step guidance.",
    },
  };
}

export default function HelpCenterLayout({ children }) {
  return <>{children}</>;
}
