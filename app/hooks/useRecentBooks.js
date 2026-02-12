'use client';

import { useState, useEffect, useRef } from 'react';
import { useRecentlyRead } from './useRecentlyRead';

/**
 * Module-level cache so Sidebar + ContinueReading share one API call
 * instead of firing duplicates for the same set of recently-read IDs.
 */
let _cache = { key: '', data: null, promise: null };

function fetchBooksByIds(ids) {
    const key = ids.join(',');

    // Already have data for this exact set of IDs
    if (_cache.key === key && _cache.data) {
        return Promise.resolve(_cache.data);
    }

    // In-flight request for same IDs — return existing promise
    if (_cache.key === key && _cache.promise) {
        return _cache.promise;
    }

    // New request
    _cache.key = key;
    _cache.data = null;
    _cache.promise = fetch(`https://gutendex.com/books/?ids=${key}`)
        .then((res) => {
            if (!res.ok) throw new Error(`API ${res.status}`);
            return res.json();
        })
        .then((json) => {
            _cache.data = json.results || [];
            _cache.promise = null;
            return _cache.data;
        })
        .catch((err) => {
            _cache.promise = null;
            throw err;
        });

    return _cache.promise;
}

/**
 * Returns recently-read books with a shared, deduplicated fetch.
 * Both Sidebar (limit 12) and ContinueReading (limit 6) call this —
 * the first to mount fires the request, the second gets a cached result.
 */
export function useRecentBooks(limit = 6) {
    const { recentIds, mounted } = useRecentlyRead(Math.max(limit, 12));
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const abortRef = useRef(false);

    useEffect(() => {
        abortRef.current = false;

        if (!mounted || recentIds.length === 0) {
            setLoading(false);
            return;
        }

        setLoading(true);
        fetchBooksByIds(recentIds)
            .then((results) => {
                if (abortRef.current) return;
                const sorted = recentIds
                    .map((id) => results.find((b) => b.id.toString() === id))
                    .filter(Boolean);
                setBooks(sorted);
            })
            .catch(() => {
                // silent
            })
            .finally(() => {
                if (!abortRef.current) setLoading(false);
            });

        return () => { abortRef.current = true; };
    }, [mounted, recentIds]);

    // Slice to the requested limit (sidebar wants 12, continue wants 6)
    return { books: books.slice(0, limit), loading, mounted };
}
