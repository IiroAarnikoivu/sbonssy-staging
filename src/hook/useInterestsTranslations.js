import { useTranslations } from "next-intl";
import { useMemo } from "react";

/**
 * Custom hook to translate interests based on current locale
 * @returns {Function} Function to translate a single interest or array of interests
 */
const useInterestsTranslations = () => {
  const interestsT = useTranslations("Interests.options");

  const translateInterests = useMemo(() => {
    return (interests) => {
      if (!interests) return null;
      
      // Handle single interest string
      if (typeof interests === 'string') {
        return interestsT(interests) || interests;
      }
      
      // Handle array of interests
      if (Array.isArray(interests)) {
        return interests.map(interest => interestsT(interest) || interest);
      }
      
      return interests;
    };
  }, [interestsT]);

  return translateInterests;
};

export default useInterestsTranslations;
