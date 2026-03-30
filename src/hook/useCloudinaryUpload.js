import { useMutation } from "@tanstack/react-query";
import axios from "axios";

const useCloudinaryUpload = () => {
  const uploadToCloudinary = async ({
    file,
    folder = "default-folder",
    resourceType = "image",
    width = 1080, // Set desired width
    height = 1080, // Set desired height
    crop = "fill", // Ensures the image is resized properly
  }) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    );
    formData.append("folder", folder);
    // formData.append(
    //   "transformation",
    //   JSON.stringify([{ width, height, crop }])
    // );

    // formData.append("width", width);
    // formData.append("height", height);
    // formData.append("crop", crop);

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
      formData
    );

    const transformedUrl = response.data.secure_url.replace(
      "/upload/",
      "/upload/w_1080,h_1080,c_fill/"
    );

    // return response.data.secure_url;
    return transformedUrl;
  };

  //   const mutation = useMutation({
  //     mutationKey: ["upload-to-cloudinary"],
  //     mutationFn: uploadToCloudinary,
  //   });

  //   return mutation;
};

export default useCloudinaryUpload;
