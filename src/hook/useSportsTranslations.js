import { useTranslations } from "next-intl";
import { useMemo } from "react";

/**
 * Custom hook to translate sports names based on current locale
 * @returns {Function} Function to translate a single sport or array of sports
 */
const useSportsTranslations = () => {
  const sportsT = useTranslations("SportsOptions.sports");

  const translateSports = useMemo(() => {
    return (sports) => {
      if (!sports) return null;
      
      // Handle single sport string
      if (typeof sports === 'string') {
        return sportsT(sports) || sports;
      }
      
      // Handle array of sports
      if (Array.isArray(sports)) {
        return sports.map(sport => sportsT(sport) || sport);
      }
      
      return sports;
    };
  }, [sportsT]);

  return translateSports;
};

export default useSportsTranslations;
