import createClient from "./client";

/**
 * Upload file to Supabase Storage
 * @param {Object} options - Upload options
 * @param {File} options.file - File to upload
 * @param {string} options.bucket - Storage bucket name (default: 'sbonssy')
 * @param {string} options.folder - Folder path within bucket (default: 'uploads')
 * @param {string} options.fileName - Custom file name (optional)
 * @returns {Promise<{url: string, path: string} | {error: string}>}
 */
export async function uploadToSupabase({
  file,
  bucket = "sbonssy", // Changed to your bucket name
  folder = "uploads",
  fileName = null,
}) {
  try {
    const supabase = createClient();

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return { error: "User must be authenticated to upload files" };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split(".").pop();
    const finalFileName =
      fileName || `${timestamp}_${randomString}.${fileExtension}`;

    // Create full path with user ID
    const filePath = `${folder}/${user.id}/${finalFileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket) // Using your bucket name
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      return { error: error.message };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage
      .from(bucket) // Using your bucket name
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      path: filePath,
      fullPath: data.path,
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Delete file from Supabase Storage
 * @param {Object} options - Delete options
 * @param {string} options.filePath - Full file path to delete
 * @param {string} options.bucket - Storage bucket name (default: 'sbonssy')
 * @returns {Promise<{success: boolean} | {error: string}>}
 */
export async function deleteFromSupabase({ filePath, bucket = "sbonssy" }) {
  try {
    const supabase = createClient();

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return { error: "User must be authenticated to delete files" };
    }

    // Delete file from Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Extract file path from Supabase public URL
 * @param {string} publicUrl - The public URL from Supabase storage
 * @param {string} bucket - Storage bucket name (default: 'sbonssy')
 * @returns {string|null} - The file path or null if invalid URL
 */
export function extractFilePathFromUrl(publicUrl, bucket = "sbonssy") {
  try {
    const url = new URL(publicUrl);
    const pathSegments = url.pathname.split("/");

    // Find the bucket name in the path and extract everything after it
    const bucketIndex = pathSegments.findIndex((segment) => segment === bucket);
    if (bucketIndex === -1) return null;

    // Join all segments after the bucket name
    const filePath = pathSegments.slice(bucketIndex + 1).join("/");
    return filePath || null;
  } catch (error) {
    console.error("Error extracting file path from URL:", error);
    return null;
  }
}
