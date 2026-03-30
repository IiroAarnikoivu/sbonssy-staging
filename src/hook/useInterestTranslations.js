import { interestOptions } from "@/lib/helper";
import { useTranslations } from "next-intl";

export default function useTranslatedInterests() {
  const t = useTranslations("Interests");

  return interestOptions.map((group) => ({
    label: t(`groups.${group.label}`) || group.label,
    options: group.options.map((option) => ({
      value: option.value,
      label: t(`options.${option.label}`) || option.label,
    })),
  }));
}
