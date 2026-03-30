import { connectDB } from "@/lib/db";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";
import User from "@/models/User";
import { sendEmail } from "@/lib/sendEmail";

export async function GET(request) {
  await connectDB();

  const { searchParams } = new URL(request.url);
  const user1 = searchParams.get("user1");
  const user2 = searchParams.get("user2");

  if (!user1 || !user2) {
    return new Response(JSON.stringify({ error: "User IDs required" }), {
      status: 400,
    });
  }

  try {
    // Find the conversation between user1 and user2, not deleted by user1
    const conversation = await Conversation.findOne({
      participants: { $all: [user1, user2] },
      deletedBy: { $ne: user1 },
    }).lean();

    if (!conversation) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    const formattedMessages = messages.map((msg) => ({
      _id: msg._id,
      senderId: msg.sender,
      receiverId: msg.receiver,
      content: msg.content,
      attachment: msg.attachment,
      timestamp: msg.createdAt,
      read: msg.read,
    }));

    return new Response(JSON.stringify(formattedMessages), { status: 200 });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch messages" }), {
      status: 500,
    });
  }
}

export async function POST(request) {
  await connectDB();

  const { senderId, receiverId, content, attachment } = await request.json();
  try {
    if (!senderId || !receiverId || (!content && !attachment)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    const [sender, receiver] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId),
    ]);
    
    if (!sender || !receiver) {
      return new Response(JSON.stringify({ error: "Invalid user IDs" }), {
        status: 400,
      });
    }

    // Check if receiver has blocked the sender OR if sender has blocked the receiver
    if (receiver.blockedUsers && receiver.blockedUsers.includes(senderId)) {
      return new Response(
        JSON.stringify({ error: "You cannot send messages to this user" }),
        { status: 403 }
      );
    }
    
    if (sender.blockedUsers && sender.blockedUsers.includes(receiverId)) {
      return new Response(
        JSON.stringify({ error: "You cannot send messages to this user" }),
        { status: 403 }
      );
    }

    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      content: content || "",
      attachment: attachment
        ? {
            url: attachment.url,
            publicId: attachment.publicId,
            type: attachment.type,
          }
        : null,
      createdAt: new Date(),
    });
    const savedMessage = await newMessage.save();

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [senderId, receiverId],
        lastMessage: savedMessage._id,
        updatedAt: new Date(),
      });

      // --- Send First-Time Message Email Notification ---
      try {
        if (receiver && receiver.email) {
          const senderProfile = sender.athlete || sender.team || sender.influencer || sender.exAthlete || sender.paraAthlete || sender.coach || sender.brand;
          const senderName = senderProfile?.name || senderProfile?.companyName || sender.email || "Someone";
          
          const receiverProfile = receiver.athlete || receiver.team || receiver.influencer || receiver.exAthlete || receiver.paraAthlete || receiver.coach || receiver.brand;
          const receiverFirstName = receiverProfile?.firstName || receiverProfile?.name?.split(" ")[0] || "there";

          const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
          const chatPath = receiver.role === "brand" ? "/brand/chat" : "/sports-ambassador/chat";

          await sendEmail({
            to: receiver.email,
            subject: `You’ve received a new message from ${senderName}`,
            text: `Hi ${receiverFirstName}, You have a new message from ${senderName}. Respond quickly to keep the conversation going. Log in to check it out: ${baseUrl}${chatPath}`,
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 0;">
                <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;">
                  
                  <p style="color: #000; margin-bottom: 16px;">Hi ${receiverFirstName},</p>
                  <p style="color: #000; margin-bottom: 20px;">You have a new message from <strong>${senderName}</strong>. Respond quickly to keep the conversation going.</p>
                  
                  <p style="color: #000; margin-bottom: 20px;">Log in to check it out:</p>
                  <a href="${baseUrl}${chatPath}" 
                     style="background-color: #F26915; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                     View Message
                  </a>
                  
                  <p style="color: #000; margin-top: 30px;">Best,<br>Team Sbonssy</p>
                </div>
              </div>
            `,
          });
        }
      } catch (emailErr) {
        console.error("Error sending message notification email:", emailErr);
      }
      // ----------------------------------------------------
    } else {
      conversation.lastMessage = savedMessage._id;
      conversation.updatedAt = new Date();
    }
    await conversation.save();

    return new Response(
      JSON.stringify({
        _id: savedMessage._id,
        senderId: savedMessage.sender,
        receiverId: savedMessage.receiver,
        content: savedMessage.content,
        attachment: savedMessage.attachment,
        timestamp: savedMessage.createdAt,
        read: savedMessage.read,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving message:", error);
    return new Response(JSON.stringify({ error: "Failed to save message" }), {
      status: 500,
    });
  }
}
