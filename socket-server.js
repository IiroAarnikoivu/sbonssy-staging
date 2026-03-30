const http = require("http");
const { Server } = require("socket.io");
const { connectDB } = require("./src/lib/db");
const Message = require("./src/models/Message").default;
const Conversation = require("./src/models/Conversation").default;
const User = require("./src/models/User").default;
const dotenv = require("dotenv");
const sgMail = require("@sendgrid/mail");

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY || process.env.GRID_API_KEY);

const hostname = process.env.HOST || "localhost";
const port = process.env.SOCKETPORT || 5344;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Socket server is running");
});

const io = new Server(server, {
  cors: {
    origin: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:5200",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

connectDB("Socket Server").then(() => {
  io.on("connection", (socket) => {
    socket.on("join-user-room", (userId) => {
      if (userId) {
        socket.join(userId);
      }
    });

    // Client can request a fresh unread count (e.g., after marking messages as read)
    socket.on("request-unread-count", async (userId) => {
      try {
        if (!userId) return;
        const distinctSenders = await Message.distinct("sender", {
          receiver: userId,
          read: false,
        });
        const unreadCount = Array.isArray(distinctSenders)
          ? distinctSenders.length
          : 0;
        io.to(userId).emit("message:unreadCount", { count: unreadCount });
      } catch (e) {
        // ignore errors to avoid affecting client flow
      }
    });

    socket.on("send-message", async (messageData) => {
      const { senderId, receiverId, content, attachment, tempId } = messageData;

      try {
        const [sender, receiver] = await Promise.all([
          User.findById(senderId),
          User.findById(receiverId),
        ]);
        if (!sender || !receiver) throw new Error("Invalid user IDs");

        // Check if either user has blocked the other
        const senderBlockedReceiver =
          sender.blockedUsers && sender.blockedUsers.includes(receiverId);
        const receiverBlockedSender =
          receiver.blockedUsers && receiver.blockedUsers.includes(senderId);

        if (senderBlockedReceiver || receiverBlockedSender) {
          console.warn(
            `Message from ${senderId} to ${receiverId} discarded due to block`
          );
          return; // Discard the message without saving or emitting
        }

        if (!content && !attachment)
          throw new Error("Message or attachment required");

        // Validate attachment
        if (attachment !== null) {
          if (typeof attachment !== "string" || attachment.trim() === "") {
            console.error("Invalid attachment received:", attachment);
            throw new Error("Attachment must be a valid URL string or null");
          }
        }

        const newMessage = new Message({
          sender: senderId,
          receiver: receiverId,
          content: content || "",
          attachment: attachment || null,
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

              const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:5200";
              const chatPath = receiver.role === "brand" ? "/brand/chat" : "/sports-ambassador/chat";

              const msg = {
                to: receiver.email,
                from: "info@sbonssy.com",
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
              };

              
              sgMail.send(msg)
              
            }
          } catch (emailErr) {
            console.error("[ERROR] Error preparing message notification email:", emailErr);
          }
          // ----------------------------------------------------
        } else {
          conversation.lastMessage = savedMessage._id;
          conversation.updatedAt = new Date();
        }

        await conversation.save();

        const messageToSend = {
          _id: savedMessage._id,
          senderId: savedMessage.sender,
          receiverId: savedMessage.receiver,
          content: savedMessage.content,
          attachment: savedMessage.attachment,
          timestamp: savedMessage.createdAt,
          read: savedMessage.read,
          tempId,
        };

        io.to(receiverId).to(senderId).emit("receive-message", messageToSend);

        // Also emit updated unread count to receiver immediately
        try {
          const distinctSenders = await Message.distinct("sender", {
            receiver: receiverId,
            read: false,
          });
          const unreadCount = Array.isArray(distinctSenders)
            ? distinctSenders.length
            : 0;
          io.to(receiverId).emit("message:unreadCount", { count: unreadCount });
        } catch (e) {
          // Silent fail for unread count emission to not affect message delivery
        }
      } catch (error) {
        console.error("Message send error:", error.message);
        socket.emit("message-error", {
          tempId,
          message: error.message || "Failed to send message",
        });
      }
    });

    // Typing indicator events
    socket.on("typing", ({ senderId, receiverId }) => {
      if (!senderId || !receiverId) return;
      io.to(receiverId).emit("typing", { senderId });
    });

    socket.on("stop-typing", ({ senderId, receiverId }) => {
      if (!senderId || !receiverId) return;
      io.to(receiverId).emit("stop-typing", { senderId });
    });

    socket.on("disconnect", () => {});
  });

  server.listen(port, () => {
    console.log(`> Socket Server ready on port ${port}`);
  });
});
