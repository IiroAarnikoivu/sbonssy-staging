"use client";

import Dashboard from "@/components/Dashboard/Dashboard";
import Sidebar from "@/components/Sidebar";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

/**
 * BrandHomePage - Dashboard home page for Brand users.
 * Fetches a Shopify token on mount and constructs a Shopify admin URL.
 *
 * @component
 * @returns {JSX.Element} The Brand Home Page component.
 */
const BrandHomePage = () => {
  const searchParams = useSearchParams();
  const shopify_token = searchParams.get("shopify_token");
  const t = useTranslations("Common");
  const { user, setUser } = useAuthStore((state) => state) ?? {};

  const toastAlert = useTranslations("Sweetalert");
  const [isConnecting, setIsConnecting] = useState(false);

  // Derive Shopify URLs for quick actions
  const myShopifyDomain =
    user?.onboardedDetails?.brand?.shopifyDetails?.myShopifyDomain;
  const shopName = useMemo(
    () => myShopifyDomain?.split(".")?.[0] || "",
    [myShopifyDomain]
  );
  const appName = process.env.NEXT_PUBLIC_SHOPIFY_APP_NAME;
  const adminAppUrl = useMemo(() => {
    if (!shopName || !appName) return "";
    return `https://admin.shopify.com/store/${shopName}/apps/${appName}/app`;
  }, [shopName, appName]);
  const bulkEditorUrl = useMemo(() => {
    if (!myShopifyDomain) return "";
    return `https://${myShopifyDomain}/admin/bulk?resource_name=Product&edit=product.title,product.vendor,variants.inventory_quantity,product.status&query=published_status%3Atrue`;
  }, [myShopifyDomain]);

  // Ensure Stripe customer is created on first dashboard visit
  useEffect(() => {
    (async () => {
      if (!user?.onboardedDetails) return;

      // Check if user already has Stripe customer ID
      const hasStripeCustomer = user?.onboardedDetails?.brand?.stripeCustomerId;

      if (!hasStripeCustomer) {
        try {
          const customerBody = {
            userId: user.onboardedDetails._id,
            email: user.onboardedDetails.email,
          };
          const customerResult = await api.post(
            "/payments/create-customer",
            customerBody
          );

          if (customerResult?.data?.success) {
            // Refresh user data to get updated Stripe customer ID
            const updatedUserResponse = await api.get(
              `/user?supabaseId=${user.onboardedDetails.supabaseId}`
            );
            if (updatedUserResponse?.data) {
              setUser({
                ...user,
                onboardedDetails: updatedUserResponse.data,
              });
            }
          }
        } catch (error) {
          console.error(
            "Failed to create Stripe customer on dashboard visit:",
            error
          );
        }
      }
    })();
  }, [user?.onboardedDetails]);

  useEffect(() => {
    (async () => {
      if (!shopify_token || !user) return;
      // Avoid re-calling if Shopify is already connected
      if (user?.onboardedDetails?.brand?.shopifyDetails) return;

      setIsConnecting(true);
      try {
        const verify = await api.post("/shopify/verify-token", {
          shopify_token,
        });
        if (verify?.valid) {
          const resp = await api.put("/user", {
            role: "brand",
            brand: { ...user?.onboardedDetails?.brand },
            // Pass only the decoded payload so backend can detect fields
            shopifyDetails: verify?.data,
          });
          const updated = resp?.data;
          if (updated) {
            // After successful database update, notify Shopify app to link the platform ID
            try {
              const shopDomain = updated?.brand?.shopifyDetails?.myShopifyDomain;
              if (shopDomain) {
                const shopifyApiUrl = "https://sbonssystore.icodestaging.in";
                const response = await fetch(`${shopifyApiUrl}/api/shop`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "X-Sbonssy-Secret":
                      process.env.NEXT_PUBLIC_SBONSSY_INTERNAL_SECRET || "",
                  },
                  body: JSON.stringify({
                    action: "connectWithUser",
                    shopDomain: shopDomain,
                    mainPlatformUserId: updated._id,
                  }),
                });
                const result = await response.json();
                console.log("Shopify connection sync result:", result);
              }
            } catch (err) {
              console.error("Failed to sync platform ID to Shopify:", err);
            }

            Swal.fire({
              toast: true,
              position: "top-right",
              title: toastAlert("profileUpdateThankYou"),
              icon: "success",
              showConfirmButton: false,
              timerProgressBar: false,
              timer: 5000,
            });

            setUser({
              role: "brand",
              onboardedDetails: updated,
            });
            const body = {
              userId: updated?._id,
              email: updated?.email,
            };
            await api.post("/payments/create-customer", body);
          }
        }
      } catch (err) {
        // Handle rate limiting gracefully
        const message = err?.error || err?.message || String(err);
        if (message?.toString().toLowerCase().includes("rate limit")) {
          Swal.fire({
            toast: true,
            position: "top-right",
            title: toastAlert("pleaseTryAgain"),
            text: "Request rate limit reached",
            icon: "warning",
            showConfirmButton: false,
            timerProgressBar: false,
            timer: 4000,
          });
          return;
        }
        console.error("/brand verify flow error", err);
      } finally {
        setIsConnecting(false);
      }
    })();
  }, [shopify_token, !!user]);

  return (
    <div className="flex flex-col bg-black min-h-screen">
      <div className="flex flex-1 relative">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        <div className="flex-1 p-4 pt-8 md:p-6 md:pt-10 justify-center flex h-fit items-center">
          <Dashboard role="brand" isConnectingShopify={isConnecting} />
        </div>
      </div>
    </div>
  );
};

export default BrandHomePage;
