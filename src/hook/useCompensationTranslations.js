import { useTranslations } from "next-intl";
import { useMemo } from "react";

/**
 * Custom hook to translate compensation types based on current locale
 * @returns {Function} Function to translate a single compensation type or array of compensation types
 */
const useCompensationTranslations = () => {
  const compensationT = useTranslations("Compensation.types");

  const translateCompensation = useMemo(() => {
    return (compensationType) => {
      if (!compensationType) return null;

      // Handle single compensation type string
      if (typeof compensationType === "string") {
        return compensationT(compensationType) || compensationType;
      }

      // Handle array of compensation types
      if (Array.isArray(compensationType)) {
        return compensationType.map((type) => compensationT(type) || type);
      }

      return compensationType;
    };
  }, [compensationT]);

  return translateCompensation;
};

export default useCompensationTranslations;
