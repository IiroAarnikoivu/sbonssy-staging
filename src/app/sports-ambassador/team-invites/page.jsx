import AllTeamCollaborationRequests from "@/components/AllTeamCollaborationRequests";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const TeamInvitesList = async ({ searchParams }) => {
  const params = await searchParams;
  const page = params?.page ?? 1;
  const page2 = params?.page2 ?? 1;
  // const page = (await searchParams.page) ?? 1;
  // const page2 = (await searchParams.page2) ?? 1;
  const cookieStore = await cookies();
  const fetchInvites = async () => {
    const invitesRes = await fetch(
      `${process.env.NEXTAUTH_URL}/api/teams/invites?page=${page}`,
      {
        headers: {
          Cookie: cookieStore.toString(),
        },
        cache: "no-store",
      }
    );
    return await invitesRes.json();
  };

  const fetchAccepted = async () => {
    const acceptedRes = await fetch(
      `${process.env.NEXTAUTH_URL}/api/teams/invites/accepted?page=${page2}`,
      {
        headers: {
          Cookie: cookieStore.toString(),
        },
        cache: "no-store",
      }
    );
    return await acceptedRes.json();
  };

  const [initialData, acceptedData] = await Promise.all([
    fetchInvites(),
    fetchAccepted(),
  ]);

  const { data: invites = [], total: totalInvites = 0 } = initialData;
  const { data: accepted = [], total: totalAccepted = 0 } = acceptedData;

  const handleActionComplete = async () => {
    "use server";
    revalidatePath(`/sports-ambassador/team-invites`);
  };

  return (
    <AllTeamCollaborationRequests
      invites={invites}
      accepted={accepted}
      totalInvites={totalInvites}
      totalAccepted={totalAccepted}
      onActionComplete={handleActionComplete}
      currentPage={page}
      currentPage2={page2}
      limit={10}
    />
  );
};

export default TeamInvitesList;
