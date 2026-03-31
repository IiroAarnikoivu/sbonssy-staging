"use client";
import React from "react";
import Image from "next/image";
import { sanitizeHtml } from "@/util/sanitizeHtml";

/**
 * Grid of products with search, add/remove to profile, and per-product share.
 * @param {Object} props
 * @param {Array} [props.products=[]]
 * @param {(key: string) => string} props.t
 * @param {string} [props.searchQuery=""]
 * @param {(v: string) => void} [props.setSearchQuery=() => {}]
 * @param {boolean} [props.termsAccepted=false]
 * @param {string} [props.buttonStatus=""]
 * @param {{role?: string}} [props.user]
 * @param {Object<string,string>} [props.productProfileStatuses={}]
 * @param {Object<string,boolean>} [props.loadingProductProfile={}]
 * @param {Object<string,boolean>} [props.loadingProductShare={}]
 * @param {(product: any, action: "add"|"remove") => void} [props.onProductProfile=() => {}]
 * @param {(product: any) => void} [props.onShareProduct=() => {}]
 */
const ProductsGrid = ({
  products = [],
  t,
  searchQuery = "",
  setSearchQuery = () => {},
  termsAccepted = false,
  buttonStatus = "",
  user = {},
  productProfileStatuses = {},
  loadingProductProfile = {},
  loadingProductShare = {},
  onProductProfile = () => {},
  onShareProduct = () => {},
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h2 className="text-2xl font-bold">{t("campaignProducts")}</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder={t("searchProducts")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products
          .filter((product) => {
            if (!searchQuery?.trim()) return true;
            const query = searchQuery.toLowerCase();
            return (
              product.name?.toLowerCase().includes(query) ||
              product.description?.toLowerCase().includes(query) ||
              product.price?.toString().includes(query)
            );
          })
          .map((product, i) => {
            const productId =
              product.shopifyProductId || product._id || product.id;
            const isInProfile = productProfileStatuses?.[productId] === "added";
            const isLoading = loadingProductProfile?.[productId];
            const isShareLoading = loadingProductShare?.[productId];

            return (
              <div
                key={i}
                className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="relative w-full aspect-square rounded-md overflow-hidden bg-gray-100 mb-4">
                  <Image
                    src={product.image || "/placeholder.jpg"}
                    alt={product.name || `Product ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="space-y-2 flex-grow flex flex-col">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {product.name || "Untitled Product"}
                  </h3>
                  {product.description && (
                    <div
                      className="text-sm text-gray-600 line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
                    />
                  )}
                  <div className="text-lg font-bold text-black">
                    {product.currency || "USD"}{" "}
                    {Number.parseFloat(product.price || "0").toFixed(2)}
                  </div>
                  {termsAccepted && user?.role === "sports-ambassador" && buttonStatus === "joined" && (
                    <div className="mt-auto pt-3 border-t border-gray-200 space-y-2">
                      <div className="relative">
                        <button
                          onClick={() =>
                            onProductProfile(
                              product,
                              isInProfile ? "remove" : "add"
                            )
                          }
                          disabled={isLoading}
                          className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            isInProfile ? "mb-2" : ""
                          } ${
                            isInProfile
                              ? "bg-white border border-[#F26915] text-[#F26915] hover:bg-orange-50"
                              : "bg-[#F26915] text-white hover:opacity-90"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                              {isInProfile ? t("removing") : t("adding")}
                            </span>
                          ) : isInProfile ? (
                            t("remove")
                          ) : (
                            t("add")
                          )}
                        </button>
                        {isInProfile && (
                          <button
                            onClick={() => onShareProduct(product)}
                            disabled={isShareLoading}
                            className="w-full px-3 py-2 rounded-md text-sm font-medium transition-colors bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isShareLoading
                              ? t("creating") || "Generating..."
                              : t("ProductShareLink") || "Copy Link"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default ProductsGrid;
