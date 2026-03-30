import React from "react";

const Loader = ({ size = "medium", color = "orange", className = "" }) => {
  const sizeClasses = {
    small: "h-4 w-4 border-2",
    medium: "h-6 w-6 border-2",
    large: "h-8 w-8 border-3",
  };

  const colorClasses = {
    orange: "border-t-orange-500 border-b-orange-500",
    blue: "border-t-blue-500 border-b-blue-500",
    gray: "border-t-gray-500 border-b-gray-500",
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-t-2 border-b-2 border-gray-200 ${sizeClasses[size]} ${colorClasses[color]}`}
      ></div>
    </div>
  );
};

export default Loader;
