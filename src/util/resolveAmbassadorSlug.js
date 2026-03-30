import { toSlug } from "./buildAmbassadorSlug";

// entity should contain subRole and one of the sub-docs with name/teamClubName and supabaseId
export async function resolveAmbassadorSlug(entity) {
  if (!entity) return "";
  const sub = String(entity.subRole || "").toLowerCase();
  let name = "";
  if (sub === "team") {
    name = entity?.team?.name || entity?.team?.teamClubName || "";
  } else if (sub === "ex-athlete" || sub === "exathlete") {
    name = entity?.exAthlete?.name || entity?.exAthlete?.teamClubName || "";
  } else if (sub === "para-athlete" || sub === "paraathlete") {
    name = entity?.paraAthlete?.name || entity?.paraAthlete?.teamClubName || "";
  } else if (sub === "coach") {
    name = entity?.coach?.name || entity?.coach?.teamClubName || "";
  } else if (sub === "influencer") {
    name = entity?.influencer?.name || "";
  } else {
    name = entity?.athlete?.name || entity?.athlete?.teamClubName || "";
  }
  const base = toSlug(name);
  if (!base) return "";

  try {
    const params = new URLSearchParams({ name });
    if (entity?.supabaseId) params.set("supabaseId", entity.supabaseId);
    const res = await fetch(`/api/ambassador/slug/resolve?${params.toString()}`, { cache: "no-store" });
    const json = await res.json().catch(() => null);
    const ordinal = json?.data?.ordinal || 1;
    return ordinal > 1 ? `${base}${ordinal}` : base;
  } catch (_) {
    return base;
  }
}
