"use client";

import { useState } from "react";
import ChatLayout from "@/components/chat/ChatLayout";
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
    <SocketProvider>
      <ChatLayout
        currentUser={user}
        activeChat={activeChat}
        setActiveChat={setActiveChat}
      />
    </SocketProvider>
  );
}
