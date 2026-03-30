"use client";
import React, { useEffect } from "react";
import IconsLibrary from "@/util/IconsLibrary";

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col shadow-lg">
        <div className="p-6 flex justify-between items-center border-b flex-shrink-0">
          <h3 className="text-xl font-bold text-[#0C0D06]">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <IconsLibrary name="crosIcon" size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
