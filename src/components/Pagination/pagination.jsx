"use client";
import React from "react";
import ReactPaginate from "react-paginate";

/**
 * Common Pagination component using react-paginate
 * @param {number} currentPage - The current active page
 * @param {number} pageCount - Total number of pages
 * @param {Function} onPageChange - Callback function to handle page change
 */
const Pagination = ({ currentPage, pageCount, onPageChange }) => {
  // Labels for previous and next page navigation buttons
  const PrevLabel = () => <span>←</span>;
  const NextLabel = () => <span>→</span>;

  if (pageCount > 1) {
    return (
      <div className="flex justify-center mt-4">
        <ReactPaginate
          previousLabel={<PrevLabel />}
          nextLabel={<NextLabel />}
          breakLabel={"..."}
          breakClassName="mx-1 text-gray-500"
          pageCount={pageCount}
          marginPagesDisplayed={2}
          pageRangeDisplayed={3}
          onPageChange={(selectedItem) =>
            onPageChange(selectedItem.selected + 1)
          }
          containerClassName="flex items-center space-x-1"
          pageClassName=""
          pageLinkClassName="px-3 py-2 rounded hover:bg-gray-200 cursor-pointer min-w-[40px] flex items-center justify-center"
          activeLinkClassName="bg-[#f26915] text-white"
          previousClassName={``}
          previousLinkClassName={`px-3 py-2 rounded min-w-[40px] flex items-center justify-center ${
            currentPage === 1
              ? "text-gray-400 cursor-not-allowed"
              : "hover:bg-gray-200 cursor-pointer"
          }`}
          nextClassName={``}
          nextLinkClassName={`px-3 py-2 rounded min-w-[40px] flex items-center justify-center ${
            currentPage === pageCount
              ? "text-gray-400 cursor-not-allowed"
              : "hover:bg-gray-200 cursor-pointer"
          }`}
          forcePage={currentPage - 1}
          disabledClassName="text-gray-400 cursor-not-allowed"
        />
      </div>
    );
  }
};

export default Pagination;
