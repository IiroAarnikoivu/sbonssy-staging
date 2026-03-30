"use client";

import { useState } from "react";
import ConversationsList from "./ConversationsList";
import ChatWindow from "./ChatWindow";
import UserSearch from "./UserSearch";
import { useTranslations } from "next-intl";

export default function ChatLayout({ currentUser, activeChat, setActiveChat }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const t = useTranslations("Sports.chat");

  return (
    <div className="md:flex md:h-[calc(100vh-64px)] bg-whiteSmoke font-sunset-gothic">
      {/* Mobile Sidebar Toggle */}
      {/* <button
        className="md:hidden fixed top-16 left-4 z-30 p-2 primaryBtnPurple text-white rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-orange"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isSidebarOpen ? (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button> */}

      {/* Sidebar */}
      <div
        className={`relative w-full md:static inset-y-0 left-0 md:w-80 bg-white border-r border-gray transform  md:translate-x-0 transition-transform duration-300 ease-in-out z-20 flex flex-col shadow-tabCustom pt-4 md:pt-0`}
      >
        <div className="p-4 sm:p-6 border-b border-gray bg-reddishPurple">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {t("messages")}
          </h2>
          <UserSearch
            currentUser={currentUser}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setActiveChat={setActiveChat}
          />
        </div>
        <ConversationsList
          currentUser={currentUser}
          activeChat={activeChat}
          setActiveChat={setActiveChat}
          searchQuery={searchQuery}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <ChatWindow currentUser={currentUser} activeChat={activeChat} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-bgGraySmoke">
            <div className="text-center p-6 max-w-md">
              <h2 className="text-xl sm:text-2xl font-semibold text-textColor mb-2">
                {searchQuery ? t("headTxt1") : t("headTxt1")}
              </h2>
              <p className="text-sm text-gray">
                {searchQuery ? t("para1") : t("para2")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
