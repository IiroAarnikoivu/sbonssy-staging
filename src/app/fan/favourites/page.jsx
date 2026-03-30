import FavouritesFan from "@/components/FavouritesFan";
import SidebarFan from "@/components/SidebarFan";
import { cookies } from "next/headers";

const favourites = async ({ searchParams }) => {
  const campaignPage = parseInt(searchParams.campaignPage || "1", 10);
  const ambassadorPage = parseInt(searchParams.ambassadorPage || "1", 10);
  const page = parseInt(searchParams.page || "1", 10);
  const limit = 10;
  const cookieStore = await cookies();

  const response = await fetch(
    `${process.env.NEXTAUTH_URL}/api/favourites?campaignPage=${campaignPage}&ambassadorPage=${ambassadorPage}&page=${page}&limit=${limit}`,
    {
      headers: {
        Cookie: cookieStore.toString(),
      },
      cache: "no-store",
    }
  );

  const data = await response.json();

  // For brand/ambassador users, data structure is slightly different
  const campaignFavourites = data?.data?.campaign?.data || [];
  const campaignPagination = data?.data?.campaign?.pagination;
  const ambassadorFavourites = data?.data?.ambassador?.data || [];
  const ambassadorPagination = data?.data?.ambassador?.pagination;

  return (
    <div className="flex flex-col bg-gray-100 h-screen">
      <div className="flex flex-1 lg:flex-row flex-col relative">s
        <div className="hidden lg:block h-fit">
          <SidebarFan />
        </div>
        <div className=" ml-20 flex-1 overflow-auto w-full">
          <FavouritesFan
            paginationCmg={campaignPagination}
            campaigns={campaignFavourites}
            ambassadors={ambassadorFavourites}
            paginationAmb={ambassadorPagination}
            currentPage={page}
          />
        </div>
      </div>
    </div>
  );
};

export default favourites;
