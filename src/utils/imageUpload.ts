import { supabase } from "@/lib/supabase";
import { showError, showSuccess } from "@/utils/toast";

const BUCKET_NAME = "images"; // Asegúrate de que este sea el nombre de tu bucket en Supabase Storage

/**
 * Sube un archivo de imagen a Supabase Storage.
 * @param file El objeto File a subir.
 * @param path La ruta dentro del bucket (ej: 'profiles/user_id_profile.png', 'services/service_id_image.jpg').
 * @returns La URL pública de la imagen subida o null si falla.
 */
export const uploadImage = async (file: File, path: string): Promise<string | null> => {
  const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`; // Unique filename
  const filePath = `${path}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false, // Do not overwrite existing files by default
    });

  if (error) {
    console.error("Error uploading image:", error);
    showError(`Error al subir la imagen: ${error.message}`);
    return null;
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  if (publicUrlData?.publicUrl) {
    showSuccess("Imagen subida correctamente.");
    return publicUrlData.publicUrl;
  } else {
    showError("Error al obtener la URL pública de la imagen.");
    return null;
  }
};

/**
 * Elimina un archivo de imagen de Supabase Storage.
 * @param url La URL pública de la imagen a eliminar.
 * @returns true si la eliminación fue exitosa, false en caso contrario.
 */
export const deleteImage = async (url: string): Promise<boolean> => {
  if (!url) return true; // Nothing to delete

  try {
    const urlParts = url.split('/');
    const bucketIndex = urlParts.indexOf(BUCKET_NAME);
    if (bucketIndex === -1 || bucketIndex + 1 >= urlParts.length) {
      console.warn("Invalid image URL for deletion:", url);
      return false;
    }
    // The path in storage is everything after the bucket name
    const filePath = urlParts.slice(bucketIndex + 1).join('/');

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error("Error deleting image:", error);
      showError(`Error al eliminar la imagen: ${error.message}`);
      return false;
    }
    showSuccess("Imagen eliminada correctamente.");
    return true;
  } catch (e) {
    console.error("Exception during image deletion:", e);
    showError("Error inesperado al eliminar la imagen.");
    return false;
  }
};