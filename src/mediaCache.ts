import type { AiGeneratedFillInTheBlankSentence } from "./dynamic-cards/aiGeneratedFillInTheBlank";

const CACHE_NAME = "media-offline-cache";

/**
 * Get all database asset URLs using Vite's import.meta.glob.
 * This includes all audio files and images in src/assets/database/.
 */
function getDatabaseAssetUrls(): string[] {
  // Vite resolves this at build time to an object mapping original paths to hashed URLs
  const assets = import.meta.glob("./assets/database/*", {
    eager: true,
    query: "?url",
    import: "default",
  });
  return Object.values(assets) as string[];
}

/**
 * Get all S3 audio URLs for AI-generated sentences.
 */
async function getS3AudioUrls(): Promise<string[]> {
  const { VITE_AWS_BUCKET, VITE_AWS_BUCKET_REGION } = import.meta.env;
  if (!VITE_AWS_BUCKET || !VITE_AWS_BUCKET_REGION) {
    return [];
  }

  const response = await fetch(
    new URL("./assets/ai-generated-sentences.json", import.meta.url),
  );
  const sentences: AiGeneratedFillInTheBlankSentence[] = await response.json();

  return sentences.map(
    (s) =>
      `https://${VITE_AWS_BUCKET}.s3.${VITE_AWS_BUCKET_REGION}.amazonaws.com/ai-generated-sentences/${s.slug}.mp3`,
  );
}

/**
 * Get all media URLs that should be cached for offline use.
 * Excludes data URLs since they're already inlined in the JS bundle.
 */
export async function getAllMediaUrls(): Promise<string[]> {
  const databaseUrls = getDatabaseAssetUrls();
  const s3Urls = await getS3AudioUrls();
  return [...databaseUrls, ...s3Urls].filter((url) => !url.startsWith("data:"));
}

export type CacheProgress = {
  cached: number;
  total: number;
  inProgress: boolean;
};

export type CacheProgressCallback = (progress: CacheProgress) => void;

/**
 * Cache all media files for offline use.
 * Returns the number of files cached.
 */
export async function cacheAllMedia(
  onProgress?: CacheProgressCallback,
): Promise<number> {
  const urls = await getAllMediaUrls();
  const cache = await caches.open(CACHE_NAME);
  let cached = 0;

  onProgress?.({ cached: 0, total: urls.length, inProgress: true });

  // Cache in batches to avoid overwhelming the browser
  const batchSize = 10;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (url) => {
        try {
          // Check if already cached
          const existing = await cache.match(url);
          if (!existing) {
            await cache.add(url);
          }
          cached++;
          onProgress?.({ cached, total: urls.length, inProgress: true });
        } catch (e) {
          // Log but don't fail on individual file errors
          console.warn(`Failed to cache ${url}:`, e);
          cached++;
          onProgress?.({ cached, total: urls.length, inProgress: true });
        }
      }),
    );
  }

  onProgress?.({ cached, total: urls.length, inProgress: false });
  return cached;
}

/**
 * Get the current cache status.
 */
export async function getCacheStatus(): Promise<{
  cachedCount: number;
  totalCount: number;
}> {
  const urls = await getAllMediaUrls();
  const cache = await caches.open(CACHE_NAME);

  let cachedCount = 0;
  for (const url of urls) {
    const response = await cache.match(url);
    if (response) {
      cachedCount++;
    }
  }

  return { cachedCount, totalCount: urls.length };
}

/**
 * Clear all cached media files.
 */
export async function clearMediaCache(): Promise<void> {
  await caches.delete(CACHE_NAME);
}

/**
 * Nuclear option: clear all caches and unregister service workers,
 * then reload. Useful when the app gets into a bad state.
 */
export async function resetApp(): Promise<void> {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((reg) => reg.unregister()));
  window.location.reload();
}
