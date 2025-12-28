/**
 * R2 Storage Operations
 * Handles file upload, download, signed URL generation, and deletion
 */

/**
 * Generate a signed URL for R2 object download
 * @param r2 - R2Bucket binding from environment
 * @param key - R2 object key (path)
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Signed URL string
 */
export async function generateSignedUrl(
  r2: R2Bucket,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const object = await r2.get(key);

  if (!object) {
    throw new Error(`Object not found: ${key}`);
  }

  // R2 signed URLs are not directly supported yet in Workers
  // We'll use a workaround with HTTP Range requests
  // For now, return a direct URL that requires authentication
  // This will be enhanced when R2 supports presigned URLs

  // TODO: Implement proper signed URLs when R2 supports it
  // For now, we'll return the key and handle auth in the download endpoint
  return key;
}

/**
 * Upload file to R2
 * @param r2 - R2Bucket binding
 * @param key - R2 object key (path)
 * @param data - File data as ArrayBuffer, ReadableStream, or string
 * @param contentType - MIME type
 * @returns Upload success status
 */
export async function uploadFile(
  r2: R2Bucket,
  key: string,
  data: ArrayBuffer | ReadableStream | string,
  contentType?: string
): Promise<void> {
  const options: R2PutOptions = {};

  if (contentType) {
    options.httpMetadata = {
      contentType,
    };
  }

  await r2.put(key, data, options);
}

/**
 * Download file from R2
 * @param r2 - R2Bucket binding
 * @param key - R2 object key (path)
 * @returns R2Object with file data
 */
export async function downloadFile(
  r2: R2Bucket,
  key: string
): Promise<R2ObjectBody | null> {
  return await r2.get(key);
}

/**
 * Delete file from R2
 * @param r2 - R2Bucket binding
 * @param key - R2 object key (path)
 */
export async function deleteFile(
  r2: R2Bucket,
  key: string
): Promise<void> {
  await r2.delete(key);
}

/**
 * Check if file exists in R2
 * @param r2 - R2Bucket binding
 * @param key - R2 object key (path)
 * @returns true if file exists, false otherwise
 */
export async function fileExists(
  r2: R2Bucket,
  key: string
): Promise<boolean> {
  const object = await r2.head(key);
  return object !== null;
}

/**
 * Get file metadata from R2
 * @param r2 - R2Bucket binding
 * @param key - R2 object key (path)
 * @returns R2Object metadata or null
 */
export async function getFileMetadata(
  r2: R2Bucket,
  key: string
): Promise<R2Object | null> {
  return await r2.head(key);
}

/**
 * Generate R2 file path for user recordings
 * @param userId - Clerk user ID
 * @param filename - Recording filename
 * @returns R2 path string
 */
export function getUserRecordingPath(userId: string, filename: string): string {
  return `users/${userId}/recordings/${filename}`;
}

/**
 * Generate R2 file path for STT text results
 * @param userId - Clerk user ID
 * @param filename - Text filename (usually same as audio but .txt)
 * @returns R2 path string
 */
export function getUserSTTPath(userId: string, filename: string): string {
  return `users/${userId}/stt/${filename}`;
}
