import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a File object (image) to a Base64 string and optionally resizes it.
 * @param file The image file to convert.
 * @param maxWidth The maximum width for the image.
 * @param maxHeight The maximum height for the image.
 * @returns A Promise that resolves with the Base64 string of the resized image, or null if an error occurs.
 */
export const fileToBase64 = (file: File, maxWidth: number = 800, maxHeight: number = 600): Promise<string | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions to fit within maxWidth and maxHeight
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert canvas content to Base64
        resolve(canvas.toDataURL('image/jpeg', 0.8)); // Use JPEG for smaller size, 0.8 quality
      };
      img.onerror = () => resolve(null);
    };
    reader.onerror = () => resolve(null);
  });
};