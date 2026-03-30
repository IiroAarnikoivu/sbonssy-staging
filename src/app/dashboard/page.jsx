"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStoreWithTranslations } from "@/store/authStoreHelpers";
import axios from "axios";
import api from "@/lib/axios";

export default function Dashboard() {
  const { user, loading, logout } = useAuthStoreWithTranslations();
  const router = useRouter();

  // useEffect(() => {
  //   if (!loading && !user) {
  //     router.push("/login");
  //   }
  // }, [user, loading, router]);

  useEffect(() => {
    (async () => {
      const resp = await api.get("admin/users");
    })();
  }, []);
  const handleLogout = () => {
    logout(() => router.push("/"));
  };
  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-4">
        <h2 className="text-2xl">Welcome, {user.email}</h2>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
