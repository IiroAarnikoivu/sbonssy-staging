"use client";

import dynamic from "next/dynamic";
const Select = dynamic(() => import("react-select"), { ssr: false });

const InventoryStep = ({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  setFieldValue,
  regionOptions,
  show,
}) => {
  // Mock product data - in a real app, this would come from your API
  const productOptions = [
    {
      value: "prod_001",
      label: "Summer Collection T-Shirt (Blue, M)",
      name: "Summer Collection T-Shirt (Blue, M)",
      description: "Blue medium-sized T-shirt from the summer collection",
    },
    {
      value: "prod_002",
      label: "Summer Collection T-Shirt (Red, M)",
      name: "Summer Collection T-Shirt (Red, M)",
      description: "Red medium-sized T-shirt from the summer collection",
    },
    {
      value: "prod_003",
      label: "Summer Collection Shorts (Black, L)",
      name: "Summer Collection Shorts (Black, L)",
      description: "Black large-sized shorts from the summer collection",
    },
    {
      value: "prod_004",
      label: "Summer Collection Hat (White)",
      name: "Summer Collection Hat (White)",
      description: "White hat from the summer collection",
    },
  ];

  //   if (!show) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Inventory & Gifting
      </h2>

      <div>
        <label className="block mb-2 text-gray-700">Products for Gifting</label>
        <Select
          isMulti
          options={productOptions}
          onChange={(selected) =>
            setFieldValue(
              "inventory.products",
              selected
                ? selected.map((option) => ({
                    name: option.name,
                    description: option.description,
                  }))
                : []
            )
          }
          onBlur={() => handleBlur("inventory.products")}
          className="basic-multi-select"
          classNamePrefix="select"
          placeholder="Select products..."
        />
        {touched.inventory?.products && errors.inventory?.products && (
          <p className="mt-1 text-sm text-red-600">
            {errors.inventory.products}
          </p>
        )}
      </div>

      <div>
        <label className="block mb-2 text-gray-700">Shipping Regions</label>
        <Select
          isMulti
          options={regionOptions}
          onChange={(selected) =>
            setFieldValue(
              "inventory.shippingRegions",
              selected ? selected.map((option) => option.value) : []
            )
          }
          onBlur={() => handleBlur("inventory.shippingRegions")}
          className="basic-multi-select"
          classNamePrefix="select"
          placeholder="Select shipping regions..."
        />
        {touched.inventory?.shippingRegions &&
          errors.inventory?.shippingRegions && (
            <p className="mt-1 text-sm text-red-600">
              {errors.inventory.shippingRegions}
            </p>
          )}
      </div>

      <div>
        <label className="block mb-2 text-gray-700">
          Shipping Requirements
        </label>
        <textarea
          name="inventory.shippingRequirements"
          value={values.inventory.shippingRequirements}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          placeholder="Please provide your full shipping address, preferred size, etc."
        />
      </div>
    </div>
  );
};

export default InventoryStep;
