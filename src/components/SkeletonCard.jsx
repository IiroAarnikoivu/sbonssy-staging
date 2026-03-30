import React, { memo } from 'react';

const SkeletonCard = memo(() => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
      <div className="w-full aspect-square bg-gray-200"></div>
      <div className="p-4">
        <div className="h-6 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="flex flex-col gap-2">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
});

SkeletonCard.displayName = 'SkeletonCard';

export default SkeletonCard;
