import { getLocale } from "next-intl/server";
import TermsContent from "@/components/Legal/TermsContent";
import AnimatedSection from "@/components/Common/AnimatedSection";

export async function generateMetadata() {
  const locale = await getLocale();

  if (locale === "fi") {
    return {
      title: "Käyttöehdot | sbonssy",
      description:
        "Tutustu sbonssyn käyttöehtoihin sekä palvelun käyttöä koskeviin sääntöihin ja ohjeisiin.",
    };
  }

  return {
    title: "Terms of Service | sbonssy",
    description:
      "Review sbonssy's terms of service and user guidelines for fans, brands, and ambassadors.",
  };
}

export default function Page() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <AnimatedSection effect="fade-up" threshold={0}>
        <TermsContent />
      </AnimatedSection>
    </main>
  );
}
