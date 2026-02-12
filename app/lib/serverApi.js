/**
 * Server-side API utilities for Next.js Server Components
 * These functions run on the server and can be used in Server Components
 */

const GUTENDEX_BASE = 'https://gutendex.com';
const REQUEST_TIMEOUT_MS = 15000; // 15s - Gutendex can be slow for some topics
const RETRY_DELAY_MS = 1500;

/**
 * Fetch with timeout and abort support (server-side)
 */
async function fetchWithTimeout(url, options = {}) {
    const { timeout = REQUEST_TIMEOUT_MS, ...fetchOptions } = options;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return res;
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

/**
 * Fetch books from Gutendex API (server-side)
 * Uses timeout + single retry to handle slow/unreliable category responses
 */
export async function getBooksServer({ page = 1, search = '', topic = '', sort = 'popular' } = {}) {
    const params = new URLSearchParams();
    params.set('page', page.toString());

    if (search) params.set('search', search);
    if (topic) params.set('topic', topic.trim());

    if (sort === 'popular') {
        params.set('sort', 'popular');
    }

    const url = `${GUTENDEX_BASE}/books/?${params.toString()}`;

    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            if (attempt > 0) {
                await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            }

            const res = await fetchWithTimeout(url, {
                timeout: REQUEST_TIMEOUT_MS,
                next: { revalidate: 3600 },
            });

            if (!res.ok) {
                throw new Error(`Failed to fetch books: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            lastError = error;
            const isTimeout = error.name === 'AbortError';
            const is5xx = error.message?.includes('50') || error.message?.includes('503');
            if (!isTimeout && !is5xx) break; // Don't retry client errors
        }
    }

    console.error('Error fetching books (topic=%s):', topic, lastError);
    return { results: [], next: null, count: 0 };
}

/**
 * Fetch multiple book collections in parallel (server-side)
 * Returns an array of results in the same order as requests
 * Uses Promise.allSettled to handle partial failures gracefully
 */
export async function getBooksParallel(requests) {
    const promises = requests.map(({ page = 1, search = '', topic = '', sort = 'popular' }) =>
        getBooksServer({ page, search, topic, sort })
    );

    try {
        // Fetch all requests in parallel - Next.js will deduplicate identical requests
        const results = await Promise.allSettled(promises);
        
        // Map results, handling failures gracefully
        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                console.error(`Error fetching books for request ${index}:`, result.reason);
                return { results: [], next: null, count: 0 };
            }
        });
    } catch (error) {
        console.error('Error in parallel fetch:', error);
        // Return empty results for all requests
        return requests.map(() => ({ results: [], next: null, count: 0 }));
    }
}
