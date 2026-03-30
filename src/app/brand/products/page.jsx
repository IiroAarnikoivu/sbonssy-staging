// app/products/page.jsx
"use client";

import Loader from "@/components/Loader";
import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/Pagination/pagination";
import Sidebar from "@/components/Sidebar";
import useDebounce from "@/hook/useDebounce";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { FiSearch } from "react-icons/fi";
import { useTranslations } from "next-intl";

/**
 * Products Page Component
 *
 * Displays a paginated grid of products from the connected Shopify store.
 * Includes search functionality, Shopify connection status, and internationalization support.
 *
 * Features:
 * - Dynamic Shopify connection status detection
 * - Real-time product search with debouncing (500ms)
 * - Pagination support (20 products per page)
 * - Responsive grid layout (1-4 columns based on screen size)
 * - Internationalization support (English/Finnish)
 * - Automatic redirect to dashboard if Shopify not connected
 * - Loading states and error handling
 * - Empty states for different scenarios (no products, search results, not connected)
 *
 * @component
 * @returns {JSX.Element} The Products page component
 *
 * @example
 * // Used as a Next.js page component
 * // Route: /brand/products
 * <Products />
 */
export default function Products() {
  // Single state object approach
  const [state, setState] = useState({
    products: [],
    loading: true,
    error: null,
    searchTerm: "",
    searchLoading: false,
    currentPage: 1,
    pagination: {
      currentPage: 1,
      totalItems: 0,
      totalPages: 0,
      limit: 20,
    },
  });
  const router = useRouter();
  const { user } = useAuthStore();
  const t = useTranslations("Products");

  // Whether brand has connected Shopify - same logic as Dashboard component
  const isShopifyConnected = useMemo(() => {
    return !!user?.onboardedDetails?.brand?.shopifyDetails;
  }, [user]);

  // Debounce the search term with 500ms delay
  const debouncedSearchTerm = useDebounce(state.searchTerm, 500);

  const fetchProducts = async (search = "", page = 1) => {
    try {
      setState((prev) => ({ ...prev, searchLoading: true }));
      const params = {
        ...(search && { search }),
        page,
        limit: 20,
      };
      const response = await api.get("/brand/products", { params });

      // Update products and pagination in single state update
      setState((prev) => ({
        ...prev,
        products: response.products || [],
        pagination: response.pagination || prev.pagination,
        searchLoading: false,
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: t("failedToLoad"),
        searchLoading: false,
      }));
      console.error("Error fetching products:", err);
    }
  };

  // Reset to first page when search term changes
  useEffect(() => {
    setState((prev) => ({ ...prev, currentPage: 1 }));
  }, [debouncedSearchTerm]);

  // Initial load
  useEffect(() => {
    const fetchUserAndProducts = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true }));
        await fetchProducts("", 1);
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: t("failedToLoad"),
          loading: false,
        }));
        console.error("Error fetching products:", err);
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchUserAndProducts();
  }, []);

  // Search when debounced term changes or page changes
  useEffect(() => {
    // Only trigger search after initial load is complete and if Shopify is connected
    if (!state.loading && isShopifyConnected) {
      fetchProducts(debouncedSearchTerm, state.currentPage);
    }
  }, [
    debouncedSearchTerm,
    state.currentPage,
    state.loading,
    isShopifyConnected,
  ]);

  // Handle page change
  const handlePageChange = useCallback((newPage) => {
    setState((prev) => ({ ...prev, currentPage: newPage }));
  }, []);

  // Handle search term change
  const handleSearchChange = useCallback((e) => {
    setState((prev) => ({ ...prev, searchTerm: e.target.value }));
  }, []);

  if (state.loading) {
    return <Loader />;
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("somethingWentWrong")}
            </h3>
            <p className="text-gray-600 mb-4">{state.error}</p>
            {state.error.includes("log in") && (
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {t("logInHere")}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-100">
      <div className="hidden lg:block">
        <Sidebar className="w-full max-w-[16rem] md:max-w-[20rem] xl:max-w-[24rem]" />
      </div>
      <div className="flex-1 p-4 pt-8 overflow-x-hidden overflow-y-auto max-h-[calc(100vh_-_92px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Header */}
        <header className="flex justify-between items-center mb-5 md:mb-[28px] xl:mb-[58px]">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h1 className="font-['Sunset_Gothic_Pro'] text-[30px] md:text-[40px] font-normal leading-[120%] tracking-[-1%] text-[#0C0D06]">
                {t("title")}
              </h1>
              {isShopifyConnected ? (
                <button className="p-[10px] bg-orange-500 text-white hover:bg-orange-600 transition-colors text-xs font-medium rounded-[100px]">
                  {t("shopifyConnected")}
                </button>
              ) : (
                <button
                  onClick={() => router.push("/brand")}
                  className="p-[10px] bg-orange-500 text-white hover:bg-orange-600 transition-colors text-xs font-medium rounded-[100px] cursor-pointer"
                >
                  {t("connectShopify")}
                </button>
              )}
            </div>
            <p className="mt-2 text-gray-600 max-w-4xl text-[14px]">
              {isShopifyConnected
                ? t("description")
                : t("descriptionNotConnected")}
            </p>
          </div>
        </header>

        {/* Search and Controls - Only show if Shopify is connected */}
        {isShopifyConnected && (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative w-[248px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {state.searchLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  ) : (
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={state.searchTerm}
                  onChange={handleSearchChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-[12px] leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Products Grid - Only show if Shopify is connected */}
        {isShopifyConnected && (
          <div>
            {state.products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                  {state.products.map((product) => (
                    <ProductCard
                      key={product.shopifyProductId}
                      product={product}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {state.pagination.totalPages > 1 && (
                  <div className="flex justify-center mt-8">
                    <Pagination
                      currentPage={state.pagination.currentPage}
                      pageCount={state.pagination.totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {state.searchTerm
                    ? t("noProductsFound")
                    : t("noProductsAvailable")}
                </h3>
                <p className="text-gray-600 mb-4">
                  {state.searchTerm
                    ? t("searchNoResults", { searchTerm: state.searchTerm })
                    : t("noProductsInStore")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
