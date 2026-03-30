import { NextResponse } from "next/server";
import CSVUploadLog from "@/models/CSVUploadLog";
import { connectDB } from "@/lib/db";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const status = searchParams.get("status"); // completed, partial, failed
    const logId = searchParams.get("logId"); // Get specific log
    // Optional pagination for created users inside a specific log
    const cuPage = parseInt(searchParams.get("cuPage")) || 1;
    const cuLimit = parseInt(searchParams.get("cuLimit")) || 50;

    // If requesting specific log
    if (logId) {
      const log = await CSVUploadLog.findById(logId);
      if (!log) {
        return NextResponse.json(
          { success: false, error: "Upload log not found" },
          { status: 404 }
        );
      }
      // Build created users pagination
      const totalCreated = Array.isArray(log.createdUsers)
        ? log.createdUsers.length
        : 0;
      const cuPages = Math.max(1, Math.ceil(totalCreated / cuLimit));
      const start = Math.max(0, (cuPage - 1) * cuLimit);
      const end = Math.min(start + cuLimit, totalCreated);
      const createdUsersPage = Array.isArray(log.createdUsers)
        ? log.createdUsers.slice(start, end)
        : [];

      // Shape response without mutating DB document
      const logPayload = {
        ...log.toObject(),
        createdUsers: createdUsersPage,
      };

      return NextResponse.json({
        success: true,
        log: logPayload,
        createdUsersPagination: {
          page: cuPage,
          limit: cuLimit,
          total: totalCreated,
          pages: cuPages,
          hasMore: cuPage < cuPages,
        },
      });
    }

    // Build query
    const query = {};
    if (status) {
      query.uploadStatus = status;
    }

    // Get logs with pagination
    const skip = (page - 1) * limit;
    const logs = await CSVUploadLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-errors -createdUsers"); // Exclude large arrays for list view

    const total = await CSVUploadLog.countDocuments(query);

    return NextResponse.json({
      success: true,
      logs: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Upload logs fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const logId = searchParams.get("logId");
    const olderThan = searchParams.get("olderThan"); // Delete logs older than X days

    if (logId) {
      // Delete specific log
      const result = await CSVUploadLog.findByIdAndDelete(logId);
      if (!result) {
        return NextResponse.json(
          { success: false, error: "Upload log not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: "Upload log deleted successfully",
      });
    }

    if (olderThan) {
      // Delete logs older than specified days
      const days = parseInt(olderThan);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await CSVUploadLog.deleteMany({
        createdAt: { $lt: cutoffDate },
      });

      return NextResponse.json({
        success: true,
        message: `Deleted ${result.deletedCount} upload logs older than ${days} days`,
        deletedCount: result.deletedCount,
      });
    }

    return NextResponse.json(
      { success: false, error: "Missing logId or olderThan parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Upload logs delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
