"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import Loader from "../Loader";
import { sanitizeHtml } from "@/util/sanitizeHtml";

const Select = dynamic(() => import("react-select"), { ssr: false });

const ProductsStep = ({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  setFieldValue,
  next = () => {},
}) => {
  const t = useTranslations("Brand.campaignCreate.step7");
  const { user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user has Shopify integration from the store
  const shopifyDetails = user?.onboardedDetails?.brand?.shopifyDetails;
  const hasShopifyIntegration = shopifyDetails?.myShopifyDomain;

  // Initialize auth store if needed
  useEffect(() => {
    if (!user) {
      useAuthStore.getState().initialize();
    }
  }, [user]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (hasShopifyIntegration) {
          // Fetch products from Shopify
          const productsResponse = await api.get("/brand/products?limit=10000");
          const list =
            productsResponse?.data?.products ??
            productsResponse?.products ??
            productsResponse?.data?.data?.products ??
            [];
          setProducts(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Failed to load products. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [hasShopifyIntegration]);

  const productOptionsFromApi = products.map((product) => {
    // Extract handle from product URL if not directly available
    let handle = product.handle || "";
    if (!handle && product.onlineStoreUrl) {
      // Extract handle from URL like: https://shop.myshopify.com/products/handle-name
      const urlParts = product.onlineStoreUrl.split("/products/");
      if (urlParts.length > 1) {
        handle = urlParts[1];
      }
    }

    // Extract first variant ID from variants data
    let variantId = "";
    if (product.variants) {
      // Handle both JSON object and edges format
      if (product.variants.edges && Array.isArray(product.variants.edges)) {
        variantId = product.variants.edges[0]?.node?.id || "";
      } else if (Array.isArray(product.variants)) {
        variantId = product.variants[0]?.id || "";
      }
    }

    return {
      value: String(
        product.shopifyProductId || product._id || product.id || ""
      ),
      label: product.title || "Untitled Product",
      name: product.title || "Untitled Product",
      description: product.description || "",
      price: product.priceRangeV2?.maxVariantPrice?.amount || "0.00",
      currency: product.priceRangeV2?.maxVariantPrice?.currencyCode || "USD",
      image: product.images?.edges?.[0]?.node?.url || "/placeholder.jpg",
      handle: handle,
      variantId: variantId,
      onlineStoreUrl: product.onlineStoreUrl || (product.myShopifyDomain && handle ? `https://${product.myShopifyDomain}/products/${handle}` : ""),
    };
  });

  // Include any already-selected products not present in API results
  const productOptions = (() => {
    const byId = new Map(
      productOptionsFromApi.map((o) => [String(o.value), o])
    );
    if (Array.isArray(values.products)) {
      for (const p of values.products) {
        const id = String(p.shopifyProductId || p._id || p.id || "");
        if (id && !byId.has(id)) {
          byId.set(id, {
            value: id,
            label: p.name || "Untitled Product",
            name: p.name || "Untitled Product",
            description: p.description || "",
            price: p.price ?? "0.00",
            currency: p.currency ?? "USD",
            image: p.image || "/placeholder.jpg",
            handle: p.handle || "",
            variantId: p.variantId || "",
          });
        }
      }
    }
    return Array.from(byId.values());
  })();

  // Helper to map a react-select option into our formik product shape
  const mapOptionToProduct = (option) => {
    const fullOption =
      productOptions.find((o) => String(o.value) === String(option.value)) ||
      option;
    return {
      shopifyProductId: String(option.value || ""),
      handle: fullOption.handle || option.handle || "",
      variantId: fullOption.variantId || option.variantId || "",
      name: fullOption.name || option.name,
      description: fullOption.description || option.description || "",
      price: fullOption.price || option.price || "0.00",
      currency: fullOption.currency || option.currency || "USD",
      image: fullOption.image || option.image || "/placeholder.jpg",
      onlineStoreUrl: fullOption.onlineStoreUrl || option.onlineStoreUrl || "",
    };
  };

  // Normalize existing formik values after options load so Select can match
  useEffect(() => {
    if (!loading && Array.isArray(values.products) && values.products.length) {
      const normalized = values.products.map((p) => ({
        ...p,
        shopifyProductId: String(p.shopifyProductId || p._id || p.id || ""),
      }));
      // Avoid unnecessary re-renders by checking if normalization changes anything
      const changed = normalized.some(
        (p, i) =>
          p.shopifyProductId !==
          String(
            values.products[i]?.shopifyProductId ||
              values.products[i]?._id ||
              values.products[i]?.id ||
              ""
          )
      );
      if (changed) {
        setFieldValue("products", normalized, false);
      }
    }
  }, [loading, products]);

  // Select-all checkbox state (supports indeterminate)
  const selectAllRef = useRef(null);
  const selectedIds = new Set(
    (Array.isArray(values.products) ? values.products : []).map((p) =>
      String(p.shopifyProductId || p._id || p.id || "")
    )
  );
  const optionIds = productOptions.map((o) => String(o.value));
  const allSelected =
    optionIds.length > 0 && optionIds.every((id) => selectedIds.has(id));
  const noneSelected = optionIds.every((id) => !selectedIds.has(id));
  const someSelected = !allSelected && !noneSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {t("productSelection")}
        </h2>
        <div className="text-center py-8">
          <Loader />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {t("productSelection")}
        </h2>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#f26915] text-white rounded-lg hover:bg-[#d65e13]"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!hasShopifyIntegration) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {t("productSelection")}
        </h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-gray-800">
            <h3 className="text-lg font-medium mb-2"> {t("fallback")}</h3>
            <p className="mb-4">{t("para1")}</p>
            <p className="text-sm text-gray-700">{t("para2")}</p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  // Skip this step and continue
                  setFieldValue("products", []);
                  if (typeof next === "function") next();
                }}
                className="px-4 py-2 bg-[#f26915] text-white rounded-lg hover:bg-[#d65e13]"
              >
                {t("products")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {t("productSelection")}
        </h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-gray-600">
            <h3 className="text-lg font-medium mb-2"> {t("fallback1")}</h3>
            <p className="mb-4">{t("fallback2")}</p>
            <p className="text-sm text-gray-500">{t("add")}</p>
            {!hasShopifyIntegration && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setFieldValue("products", []);
                    if (typeof next === "function") next();
                  }}
                  className="px-4 py-2 bg-[#f26915] text-white rounded-lg hover:bg-[#d65e13]"
                >
                  {t("products")}
                </button>
              </div>
            )}
            {hasShopifyIntegration && (
              <p className="mt-4 text-red-600 font-medium">
                Please add products to your Shopify store to continue.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        {t("productSelection")}
      </h2>

      <div className="mb-6">
        <p className="text-gray-600 mb-4">{t("select")}</p>
      </div>

      <div>
        <label className="block mb-2 text-gray-700 font-medium">
          {t("campaignProducts")}
        </label>
        <div className="flex items-center gap-3 mb-3">
          <input
            id="select-all-products"
            ref={selectAllRef}
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-[#f26915] focus:ring-gray-500"
            checked={allSelected}
            onChange={(e) => {
              if (e.target.checked) {
                // Select all options
                const all = productOptions.map((option) =>
                  mapOptionToProduct(option)
                );
                setFieldValue("products", all);
              } else {
                // Clear all selections
                setFieldValue("products", []);
              }
            }}
          />
          <label
            htmlFor="select-all-products"
            className="text-sm text-gray-700"
          >
            {t("selectAll")}
          </label>
        </div>
        <Select
          isMulti
          options={productOptions}
          value={
            Array.isArray(values.products)
              ? values.products
                  .map((product) => {
                    const targetId = String(
                      product.shopifyProductId ||
                        product._id ||
                        product.id ||
                        ""
                    );
                    return productOptions.find(
                      (option) => String(option.value) === targetId
                    );
                  })
                  .filter(Boolean)
              : []
          }
          onChange={(selected) => {
            setFieldValue(
              "products",
              selected
                ? selected.map((option) => mapOptionToProduct(option))
                : []
            );
          }}
          onBlur={() => handleBlur("products")}
          className="basic-multi-select"
          classNamePrefix="select"
          placeholder={t("placeholder")}
          isSearchable={true}
          isClearable={true}
          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
          styles={{
            menuPortal: (provided) => ({
              ...provided,
              zIndex: 9999,
            }),
          }}
        />
        {touched.products && errors.products && (
          <p className="mt-1 text-sm text-red-600">{errors.products}</p>
        )}
      </div>

      {values.products && values.products.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-800 mb-3">
            {t("selectedProducts")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {values.products.map((product, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-start space-x-3">
                  <img
                    src={product.image || "/placeholder.jpg"}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded-md"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </h4>
                    {product.description && (
                      <div
                        className="text-xs text-gray-500 mt-1 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
                      />
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {product.currency}{" "}
                        {parseFloat(product.price).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updatedProducts = values.products.filter(
                            (_, i) => i !== index
                          );
                          setFieldValue("products", updatedProducts);
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        {t("remove")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {Array.isArray(values.products) &&
        values.products.length === 0 &&
        !hasShopifyIntegration && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setFieldValue("products", []);
                if (typeof next === "function") next();
              }}
              className="px-4 py-2 bg-[#f26915] text-white rounded-lg hover:bg-[#d65e13]"
            >
              {t("products")}
            </button>
          </div>
        )}
    </div>
  );
};

export default ProductsStep;
