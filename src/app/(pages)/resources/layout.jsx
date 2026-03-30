import { getLocale } from "next-intl/server";

export async function generateMetadata() {
  const locale = await getLocale();

  if (locale === "fi") {
    return {
      title: "Resurssit | Oppaat, UKK ja vinkit | sbonssy",
      description: "Tutustu oppaisiin, ohjeisiin ja vastauksiin, joiden avulla saat kaiken irti sbonssy-alustasta. Lue uusimmat blogit ja markkinointivinkit.",
      openGraph: {
        title: "Resurssit | Oppaat, UKK ja vinkit | sbonssy",
        description: "Löydä kaikki sbonssyn resurssit yhdestä paikasta – käytännön oppaat, UKK-vastaukset ja ajankohtaiset blogikirjoitukset. Tutustu ohjeisiin faneille, brändeille ja urheilulähettiläille ja opi hyödyntämään alustaamme.",
      },
    };
  }

  return {
    title: "Resources | Guides, FAQs & Insights | sbonssy",
    description: "Explore our latest guides, tutorials, and FAQs to get the most out of sbonssy. Stay updated with blog posts and platform insights for fans, brands, and ambassadors.",
    openGraph: {
      title: "Resources | Guides, FAQs & Insights | sbonssy",
      description: "Discover all sbonssy resources in one place — from how-to guides and FAQs to marketing insights and tutorials. Learn how fans, athletes, and brands can make the most of our platform and stay inspired by the latest updates.",
    },
  };
}

export default function ResourcesLayout({ children }) {
  return <>{children}</>;
}
