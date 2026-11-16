export const EDGE_CACHE_TTL_SECONDS = 1800; // 30 minutes (matches RSS cron interval */30 * * * *)
export const PUBLIC_HTML_CACHE_CONTROL = "public, max-age=300, s-maxage=1800, stale-while-revalidate=1800";
export const HOME_BRIEFINGS_CACHE_KEY = "https://hy3n4.news/__cache/d1/blog/home-briefings/v4";

const MEMORY_CACHE_MAX_ENTRIES = 300;
const memoryCache = new Map<string, { expiresAt: number; data: any }>();

function setMemoryCache(key: string, data: any, ttlSeconds: number) {
  if (memoryCache.size >= MEMORY_CACHE_MAX_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, {
    expiresAt: Date.now() + ttlSeconds * 1000,
    data,
  });
}

export async function invalidateEdgeCache(cacheKeyUrl: string): Promise<void> {
  memoryCache.delete(cacheKeyUrl);
  const cache = typeof caches !== "undefined" ? caches.default : null;
  if (cache) {
    try {
      await cache.delete(new Request(cacheKeyUrl, { method: "GET" }));
    } catch (e) {
      console.warn("[CACHE] Edge cache delete failed:", e);
    }
  }
}

export async function withEdgeCache<T>(
  cacheKeyUrl: string,
  ttlSeconds: number,
  ctx: ExecutionContext | undefined,
  fetcher: () => Promise<T>
): Promise<T> {
  // 1. Check fast in-memory isolate cache first
  const memHit = memoryCache.get(cacheKeyUrl);
  if (memHit && Date.now() < memHit.expiresAt) {
    return memHit.data as T;
  }

  // 2. Check Cloudflare Edge Cache API
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cacheReq = new Request(cacheKeyUrl, { method: "GET" });

  if (cache) {
    try {
      const cachedRes = await cache.match(cacheReq);
      if (cachedRes) {
        const parsed = (await cachedRes.json()) as T;
        setMemoryCache(cacheKeyUrl, parsed, ttlSeconds);
        return parsed;
      }
    } catch (e) {
      console.warn("[CACHE] Edge cache read failed:", e);
    }
  }

  // 3. Cache miss: query D1
  const data = await fetcher();

  if (data !== null && data !== undefined) {
    setMemoryCache(cacheKeyUrl, data, ttlSeconds);

    if (cache) {
      const resToCache = new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}`,
        },
      });
      const putPromise = cache.put(cacheReq, resToCache).catch((e) => {
        console.warn("[CACHE] Edge cache write failed:", e);
      });
      if (ctx && typeof ctx.waitUntil === "function") {
        ctx.waitUntil(putPromise);
      }
    }
  }

  return data;
}
