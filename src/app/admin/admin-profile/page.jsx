"use client";

import api from "@/lib/axios";
import { useEffect, useState } from "react";

const AdminProfile = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [user, setUser] = useState(); // Mock data for demo

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get("/admin/admin-profile");
        console.log("resp", resp);
        setTotalUsers(resp?.data?.users);
        setUser(resp?.data?.userData);
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white shadow-xl rounded-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Admin Profile
        </h1>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Email
            </label>
            <p className="text-lg text-gray-900 border-b border-gray-200 pb-2 mt-1">
              {user?.email || "Loading..."}
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Total Users
            </label>
            <p className="text-lg text-gray-900 border-b border-gray-200 pb-2 mt-1">
              {totalUsers}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
