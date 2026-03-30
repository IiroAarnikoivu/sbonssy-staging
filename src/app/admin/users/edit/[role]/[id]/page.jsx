"use client";

import EditUserForm from "@/components/admin/EditUserForm";
import { useParams } from "next/navigation";

export default function EditUserPage() {
  const { id, role } = useParams();
  return (
    <div className="container mx-auto p-4">
      <EditUserForm userId={id} role={role} />
    </div>
  );
}
