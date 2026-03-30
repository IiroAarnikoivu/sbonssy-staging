"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import BrandForm from "./BrandForm";
import Swal from "sweetalert2";
import { useTranslations } from "next-intl";
import SportsAmbassadorForm from "./SportsAmbassadorForm";

const EditUserForm = ({ userId, role }) => {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const toastAlert = useTranslations("Sweetalert");

  useEffect(() => {
    if (!userId || !role) {
      router.push("/admin/users");
    }
  }, [userId, role, router]);

  const handleSuccess = (resp) => {
    Swal.fire({
      title: toastAlert("profileUpdateThankYou"),
      position: "top-right",
      icon: "success",
      toast: true,
      showConfirmButton: false,
      timerProgressBar: false,
      timer: 3000,
    });

    if (user?.id === userId) {
      const updatedOnboardedDetails = {
        ...user.onboardedDetails,
        ...resp.data,
        ...(resp.data.subRole && {
          [resp.data.subRole]: {
            ...(user.onboardedDetails?.[resp.data.subRole] || {}),
            ...(resp.data[resp.data.subRole] || {}),
          },
        }),
      };

      setUser({
        ...user,
        onboardedDetails: updatedOnboardedDetails,
      });
    }
  };

  return (
    <div>
      {role === "sports-ambassador" ? (
        <SportsAmbassadorForm
          userId={userId}
          onSuccess={handleSuccess}
          isAdminEdit={true}
        />
      ) : role === "brand" ? (
        <BrandForm
          userId={userId}
          onSuccess={handleSuccess}
          isAdminEdit={true}
        />
      ) : null}
    </div>
  );
};

export default EditUserForm;
