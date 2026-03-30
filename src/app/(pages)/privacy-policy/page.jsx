import { getLocale } from "next-intl/server";
import PrivacyContent from "@/components/Legal/PrivacyContent";
import AnimatedSection from "@/components/Common/AnimatedSection";

export async function generateMetadata() {
  const locale = await getLocale();

  if (locale === "fi") {
    return {
      title: "Tietosuojakäytäntö | sbonssy",
      description:
        "Lue, miten sbonssy kerää, käyttää ja suojaa henkilötietojasi.",
    };
  }

  return {
    title: "Privacy Policy | sbonssy",
    description:
      "Read sbonssy's privacy practices, including how we collect, use, and protect your data.",
  };
}

export default function PrivacyPolicy() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <AnimatedSection effect="fade-up" threshold={0}>
        <PrivacyContent />
      </AnimatedSection>
    </main>
  );
}
