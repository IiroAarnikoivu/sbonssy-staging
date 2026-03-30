// components/ProductCard.jsx
import Link from "next/link";
import SquareImage from "@/components/Common/SquareImage";
import CurrencyIcon from "@/components/Common/CurrencyIcon";
import { FiExternalLink, FiShoppingCart } from "react-icons/fi";
import { useTranslations } from "next-intl";

export default function ProductCard({ product = {} }) {
  const t = useTranslations("Products");
  const title = product.title || "Product Title";
  const price = product.priceRangeV2?.maxVariantPrice?.amount || "39";
  const currency = product.priceRangeV2?.maxVariantPrice?.currencyCode || "€";
  const image = product.images?.edges?.[0]?.node?.url || "/placeholder.jpg";
  const handle = product.handle || "";
  const inventory = product.totalInventory || 0;
  const myShopifyDomain =
    product?.myShopifyDomain ||
    product?.mainAuthor?.brand?.shopifyDetails?.myShopifyDomain;

  // Replace with your actual Shopify store domain
  const shopifyUrl = myShopifyDomain
    ? `https://${myShopifyDomain}/products/${handle}`
    : "#";

  // Build cart permalink using first variant id and quantity 1
  const firstVariantGid = product?.variants?.edges?.[0]?.node?.id || "";
  const firstVariantId = firstVariantGid.includes("/")
    ? firstVariantGid.split("/").pop()
    : firstVariantGid;
  const cartPermalink =
    myShopifyDomain && firstVariantId
      ? `https://${myShopifyDomain}/cart/${firstVariantId}:1`
      : null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* Product Image */}
      <Link href={shopifyUrl} target="_blank" rel="noopener noreferrer">
        <div className="aspect-square bg-gray-100 overflow-hidden cursor-pointer group">
          <SquareImage
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
          {title}
        </h3>
        <p className="text-lg font-semibold text-black flex items-center gap-1">
          <CurrencyIcon currencyCode={currency} />
          {parseFloat(price).toFixed(2)}
        </p>

        {/* Action Buttons */}
        <div className="mt-3 flex space-x-2">
          <Link
            href={shopifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-black rounded-md text-sm font-medium text-black bg-white hover:bg-gray-100 transition-colors"
          >
            <FiExternalLink className="h-4 w-4 mr-1" />
            {t("viewProduct")}
          </Link>
          {/* Buy button commented out for now */}
          {/* <Link
            href={cartPermalink || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              cartPermalink
                ? "bg-gray-900 text-white hover:bg-gray-800"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
            aria-disabled={!cartPermalink}
          >
            <FiShoppingCart className="h-4 w-4 mr-1" />
            {t("buyProduct")}
          </Link> */}
        </div>
      </div>
    </div>
  );
}
