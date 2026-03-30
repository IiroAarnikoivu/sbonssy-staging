"use client";

import { useState } from "react";
import ChatLayout from "@/components/chat/ChatLayout";
// import { useAuthStore } from "@/store/useAuthStore";
import { SocketProvider } from "@/context/SocketContext";
import { useAuthStore } from "@/store/authStore";
import Loader from "@/components/Loader";

export default function ChatPage() {
  const { user } = useAuthStore();

  const [activeChat, setActiveChat] = useState(null);

  if (!user)
    return (
      <div className=" h-screen flex items-center justify-center">
        <Loader />
      </div>
    );

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        <SocketProvider>
          <ChatLayout
            currentUser={user}
            activeChat={activeChat}
            setActiveChat={setActiveChat}
          />
        </SocketProvider>
      </div>
    </div>
  );
}
