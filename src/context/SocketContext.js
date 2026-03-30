"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketInstance = io(
      process.env.NEXT_PUBLIC_SOCKETURL || "http://localhost:5344",
      {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      }
    );

    socketInstance.on("connect", () => {
      setSocket(socketInstance);
    });

    socketInstance.on("connect_error", (err) => {
    });

    socketInstance.on("disconnect", () => {
      setSocket(null);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
