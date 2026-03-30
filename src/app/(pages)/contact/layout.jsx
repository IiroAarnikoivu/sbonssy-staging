import { getLocale } from "next-intl/server";

export async function generateMetadata() {
  const locale = await getLocale();

  if (locale === "fi") {
    return {
      title: "Ota yhteyttä | Lähetä yhteydenottopyyntö | sbonssy",
      description: "Onko sinulla kysyttävää tai yhteistyöidea? Ota yhteyttä sbonssyn tiimiin – autamme faneja, brändejä ja urheilulähettiläitä löytämään yhteyden.",
      openGraph: {
        title: "Ota yhteyttä | Lähetä yhteydenottopyyntö | sbonssy",
        description: "Ota yhteyttä sbonssyyn – kuulemme mielellämme sinusta! Olitpa urheilija, brändi, fani tai media, tiimimme auttaa ja vastaa kaikkiin kysymyksiisi. Rakennetaan yhdessä uusia mahdollisuuksia urheilun ympärille.",
      },
    };
  }

  return {
    title: "Contact Us | Get in Touch | sbonssy",
    description: "Have a question or partnership idea? Reach out to the Sbonssy team — we're here to help fans, brands, and ambassadors connect and collaborate.",
    openGraph: {
      title: "Contact Us | Get in Touch | sbonssy",
      description: "Get in touch with sbonssy — we'd love to hear from you! Whether you're an athlete, brand, fan, or media partner, our team is ready to answer your questions and explore collaboration opportunities.",
    },
  };
}

export default function ContactLayout({ children }) {
  return <>{children}</>;
}
