// Simple in-memory cache for tags to avoid duplicate API calls
// This cache is shared across all components

interface CachedTag {
  name: string;
  color: string;
  id?: string;
}

let tagsCache: CachedTag[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get tags from cache if available and fresh
 */
export function getCachedTags(): CachedTag[] | null {
  if (tagsCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return tagsCache;
  }
  return null;
}

/**
 * Set tags in cache
 */
export function setCachedTags(tags: CachedTag[]): void {
  tagsCache = tags;
  cacheTimestamp = Date.now();
}

/**
 * Clear the tags cache (useful when tags are updated)
 */
export function clearTagsCache(): void {
  tagsCache = null;
  cacheTimestamp = 0;
}

/**
 * Check if cache is valid
 */
export function isCacheValid(): boolean {
  return tagsCache !== null && Date.now() - cacheTimestamp < CACHE_DURATION;
}

