import { getLocale } from "next-intl/server";

export async function generateMetadata() {
  const locale = await getLocale();

  if (locale === "fi") {
    return {
      title: "UKK | Usein Kysytyt Kysymykset | sbonssy",
      description: "Löydä vastaukset yleisimpiin kysymyksiin sbonssysta. Tutustu miten alusta toimii faneille, brändeille ja urheilulähettiläille ja hyödynnä palvelua parhaalla tavalla.",
      openGraph: {
        title: "UKK | Usein Kysytyt Kysymykset | sbonssy",
        description: "Tervetuloa sbonssyn UKK-sivulle – täältä löydät vastaukset yleisimpiin kysymyksiin palvelun käytöstä. Lue, miten alusta toimii faneille, brändeille ja urheilulähettiläille ja opi hyödyntämään sen mahdollisuudet täysimääräisesti.",
      },
    };
  }

  return {
    title: "FAQs | Common Questions | sbonssy",
    description: "Find answers to common questions about sbonssy. Learn how our platform works for fans, brands, and ambassadors — and get the most from your experience.",
    openGraph: {
      title: "FAQs | Common Questions | sbonssy",
      description: "Welcome to the sbonssy FAQ page — your quick guide to how our platform works. Explore answers about campaigns, commissions, and collaborations for fans, brands, and sport ambassadors. Get clarity fast and start making an impact today.",
    },
  };
}

export default function FAQLayout({ children }) {
  return <>{children}</>;
}
