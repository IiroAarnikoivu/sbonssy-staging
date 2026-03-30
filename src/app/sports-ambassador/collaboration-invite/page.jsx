import AllCollaborationInvites from "@/components/AllcollaborationInvites";

import { cookies } from "next/headers";

const CollaborationInvitesPage = async ({ searchParams }) => {
  const params = await searchParams;
  const page = params?.page ?? 1;
  const page2 = params?.page2 ?? 1;
  const cookieStore = await cookies();

  const invitesRes = await fetch(
    `${process.env.NEXTAUTH_URL}/api/sports/collaboration-invite?page=${page}`,
    {
      headers: {
        Cookie: cookieStore.toString(),
      },
      cache: "no-store",
    }
  );

  const requestsRes = await fetch(
    `${process.env.NEXTAUTH_URL}/api/sports/collaboration-invite/requests`,
    {
      headers: {
        Cookie: cookieStore.toString(),
      },
      cache: "no-store",
    }
  );
  const acceptedRes = await fetch(
    `${process.env.NEXTAUTH_URL}/api/sports/collaboration-invite/accepted?page=${page2}`,
    {
      headers: {
        Cookie: cookieStore.toString(),
      },
      cache: "no-store",
    }
  );
  const { data, total } = await invitesRes.json();
  const requests = await requestsRes.json();
  const { data: acceptedRequests, total: total2 } = await acceptedRes.json();

  return (
    <AllCollaborationInvites
      // Invites props
      invites={data}
      invitesTotal={total}
      invitesCurrentPage={page}
      initialRequests={requests}
      // Accepted collaborations props
      acceptedRes={acceptedRequests}
      acceptedTotal={total2}
      acceptedCurrentPage={page2}
      limit={10}
    />
  );
};

export default CollaborationInvitesPage;
