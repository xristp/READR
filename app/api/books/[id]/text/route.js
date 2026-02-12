import { NextResponse } from 'next/server';

// ─── Server-side LRU cache for book text ───
// Avoids re-downloading full book text from Gutenberg on every reader visit.
const textCache = new Map();
const TEXT_CACHE_MAX = 20;
const TEXT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const META_FETCH_TIMEOUT_MS = 15000;  // Gutendex metadata
const TEXT_FETCH_TIMEOUT_MS = 60000;  // Full book text can be large/slow

async function fetchWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return res;
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

function getFromTextCache(id) {
    const entry = textCache.get(id);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > TEXT_CACHE_TTL) {
        textCache.delete(id);
        return null;
    }
    // Move to end (most recently used)
    textCache.delete(id);
    textCache.set(id, entry);
    return entry.text;
}

function addToTextCache(id, text) {
    if (textCache.size >= TEXT_CACHE_MAX) {
        const oldest = textCache.keys().next().value;
        textCache.delete(oldest);
    }
    textCache.set(id, { text, timestamp: Date.now() });
}

/**
 * API route to proxy book text from Project Gutenberg.
 * This avoids CORS issues when fetching plain text from gutenberg.org directly in the browser.
 */
export async function GET(request, { params }) {
    const { id } = await params;

    // Validate ID is a positive integer
    if (!/^\d+$/.test(id)) {
        return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 });
    }

    // Serve from server-side cache if available
    const cachedText = getFromTextCache(id);
    if (cachedText) {
        return new NextResponse(cachedText, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
                'X-Cache': 'HIT',
            },
        });
    }

    try {
        // Fetch book metadata first to get the text URL (with timeout)
        const metaRes = await fetchWithTimeout(
            `https://gutendex.com/books/${id}/`,
            META_FETCH_TIMEOUT_MS
        );
        if (!metaRes.ok) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 });
        }

        const book = await metaRes.json();

        // Find the best text format
        const textUrl =
            book.formats?.['text/plain; charset=utf-8'] ||
            book.formats?.['text/plain; charset=us-ascii'] ||
            book.formats?.['text/plain'];

        if (!textUrl) {
            return NextResponse.json(
                { error: 'No text format available for this book' },
                { status: 404 }
            );
        }

        // Fetch the actual text (with longer timeout; full book can be slow)
        const textRes = await fetchWithTimeout(textUrl, TEXT_FETCH_TIMEOUT_MS);
        if (!textRes.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch book text' },
                { status: 502 }
            );
        }

        const text = await textRes.text();

        // Cache for future requests
        addToTextCache(id, text);

        return new NextResponse(text, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
                'X-Cache': 'MISS',
            },
        });
    } catch (error) {
        console.error(`Error proxying text for book ${id}:`, error);
        const isTimeout = error?.name === 'AbortError';
        return NextResponse.json(
            { error: isTimeout ? 'Request timed out' : 'Internal server error' },
            { status: isTimeout ? 504 : 500 }
        );
    }
}
