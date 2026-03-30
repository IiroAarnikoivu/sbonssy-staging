// app/products/page.jsx
"use client";

import ProductCard from "@/components/ProductCard";
import api from "@/lib/axios";
import { useEffect, useState } from "react";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndProducts = async () => {
      try {
        // Fetch products
        const response = await api.get("/sports-ambassador/products");
        setProducts(response.products || []);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndProducts();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-center text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Your Products</h1>
      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product, i) => (
            <ProductCard key={i} product={product} />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-600">No products found.</p>
      )}
    </div>
  );
}
