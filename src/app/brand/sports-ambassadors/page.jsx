import { cookies } from "next/headers";
import AllCollaborationBrand from "@/components/AllCollaborationBrand";
import { SocketProvider } from "@/context/SocketContext";
import Sidebar from "@/components/Sidebar";

const SportsAmbassadors = async ({ searchParams }) => {
  const cookieStore = cookies();
  const params = await searchParams;
  const page = params?.page ?? 1;
  const page2 = params?.page2 ?? 1;
  const limit = params?.limit ?? 10;
  // Extract query parameters
  const search = params?.search ?? "";

  // Fetch data from API
  const [ambassadorsRes, requestsRes, collaborationsRes] = await Promise.all([
    fetch(
      `${
        process.env.NEXTAUTH_URL
      }/api/brand/sports-ambassador?search=${encodeURIComponent(
        search
      )}&page=${page}`,
      {
        headers: {
          Cookie: cookieStore.toString(),
        },
        cache: "no-store",
      }
    ),
    fetch(`${process.env.NEXTAUTH_URL}/api/brand/sports-ambassador/requests`, {
      headers: {
        Cookie: cookieStore.toString(),
      },
      cache: "no-store",
    }),
    fetch(
      `${process.env.NEXTAUTH_URL}/api/brand/sports-ambassador/collaborations?page=${page2}`,
      {
        headers: {
          Cookie: cookieStore.toString(),
        },
        cache: "no-store",
      }
    ),
  ]);

  const { data: ambassadors, total: totalAmbassadors } =
    await ambassadorsRes.json();
  const requests = await requestsRes.json();
  const { data: collaborations, total: totalCollaborations } =
    await collaborationsRes.json();

  return (
    <SocketProvider>
      <AllCollaborationBrand
        ambassadors={ambassadors}
        totalAmbassadors={totalAmbassadors}
        initialRequests={requests}
        collaborations={collaborations}
        totalCollaborations={totalCollaborations}
        currentPage={page}
        limit={limit}
        searchTerm={search}
        currentPage2={page2}
      />
    </SocketProvider>
  );
};

export default SportsAmbassadors;
