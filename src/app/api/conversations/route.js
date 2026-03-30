import { connectDB } from "@/lib/db";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { NextResponse } from "next/server";

export async function GET(request) {
  await connectDB();

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const conversations = await Conversation.find({
      participants: userId,
      deletedBy: { $ne: userId }, // Exclude conversations deleted by the user
    })
      .populate({
        path: "participants",
        select:
          "_id email role subRole athlete team influencer brand exAthlete paraAthlete coach fan blockedUsers",
      })
      .populate({
        path: "lastMessage",
        select: "content sender receiver createdAt attachment",
      })
      .sort({ updatedAt: -1 })
      .lean();

    // Compute per-conversation unread counts and format payload
    const formattedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const participant = conv.participants.find(
          (p) => p._id.toString() !== userId
        );

        let participantData = {};
        let name = participant?.email || "Unknown";
        let images = [];
        let socialMedia = {};
        let location = {};
        let interests = [];
        let sport = "";
        let gender = "";
        let teamClubName = "";
        let level = "";
        let biography = "";
        let achievements = "";
        let records = "";
        let goals = "";
        let subRole = participant?.subRole || "";
        let companyName = "";
        let companyLogo = "";
        let favoriteTeams = [];

        if (participant) {
          switch (participant.role) {
            case "brand":
              participantData = participant.brand || {};
              name =
                participantData.name ||
                participantData.companyName ||
                participant.email;
              companyName = participantData.companyName || "";
              companyLogo = participantData.companyLogo || "";
              images = companyLogo
                ? [{ url: companyLogo, isProfile: true, publicId: "" }]
                : participantData.images || [];
              socialMedia = participantData.socialMedia || {};
              location = participantData.location || {};
              interests = participantData.valuesAndInterests || [];
              break;
            case "sports-ambassador":
              switch (participant.subRole) {
                case "athlete":
                  participantData = participant.athlete || {};
                  name = participantData.name || participant.email;
                  images = participantData.images || [];
                  socialMedia = participantData.socialMedia || {};
                  location = participantData.location || {};
                  interests = participantData.interests || [];
                  sport = participantData.sport || "";
                  gender = participantData.gender || "";
                  teamClubName = participantData.teamClubName || "";
                  level = participantData.level || "";
                  biography = participantData.biography || "";
                  achievements = participantData.achievements || "";
                  records = participantData.records || "";
                  goals = participantData.goals || "";
                  break;
                case "team":
                  participantData = participant.team || {};
                  name =
                    participantData.name ||
                    participantData.teamClubName ||
                    participant.email;
                  images = participantData.images || [];
                  socialMedia = participantData.socialMedia || {};
                  location = participantData.location || {};
                  interests = participantData.interests || [];
                  sport = participantData.sports?.join(", ") || "";
                  level = participantData.level || "";
                  teamClubName = participantData.teamClubName || "";
                  break;
                case "influencer":
                  participantData = participant.influencer || {};
                  name = participantData.name || participant.email;
                  images = participantData.images || [];
                  socialMedia = participantData.socialMedia || {};
                  location = participantData.location || {};
                  interests = participantData.interests || [];
                  gender = participantData.gender || "";
                  biography = participantData.biography || "";
                  achievements = participantData.achievements || "";
                  records = participantData.records || "";
                  goals = participantData.goals || "";
                  break;
                case "ex-athlete":
                  participantData = participant.exAthlete || {};
                  name = participantData.name || participant.email;
                  images = participantData.images || [];
                  socialMedia = participantData.socialMedia || {};
                  location = participantData.location || {};
                  interests = participantData.interests || [];
                  sport = participantData.sport || "";
                  gender = participantData.gender || "";
                  teamClubName = participantData.teamClubName || "";
                  level = participantData.level || "";
                  biography = participantData.biography || "";
                  achievements = participantData.achievements || "";
                  records = participantData.records || "";
                  goals = participantData.goals || "";
                  break;
                case "para-athlete":
                  participantData = participant.paraAthlete || {};
                  name = participantData.name || participant.email;
                  images = participantData.images || [];
                  socialMedia = participantData.socialMedia || {};
                  location = participantData.location || {};
                  interests = participantData.interests || [];
                  sport = participantData.sport || "";
                  gender = participantData.gender || "";
                  teamClubName = participantData.teamClubName || "";
                  level = participantData.level || "";
                  biography = participantData.biography || "";
                  achievements = participantData.achievements || "";
                  records = participantData.records || "";
                  goals = participantData.goals || "";
                  break;
                case "coach":
                  participantData = participant.coach || {};
                  name = participantData.name || participant.email;
                  images = participantData.images || [];
                  socialMedia = participantData.socialMedia || {};
                  location = participantData.location || {};
                  interests = participantData.interests || [];
                  sport = participantData.sport || "";
                  gender = participantData.gender || "";
                  teamClubName = participantData.teamClubName || "";
                  level = participantData.level || "";
                  biography = participantData.biography || "";
                  achievements = participantData.achievements || "";
                  records = participantData.records || "";
                  goals = participantData.goals || "";
                  break;
                default:
                  participantData = {};
                  name = participant.email;
              }
              break;
            case "fan":
              participantData = participant.fan || {};
              name = participant.email;
              images = participantData.images || [];
              socialMedia = participantData.socialMedia || {};
              location = participantData.location || {};
              interests = participantData.interests || [];
              favoriteTeams = participantData.favoriteTeams || [];
              break;
            default:
              participantData = {};
              name = participant.email;
          }
        }

        // Count unread messages from this participant to the current user
        let unreadCount = 0;
        if (participant?._id) {
          unreadCount = await Message.countDocuments({
            sender: participant._id,
            receiver: userId,
            read: false,
          });
        }

        return {
          _id: conv._id,
          participant: {
            _id: participant?._id || null,
            email: participant?.email || "Unknown",
            role: participant?.role || "unknown",
            subRole,
            name,
            images,
            socialMedia,
            location,
            interests,
            sport,
            gender,
            teamClubName,
            level,
            biography,
            achievements,
            records,
            goals,
            companyName,
            companyLogo,
            favoriteTeams,
          },
          lastMessage: conv.lastMessage
            ? {
                content: conv.lastMessage.content,
                attachment: conv.lastMessage.attachment,
                timestamp: conv.lastMessage.createdAt,
                senderId: conv.lastMessage.sender,
                receiverId: conv.lastMessage.receiver,
              }
            : null,
          updatedAt: conv.updatedAt,
          unreadCount,
        };
      })
    );

    return NextResponse.json(formattedConversations, { status: 200 });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  await connectDB();

  try {
    const { conversationId, userId } = await request.json();

    if (!conversationId || !userId) {
      return NextResponse.json(
        { error: "Conversation ID and User ID are required" },
        { status: 400 }
      );
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (!conversation.participants.includes(userId)) {
      return NextResponse.json(
        { error: "User not part of this conversation" },
        { status: 403 }
      );
    }

    // Add user to deletedBy instead of deleting
    conversation.deletedBy = conversation.deletedBy || [];
    if (!conversation.deletedBy.includes(userId)) {
      conversation.deletedBy.push(userId);
      await conversation.save();
    }

    return NextResponse.json(
      { message: "Conversation deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
