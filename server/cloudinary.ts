import { v2 as cloudinary } from "cloudinary";
import { ENV } from "./_core/env";

// Configure Cloudinary
cloudinary.config({
  cloud_name: ENV.cloudinaryCloudName,
  api_key: ENV.cloudinaryApiKey,
  api_secret: ENV.cloudinaryApiSecret,
});

/**
 * Upload image to Cloudinary
 * @param fileBuffer - File buffer or base64 data
 * @param fileName - Original filename
 * @returns Object with secure_url and public_id
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer | string,
  fileName: string
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        public_id: `footware/${Date.now()}_${fileName}`,
        folder: "footware",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            secure_url: result?.secure_url ?? "",
            public_id: result?.public_id ?? "",
          });
        }
      }
    );

    if (typeof fileBuffer === "string") {
      // Base64 data
      uploadStream.end(Buffer.from(fileBuffer, "base64"));
    } else {
      // Buffer data
      uploadStream.end(fileBuffer);
    }
  });
}

/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public_id
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

/**
 * Generate Cloudinary upload signature for client-side uploads
 * @returns Object with signature, timestamp, and cloud_name
 */
export function generateCloudinarySignature() {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: "footware" },
    ENV.cloudinaryApiSecret
  );

  return {
    signature,
    timestamp,
    cloudName: ENV.cloudinaryCloudName,
    apiKey: ENV.cloudinaryApiKey,
  };
}
