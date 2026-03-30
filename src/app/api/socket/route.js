import { NextResponse } from "next/server";
import { Server } from "socket.io";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";

export const dynamic = "force-dynamic"; // Required for WebSockets

let io;

const SocketHandler = (req, res) => {
  if (!res.socket.server.io) {

    const httpServer = res.socket.server;
    io = new Server(httpServer, {
      path: "/api/socket",
      addTrailingSlash: false,
    });

    io.on("connection", (socket) => {

      socket.on("join-user-room", (userId) => {
        socket.join(userId);
      });

      socket.on("send-message", async (messageData) => {
        try {
          await connectDB();

          // Save message to database
          const newMessage = new Message({
            sender: messageData.senderId,
            receiver: messageData.receiverId,
            content: messageData.content,
            read: false,
          });

          const savedMessage = await newMessage.save();

          // Update conversation
          await Conversation.findOneAndUpdate(
            {
              participants: {
                $all: [messageData.senderId, messageData.receiverId],
              },
            },
            {
              $set: { lastMessage: savedMessage._id, updatedAt: new Date() },
              $setOnInsert: {
                participants: [messageData.senderId, messageData.receiverId],
              },
            },
            { upsert: true, new: true }
          );

          // Format message for client
          const formattedMessage = {
            _id: savedMessage._id,
            senderId: savedMessage.sender,
            receiverId: savedMessage.receiver,
            content: savedMessage.content,
            timestamp: savedMessage.createdAt,
            read: savedMessage.read,
          };

          // Emit to recipient
          socket
            .to(messageData.receiverId)
            .emit("receive-message", formattedMessage);

          // Send back to sender for UI update
          socket.emit("receive-message", formattedMessage);
        } catch (error) {
          console.error("Message send error:", error);
        }
      });

      socket.on("disconnect", () => {
      });
    });

    res.socket.server.io = io;
  } else {
  }

  res.end();
};

export function GET(req, res) {
  SocketHandler(req, res);
  return NextResponse.json({ success: true });
}

export function POST(req, res) {
  SocketHandler(req, res);
  return NextResponse.json({ success: true });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
