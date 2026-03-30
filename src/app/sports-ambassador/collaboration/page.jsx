"use client";

import AllBrandCollaboration from "@/components/AllBrandCollaboration";
import { SocketProvider } from "@/context/SocketContext";

const CollaborationRequests = () => {
  return (
    <SocketProvider>
      <AllBrandCollaboration />
    </SocketProvider>
  );
};

export default CollaborationRequests;
