export const toSlug = (str = "") => {
  const s = String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  // Keep all unicode letters (\p{L}) and numbers (\p{N}).
  // Replace sequences of non-letter/number with a single hyphen.
  const slug = s
    .replace(/[\p{L}\p{N}]+/gu, (m) => m)
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug;
};

// Accepts an object with shape containing subRole and one of
// athlete, team, influencer, coach, exAthlete, paraAthlete
export function buildAmbassadorSlug(entity) {
  if (!entity) return "";
  // If invitedBy is populated with sub-role data, prefer that as the source
  const hasProfileData = (obj) => {
    if (!obj || typeof obj !== "object") return false;
    const hasSubRoleStr =
      typeof obj.subRole === "string" && obj.subRole.length > 0;
    const hasAnyKey = [
      "athlete",
      "team",
      "influencer",
      "coach",
      "exAthlete",
      "paraAthlete",
    ].some((k) => Object.prototype.hasOwnProperty.call(obj, k) && obj[k]);
    return hasSubRoleStr || hasAnyKey;
  };

  const source = hasProfileData(entity?.invitedBy) ? entity.invitedBy : entity;

  const rawSubRole = String(source.subRole || "");
  const norm = rawSubRole.toLowerCase().replace(/\s+/g, "").replace(/_/g, "-");
  let subKey = "";
  if (!rawSubRole) {
    // Try to infer from available keys
    if (source?.team) subKey = "team";
    else if (source?.exAthlete) subKey = "exAthlete";
    else if (source?.paraAthlete) subKey = "paraAthlete";
    else if (source?.coach) subKey = "coach";
    else if (source?.influencer) subKey = "influencer";
    else if (source?.athlete) subKey = "athlete";
  } else if (norm === "athlete") {
    subKey = "athlete";
  } else if (norm === "team") {
    subKey = "team";
  } else if (norm === "influencer") {
    subKey = "influencer";
  } else if (norm === "coach") {
    subKey = "coach";
  } else if (norm === "ex-athlete" || norm === "exathlete") {
    subKey = "exAthlete";
  } else if (norm === "para-athlete" || norm === "paraathlete") {
    subKey = "paraAthlete";
  } else {
    // Unknown value, try to infer
    if (source?.team) subKey = "team";
    else if (source?.exAthlete) subKey = "exAthlete";
    else if (source?.paraAthlete) subKey = "paraAthlete";
    else if (source?.coach) subKey = "coach";
    else if (source?.influencer) subKey = "influencer";
    else subKey = "athlete"; // default
  }

  let name = "";
  let trackingKey = "";
  if (subKey === "team") {
    name = source?.team?.name || source?.team?.teamClubName || "";
    trackingKey = source?.team?.tracking_key || "";
  } else if (subKey === "exAthlete") {
    // Fallback to teamClubName if name is missing
    name = source?.exAthlete?.name || source?.exAthlete?.teamClubName || "";
    trackingKey = source?.exAthlete?.tracking_key || "";
  } else if (subKey === "paraAthlete") {
    // Fallback to teamClubName if name is missing
    name = source?.paraAthlete?.name || source?.paraAthlete?.teamClubName || "";
    trackingKey = source?.paraAthlete?.tracking_key || "";
  } else if (subKey === "coach") {
    // Fallback to teamClubName if name is missing (coach schema includes it)
    name = source?.coach?.name || source?.coach?.teamClubName || "";
    trackingKey = source?.coach?.tracking_key || "";
  } else if (subKey === "influencer") {
    name = source?.influencer?.name || "";
    trackingKey = source?.influencer?.tracking_key || "";
  } else {
    // default athlete; fallback to teamClubName if name is missing
    name = source?.athlete?.name || source?.athlete?.teamClubName || "";
    trackingKey = source?.athlete?.tracking_key || "";
  }

  const base = toSlug(name);
  if (!base) return "";
  // Previously we appended an 8-hex suffix derived from trackingKey to ensure uniqueness.
  // To shorten URLs, we now always return the base slug only.
  return base;
}
