import Fan from "@/components/News/Fan";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";

export default async function Page() {
  const cookieStore = await cookies();
  const locale = (await getLocale())?.toLowerCase?.() || "en";

  const response = await fetch(
    `${process.env.NEXTAUTH_URL}/api/admin/help?userType=fan&show=all&locale=${locale}`,
    {
      headers: {
        Cookie: cookieStore.toString(),
      },
      cache: "no-store",
    }
  );

  const payload = await response.json();
  const data = Array.isArray(payload?.data) ? payload.data : [];

  return <Fan data={data} />;
}
