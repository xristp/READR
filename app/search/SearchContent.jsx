'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BookCard from '@/app/components/BookCard';
import { LoaderIcon } from '@/app/components/icons';
import { fetchWithCache, setCachedData, getCachedData } from '@/app/lib/apiCache';
import styles from './page.module.css';

export default function SearchContent({ initialData, initialQuery = '' }) {
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || initialQuery;

    // ─── Use server-fetched data if available, otherwise start empty ───
    const [results, setResults] = useState(() => {
        if (initialData?.results && initialData.results.length > 0) {
            return initialData.results;
        }
        return [];
    });
    const [loading, setLoading] = useState(() => {
        // If we have initialData, we're already loaded
        if (initialData?.results && initialData.results.length > 0) return false;
        return false; // Start with false, will be set to true when searching
    });
    const [searched, setSearched] = useState(() => {
        // If we have initialData, we've already searched
        return !!(initialData && initialQuery.trim());
    });
    const [error, setError] = useState(false);
    const searchVersion = useRef(0);

    const doSearch = useCallback(async (q, version) => {
        if (!q.trim()) {
            setResults([]);
            setSearched(false);
            return;
        }

        setLoading(true);
        setSearched(true);

        try {
            const url = `https://gutendex.com/books/?search=${encodeURIComponent(q.trim())}`;
            const data = await fetchWithCache(url);
            if (searchVersion.current !== version) return;
            setResults(data.results || []);
            setError(false);
        } catch (err) {
            if (searchVersion.current !== version) return;
            console.error('Search error:', err);
            setResults([]);
            setError(true);
        } finally {
            if (searchVersion.current === version) setLoading(false);
        }
    }, []);

    // ─── Populate cache with server data ───
    useEffect(() => {
        if (initialData?.results && initialData.results.length > 0 && initialQuery.trim()) {
            const url = `https://gutendex.com/books/?search=${encodeURIComponent(initialQuery.trim())}`;
            const cached = getCachedData(url);
            if (!cached) {
                // Cache the server data for future navigations
                // Structure matches API response: { results, next, count }
                setCachedData(url, {
                    results: initialData.results,
                    next: initialData.next,
                    count: initialData.count || initialData.results.length,
                });
            }
        }
    }, [initialData, initialQuery]);

    // ─── Handle search query changes (client-side navigation) ───
    useEffect(() => {
        // Skip if this is the initial load with server data
        if (initialData?.results && initialData.results.length > 0 && query === initialQuery) {
            return;
        }

        if (!query.trim()) {
            setResults([]);
            setSearched(false);
            setLoading(false);
            return;
        }
        const version = ++searchVersion.current;
        const timer = setTimeout(() => doSearch(query, version), 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]); // Only re-search if query changes (doSearch is stable)

    return (
        <div className={styles.page}>
            {/* Loading */}
            {loading && results.length === 0 && (
                <div className={styles.loadingState}>
                    <LoaderIcon size={32} />
                    <p>Searching...</p>
                </div>
            )}

            {/* Error */}
            {!loading && searched && error && (
                <div className={styles.emptyState}>
                    <p className={styles.emptyTitle}>Search failed</p>
                    <p className={styles.emptyText}>We couldn&apos;t reach the server. Please try again.</p>
                    <button
                        onClick={() => {
                            const version = ++searchVersion.current;
                            doSearch(query, version);
                        }}
                        className={styles.browseLink}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                    >
                        Retry search
                    </button>
                </div>
            )}

            {/* No results */}
            {!loading && searched && !error && results.length === 0 && (
                <div className={styles.emptyState}>
                    <p className={styles.emptyTitle}>No books found</p>
                    <p className={styles.emptyText}>Try a different search term or browse our collection</p>
                    <Link href="/browse" className={styles.browseLink}>
                        Browse all books
                    </Link>
                </div>
            )}

            {/* Results grid */}
            {results.length > 0 && (
                <div className={styles.results}>
                    <p className={styles.resultCount}>
                        {results.length} result{results.length !== 1 ? 's' : ''} found
                    </p>
                    <div className={styles.bookGrid}>
                        {results.map((book, i) => (
                            <BookCard key={book.id} book={book} index={i} />
                        ))}
                    </div>
                </div>
            )}

            {/* Suggestions (no query) */}
            {!searched && (
                <div className={styles.suggestions}>
                    <p className={styles.suggestionsTitle}>Popular searches</p>
                    <div className={styles.suggestionTags}>
                        {['Shakespeare', 'Jane Austen', 'Charles Dickens', 'Mark Twain', 'Science Fiction', 'Poetry', 'Philosophy', 'Adventure'].map(
                            (tag) => (
                                <Link
                                    key={tag}
                                    href={`/search?q=${encodeURIComponent(tag)}`}
                                    className={styles.suggestionTag}
                                >
                                    {tag}
                                </Link>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
