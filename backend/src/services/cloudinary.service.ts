import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadedImage {
  url: string;
  publicId: string;
}

/** Uploads a local temp file to Cloudinary and returns the hosted URL + public id. */
export async function uploadImage(filePath: string): Promise<UploadedImage> {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'butterbloombatter',
  });
  return { url: result.secure_url, publicId: result.public_id };
}

/** Removes an image from Cloudinary by its public id. */
export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}
