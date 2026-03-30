"use client";

import { useState } from "react";
import { HiPhotograph } from "react-icons/hi";

export default function ProfileEditForm({ initialData, onSave }) {
  const [formData, setFormData] = useState(initialData);
  const [imagePreview, setImagePreview] = useState(initialData?.imageUrl);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData({ ...formData, imageUrl: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="card">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            <img
              src={imagePreview}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <label className="mt-4 flex items-center cursor-pointer text-teal-600 hover:text-teal-800">
            <HiPhotograph className="mr-2" />
            <span>Upload Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            type="text"
            name="name"
            value={formData?.name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Bio</label>
          <textarea
            name="bio"
            value={formData?.bio}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
            rows="4"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
