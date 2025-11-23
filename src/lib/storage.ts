import { supabase } from "@/integrations/supabase/client";

/**
 * Generate a signed URL for a file in a storage bucket
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @param expiresIn - Expiration time in seconds (default: 24 hours)
 * @returns The signed URL string
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 24 * 60 * 60
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Failed to generate signed URL");

  return data.signedUrl;
}

/**
 * Generate signed URLs for multiple files
 * @param bucket - The storage bucket name
 * @param paths - Array of file paths
 * @param expiresIn - Expiration time in seconds (default: 24 hours)
 * @returns Map of path to signed URL
 */
export async function getSignedUrls(
  bucket: string,
  paths: string[],
  expiresIn: number = 24 * 60 * 60
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  await Promise.all(
    paths.map(async (path) => {
      try {
        const signedUrl = await getSignedUrl(bucket, path, expiresIn);
        results.set(path, signedUrl);
      } catch (error) {
        console.error(`Failed to generate signed URL for ${path}:`, error);
      }
    })
  );

  return results;
}
