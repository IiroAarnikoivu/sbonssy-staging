import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import Report from "@/models/Report";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const supabase = await createClient();

    const supbaseuser = await supabase.auth.getUser();

    const {
      data: {
        user: {
          user_metadata: { is_super_admin },
        },
      },
    } = supbaseuser;

    if (!is_super_admin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 0;

    const total = await Report.countDocuments();

    const skip = (page - 1) * limit;

    const reports = await Report.find()
      .populate({
        path: "reported",
        model: "User",
        select:
          "athlete.name exAthlete.name paraAthlete.name coach.name team.name influencer.name brand.name brand.companyName",
      })
      .populate({
        path: "reporter",
        model: "User",
        select:
          "athlete.name exAthlete.name paraAthlete.name coach.name team.name influencer.name brand.name brand.companyName",
      })
      .skip(skip)
      .limit(limit);
    const allReports = await Report.find()
      .populate({
        path: "reported",
        model: "User",
        select:
          "athlete.name exAthlete.name paraAthlete.name coach.name team.name influencer.name brand.name brand.companyName",
      })
      .populate({
        path: "reporter",
        model: "User",
        select:
          "athlete.name exAthlete.name paraAthlete.name coach.name team.name influencer.name brand.name brand.companyName",
      });
    const formattedResponse = reports.map((r) => {
      // Helper function to determine the display name for a user
      const getDisplayName = (user) => {
        if (!user) return "Unknown";
        if (user.brand && (user.brand.name || user.brand.companyName)) {
          return user.brand.companyName || user.brand.name;
        }
        return (
          user.athlete?.name ||
          user.exAthlete?.name ||
          user.paraAthlete?.name ||
          user.coach?.name ||
          user.team?.name ||
          user.influencer?.name ||
          "Unknown"
        );
      };

      return {
        _id: r?._id,
        details: r?.details,
        reason: r?.reason,
        status: r?.status,
        reported: getDisplayName(r?.reported),
        reporter: getDisplayName(r?.reporter),
      };
    });
    const formattedResponseAll = allReports.map((r) => {
      // Helper function to determine the display name for a user
      const getDisplayName = (user) => {
        if (!user) return "Unknown";
        if (user.brand && (user.brand.name || user.brand.companyName)) {
          return user.brand.companyName || user.brand.name;
        }
        return (
          user.athlete?.name ||
          user.exAthlete?.name ||
          user.paraAthlete?.name ||
          user.coach?.name ||
          user.team?.name ||
          user.influencer?.name ||
          "Unknown"
        );
      };

      return {
        _id: r?._id,
        details: r?.details,
        reason: r?.reason,
        status: r?.status,
        reported: getDisplayName(r?.reported),
        reporter: getDisplayName(r?.reporter),
      };
    });

    return NextResponse.json(
      {
        data:
          limit > 0
            ? {
                data: formattedResponse,
                pagination: {
                  page,
                  limit,
                  total,
                  totalPages: Math.ceil(total / limit),
                },
              }
            : {
                data: formattedResponseAll,
              },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createClient();
    const supabaseUser = await supabase.auth.getUser();

    const {
      data: {
        user: {
          user_metadata: { is_super_admin },
        },
      },
    } = supabaseUser;

    if (!is_super_admin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 400 });
    }
    await connectDB();
    const { searchParams } = new URL(request?.url);
    const id = searchParams.get("id");

    const data = await Report.findByIdAndDelete({ _id: id });

    return NextResponse.json(
      {
        data: {
          data: data,
          message: "Deleted successfully",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    NextResponse.json(
      { message: "Server Error", error: error.message },
      { status: 500 }
    );
  }
}
