import { useTranslations } from "next-intl";
import { useMemo } from "react";

/**
 * Custom hook to translate subroles based on current locale
 * @returns {Function} Function to translate a single subrole or array of subroles
 */
const useSubRoleTranslations = () => {
  const subRoleT = useTranslations("SubRole.roles");

  const translateSubRole = useMemo(() => {
    return (subRole) => {
      if (!subRole) return null;

      // Handle single subrole string
      if (typeof subRole === "string") {
        // Convert to lowercase and handle camelCase conversion for consistency
        const normalizedSubRole = subRole
          .toLowerCase()
          .replace(/([A-Z])/g, "-$1")
          .toLowerCase();
        return subRoleT(normalizedSubRole) || subRoleT(subRole) || subRole;
      }

      // Handle array of subroles
      if (Array.isArray(subRole)) {
        return subRole.map((role) => {
          const normalizedRole = role
            .toLowerCase()
            .replace(/([A-Z])/g, "-$1")
            .toLowerCase();
          return subRoleT(normalizedRole) || subRoleT(role) || role;
        });
      }

      return subRole;
    };
  }, [subRoleT]);

  return translateSubRole;
};

export default useSubRoleTranslations;
