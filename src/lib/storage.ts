import { supabase } from './supabase';

export const uploadFile = async (
  file: File,
  bucket: 'avatars' | 'resumes' | 'documents',
  userId: string
): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${bucket}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
};

export const deleteFile = async (url: string, bucket: string): Promise<boolean> => {
  try {
    const path = url.split(`${bucket}/`)[1];
    if (!path) return false;

    const { error } = await supabase.storage.from(bucket).remove([path]);

    return !error;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};
