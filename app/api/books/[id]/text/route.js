import { NextResponse } from 'next/server';

// ─── Edge Runtime ───
// Runs at Vercel's edge network: no cold starts, 30s timeout on all plans,
// and Vercel's CDN caches responses via Cache-Control headers.
export const runtime = 'edge';

const META_FETCH_TIMEOUT_MS = 8000;   // Gutendex metadata
const TEXT_FETCH_TIMEOUT_MS = 25000;  // Full book text — fits within 30s edge limit

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

/**
 * API route to proxy book text from Project Gutenberg.
 * This avoids CORS issues when fetching plain text from gutenberg.org directly.
 *
 * On Vercel, each invocation is stateless — we rely on Cache-Control headers
 * and Vercel's CDN edge cache instead of an in-memory cache.
 */
export async function GET(request, { params }) {
    const { id } = await params;

    // Validate ID is a positive integer
    if (!/^\d+$/.test(id)) {
        return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 });
    }

    try {
        // Fetch book metadata first to get the text URL
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

        // Fetch the actual text
        const textRes = await fetchWithTimeout(textUrl, TEXT_FETCH_TIMEOUT_MS);
        if (!textRes.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch book text' },
                { status: 502 }
            );
        }

        const text = await textRes.text();

        return new NextResponse(text, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                // Vercel CDN caches at the edge for 24h,
                // serves stale content for up to 7 days while revalidating
                'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
            },
        });
    } catch (error) {
        console.error(`Error proxying text for book ${id}:`, error);
        const isTimeout = error?.name === 'AbortError';
        return NextResponse.json(
            { error: isTimeout ? 'Request timed out — please try again' : 'Internal server error' },
            { status: isTimeout ? 504 : 500 }
        );
    }
}
