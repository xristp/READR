/**
 * High-performance in-memory cache for API requests.
 *
 * Key features vs the old implementation:
 * - URL normalisation  → Home & Browse share one cache entry for the same topic
 * - Synchronous reads  → components init state from cache, zero skeleton flash
 * - Direct data return → no double JSON serialisation (stringify → parse) on hits
 * - Safe dedup         → returns parsed data, not a Response whose body can only
 *                        be consumed once
 * - Prefetch helper    → lets the Sidebar warm the cache on hover
 */

const cache = new Map();
const pendingRequests = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const FETCH_TIMEOUT_MS = 15000; // 15s - prevent slow categories from hanging

/**
 * Normalise a URL so that equivalent requests share one cache entry.
 *  • ensures trailing slash on pathname  (/books → /books/)
 *  • drops page=1 (it's the API default)
 *  • sorts query-params alphabetically
 */
function normalizeUrl(url) {
    try {
        const u = new URL(url);
        if (!u.pathname.endsWith('/')) u.pathname += '/';
        if (u.searchParams.get('page') === '1') u.searchParams.delete('page');
        u.searchParams.sort();
        return u.toString();
    } catch {
        return url;
    }
}

function isExpired(entry) {
    return Date.now() - entry.timestamp > CACHE_TTL;
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Synchronous cache read.
 * Call inside a useState() initialiser to avoid the loading→data flash
 * when navigating back to a page whose data is already cached.
 */
export function getCachedData(url) {
    const key = normalizeUrl(url);
    const entry = cache.get(key);
    if (entry && !isExpired(entry)) return entry.data;
    return null;
}

/**
 * Fetch with caching — returns **parsed JSON data** directly.
 * Deduplicates in-flight requests to the same normalised URL.
 */
export async function fetchWithCache(url) {
    const key = normalizeUrl(url);

    // Fresh cache hit → instant return (no network, no serialisation)
    const entry = cache.get(key);
    if (entry && !isExpired(entry)) return entry.data;

    // Coalesce with an already in-flight request for the same URL
    if (pendingRequests.has(key)) return pendingRequests.get(key);

    // Fetch with timeout + single retry (gutendex can be slow/503 for some topics)
    const promise = (async () => {
        let lastError;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                if (attempt > 0) await new Promise((r) => setTimeout(r, 1200));
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (!res.ok) throw new Error(`API error: ${res.status}`);
                const data = await res.json();
                cache.set(key, { data, timestamp: Date.now() });
                pendingRequests.delete(key);
                return data;
            } catch (err) {
                lastError = err;
            }
        }
        pendingRequests.delete(key);
        throw lastError;
    })();

    pendingRequests.set(key, promise);
    return promise;
}

/**
 * Legacy wrapper — returns a Response object for backward compatibility.
 * @deprecated Prefer fetchWithCache() which returns data directly.
 */
export async function cachedFetch(url, options = {}) {
    const data = await fetchWithCache(url);
    return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

/**
 * Fire-and-forget: warm the cache for a URL without blocking the caller.
 * Uses low priority to avoid blocking critical requests.
 */
export function prefetch(url) {
    const key = normalizeUrl(url);
    if (cache.has(key) && !isExpired(cache.get(key))) return;
    if (pendingRequests.has(key)) return;
    
    // Use requestIdleCallback if available for non-blocking prefetch
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(() => {
            fetchWithCache(url).catch(() => {});
        }, { timeout: 1000 });
    } else {
        // Fallback: use setTimeout with small delay
        setTimeout(() => {
            fetchWithCache(url).catch(() => {});
        }, 0);
    }
}

/**
 * Populate cache with server-fetched data.
 * Use this to hydrate the client cache with data fetched on the server.
 */
export function setCachedData(url, data) {
    if (typeof window === 'undefined') return; // Only works on client
    const key = normalizeUrl(url);
    cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache() {
    for (const [key, entry] of cache.entries()) {
        if (isExpired(entry)) cache.delete(key);
    }
}

/**
 * Clear all cache
 */
export function clearCache() {
    cache.clear();
    pendingRequests.clear();
}

// Clean up expired cache every minute
if (typeof window !== 'undefined') {
    setInterval(clearExpiredCache, 60 * 1000);
}
