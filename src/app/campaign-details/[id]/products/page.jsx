"use client";

import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export default function Products() {
  const [products, setProducts] = useState([
    {
      id: 1,
      image: "car.jpg",
      brand: "Brand name should be here",
      name: "Product Name Product NameProduct NameProduct Name",
      action: "Add to Profile",
    },
    {
      id: 2,
      image: "athlete.jpg",
      name: "Product Name Product NameProduct NameProduct Name",
      action: "Add to Profile",
      remove: true,
    },
    {
      id: 3,
      image: "cycling.jpg",
      name: "Product Name Product NameProduct NameProduct Name",
      action: "Add to Profile",
      remove: true,
    },
    {
      id: 4,
      image: "running.jpg",
      name: "Product Name Product NameProduct NameProduct Name",
      action: "Add to Profile",
      remove: true,
    },
    {
      id: 5,
      image: "athlete2.jpg",
      name: "Product Name Product NameProduct NameProduct Name",
      action: "Add to Profile",
    },
    {
      id: 6,
      image: "cycling2.jpg",
      name: "Product Name Product NameProduct NameProduct Name",
      action: "Add to Profile",
      remove: true,
    },
    {
      id: 7,
      image: "running2.jpg",
      name: "Product Name Product NameProduct NameProduct Name",
      action: "Add to Profile",
      remove: true,
    },
  ]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl font-bold text-center mb-4">
          Add products to your profile
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Select your favorite products and add them to your personal profile!
        </p>
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={20}
          slidesPerView={3}
          navigation
          pagination={{ clickable: true }}
          autoplay={{ delay: 3000 }}
          className="mySwiper"
        >
          {products.map((product) => (
            <SwiperSlide
              key={product.id}
              className="bg-white rounded-lg shadow-md p-4"
            >
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-48 object-cover rounded-md"
              />
              {product.brand && (
                <div className="mt-2 text-gray-700">{product.brand}</div>
              )}
              <div className="mt-2 text-gray-900 font-medium">
                {product.name}
              </div>
              <button
                className={`mt-4 w-full py-2 rounded-md text-white ${
                  product.action === "Add to Profile"
                    ? "bg-purple-800 hover:bg-purple-900"
                    : "bg-gray-300"
                }`}
              >
                {product.action}
              </button>
              {product.remove && (
                <button className="mt-2 w-full py-2 bg-gray-100 text-gray-700 rounded-md">
                  Remove from Profile
                </button>
              )}
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}
