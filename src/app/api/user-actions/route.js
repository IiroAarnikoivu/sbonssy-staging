import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Report from "@/models/Report";

export async function POST(request) {
  await connectDB();

  try {
    const {
      action,
      reporterId,
      reportedId,
      blockerId,
      blockedId,
      reason,
      conversationId,
      details,
    } = await request.json();

    if (!action) {
      return new Response(JSON.stringify({ error: "Action is required" }), {
        status: 400,
      });
    }

    if (action === "report") {
      if (!reporterId || !reportedId || !reason) {
        return new Response(
          JSON.stringify({ error: "Missing required fields for report" }),
          { status: 400 }
        );
      }

      const [reporter, reported] = await Promise.all([
        User.findById(reporterId),
        User.findById(reportedId),
      ]);
      if (!reporter || !reported) {
        return new Response(JSON.stringify({ error: "Invalid user IDs" }), {
          status: 400,
        });
      }

      const report = new Report({
        reporter: reporterId,
        reported: reportedId,
        reason,
        details,
        conversationId: conversationId || null,
      });
      await report.save();

      return new Response(
        JSON.stringify({ message: "User reported successfully" }),
        {
          status: 200,
        }
      );
    }

    if (action === "block") {
      if (!blockerId || !blockedId) {
        return new Response(
          JSON.stringify({ error: "Missing required fields for block" }),
          { status: 400 }
        );
      }

      const [blocker, blocked] = await Promise.all([
        User.findById(blockerId),
        User.findById(blockedId),
      ]);
      if (!blocker || !blocked) {
        return new Response(JSON.stringify({ error: "Invalid user IDs" }), {
          status: 400,
        });
      }

      blocker.blockedUsers = blocker.blockedUsers || [];
      if (!blocker.blockedUsers.includes(blockedId)) {
        blocker.blockedUsers.push(blockedId);
        await blocker.save();
      }

      return new Response(
        JSON.stringify({ message: "User blocked successfully" }),
        { status: 200 }
      );
    }

    if (action === "unblock") {
      if (!blockerId || !blockedId) {
        return new Response(
          JSON.stringify({ error: "Missing required fields for unblock" }),
          { status: 400 }
        );
      }

      const blocker = await User.findById(blockerId);
      if (!blocker) {
        return new Response(JSON.stringify({ error: "Invalid blocker ID" }), {
          status: 400,
        });
      }

      blocker.blockedUsers = blocker.blockedUsers || [];
      if (blocker.blockedUsers.includes(blockedId)) {
        blocker.blockedUsers = blocker.blockedUsers.filter(
          (id) => id.toString() !== blockedId.toString()
        );
        await blocker.save();
      }

      return new Response(
        JSON.stringify({ message: "User unblocked successfully" }),
        { status: 200 }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
    });
  } catch (error) {
    console.error("Error processing user action:", error);
    return new Response(JSON.stringify({ error: "Failed to process action" }), {
      status: 500,
    });
  }
}
