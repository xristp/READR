'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import BookCard from '@/app/components/BookCard';
import { BookCardSkeletonGrid } from '@/app/components/Skeleton';
import { FilterIcon, LoaderIcon } from '@/app/components/icons';
import { GENRES } from '@/app/lib/api';
import { getCachedData, fetchWithCache, setCachedData, prefetch } from '@/app/lib/apiCache';
import styles from './page.module.css';

const FETCH_TIMEOUT_MS = 15000; // 15s - some Gutendex topics are slow

/** Build the Gutendex URL for a browse page request */
function buildBrowseUrl(topic) {
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('sort', 'popular');
    if (topic) params.set('topic', topic);
    return `https://gutendex.com/books/?${params.toString()}`;
}

/** Create a fetch signal that aborts after timeout and/or when parent signal aborts. Returns { signal, cleanup }. */
function createTimeoutSignal(parentSignal) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const cleanup = () => {
        clearTimeout(timeoutId);
    };
    if (parentSignal) {
        if (parentSignal.aborted) {
            cleanup();
            controller.abort();
        } else {
            parentSignal.addEventListener('abort', () => {
                cleanup();
                controller.abort();
            });
        }
    }
    return { signal: controller.signal, cleanup };
}

export default function BrowseContent({ initialData, initialTopic = '' }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    // ─── Validate and normalize topic param ───
    // Only allow ONE topic at a time - get first valid topic or empty
    const rawTopic = searchParams.get('topic') || initialTopic || '';
    const topicParam = Array.isArray(rawTopic) ? rawTopic[0]?.trim() || '' : rawTopic.trim();
    
    // Validate topic exists in GENRES (prevent invalid URLs)
    const isValidTopic = !topicParam || GENRES.some(g => g.id === topicParam);
    const normalizedTopicParam = isValidTopic ? topicParam : '';
    
    // Track if this is a client-side filter change (not browser navigation)
    const isClientFilterChangeRef = useRef(false);
    
    // Track current fetch to abort on rapid topic changes
    const currentFetchControllerRef = useRef(null);
    
    // Debounce rapid clicks
    const clickTimeoutRef = useRef(null);

    // ─── Use server-fetched data if available, otherwise check cache ───
    const [books, setBooks] = useState(() => {
        // Check if initial data matches current topic
        const normalizedInitialTopic = (initialTopic || '').trim();
        if (initialData?.books && initialData.books.length > 0 && normalizedInitialTopic === normalizedTopicParam) {
            return initialData.books;
        }
        const data = getCachedData(buildBrowseUrl(normalizedTopicParam));
        return data?.results || [];
    });
    const [loading, setLoading] = useState(() => {
        // If we have matching initialData, we're already loaded
        const normalizedInitialTopic = (initialTopic || '').trim();
        if (initialData?.books && initialData.books.length > 0 && normalizedInitialTopic === normalizedTopicParam) {
            return false;
        }
        return !getCachedData(buildBrowseUrl(normalizedTopicParam));
    });
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(() => {
        const normalizedInitialTopic = (initialTopic || '').trim();
        if (initialData && normalizedInitialTopic === normalizedTopicParam) {
            return initialData.hasMore ?? true;
        }
        return true;
    });
    const [activeTopic, setActiveTopic] = useState(normalizedTopicParam);
    const [error, setError] = useState(false);

    const fetchBooks = useCallback(async (pageNum, topic, append = false, signal = null) => {
        // Normalize topic to empty string if falsy
        const normalizedTopic = (topic || '').trim();
        
        // Check if already aborted
        if (signal?.aborted) return;
        
        if (pageNum === 1 && !append) {
            // Only show loading skeleton when we don't have cached data
            const url = buildBrowseUrl(normalizedTopic);
            const cached = getCachedData(url);
            if (!cached) {
                setLoading(true);
                setError(false);
            }
        } else if (pageNum > 1) {
            setLoadingMore(true);
        }

        try {
            const params = new URLSearchParams();
            params.set('page', pageNum.toString());
            params.set('sort', 'popular');
            if (normalizedTopic) params.set('topic', normalizedTopic);
            const url = `https://gutendex.com/books/?${params.toString()}`;

            let data;
            if (pageNum === 1) {
                // Check cache first (synchronous, instant)
                const cached = getCachedData(url);
                if (cached) {
                    if (signal?.aborted) return;
                    const results = cached.results || [];
                    if (append) {
                        setBooks((prev) => [...prev, ...results]);
                    } else {
                        setBooks(results);
                    }
                    setHasMore(!!cached.next);
                    setError(false);
                    setLoading(false);
                    return;
                }
                
                // No cache - fetch with timeout + cancellation
                const { signal: timeoutSignal, cleanup: timeoutCleanup } = createTimeoutSignal(signal);
                try {
                    const res = await fetch(url, { signal: timeoutSignal });
                    if (signal?.aborted) return;
                    if (!res.ok) throw new Error(`API error: ${res.status}`);
                    data = await res.json();
                    if (data && !signal?.aborted) setCachedData(url, data);
                } finally {
                    timeoutCleanup();
                }
            } else {
                // Pagination → direct fetch (each page is unique)
                const { signal: timeoutSignal, cleanup: timeoutCleanup } = createTimeoutSignal(signal);
                try {
                    const res = await fetch(url, { signal: timeoutSignal });
                    if (signal?.aborted) return;
                    if (!res.ok) throw new Error(`API error: ${res.status}`);
                    data = await res.json();
                } finally {
                    timeoutCleanup();
                }
            }

            if (signal?.aborted) return;

            const results = data.results || [];
            if (append) {
                setBooks((prev) => [...prev, ...results]);
            } else {
                setBooks(results);
            }
            setHasMore(!!data.next);
            setError(false);
        } catch (err) {
            if (err.name === 'AbortError' || signal?.aborted) return;
            console.error('Error fetching books:', err);
            if (!append) {
                setError(true);
                setBooks([]);
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
                setLoadingMore(false);
            }
        }
    }, []);

    // ─── Clean up URL on mount if invalid/multiple topics ───
    useEffect(() => {
        // If URL has invalid topic, clean it up
        if (!isValidTopic && topicParam) {
            const cleanUrl = '/browse';
            window.history.replaceState({ ...window.history.state }, '', cleanUrl);
            setActiveTopic('');
            
            // Check cache first for "all books"
            const url = buildBrowseUrl('');
            const cached = getCachedData(url);
            if (cached && cached.results && cached.results.length > 0) {
                setBooks(cached.results);
                setHasMore(!!cached.next);
                setLoading(false);
                return;
            }
            
            // Fetch all books (no filter) if not cached
            const controller = new AbortController();
            currentFetchControllerRef.current = controller;
            fetchBooks(1, '', false, controller.signal).finally(() => {
                if (currentFetchControllerRef.current === controller) {
                    currentFetchControllerRef.current = null;
                }
            });
            return () => {
                controller.abort();
                if (currentFetchControllerRef.current === controller) {
                    currentFetchControllerRef.current = null;
                }
            };
        }
        
        // Ensure URL matches normalized topic (clean up if needed)
        if (normalizedTopicParam !== topicParam && isValidTopic) {
            const params = new URLSearchParams();
            if (normalizedTopicParam) {
                params.set('topic', normalizedTopicParam);
            }
            const cleanUrl = `/browse${normalizedTopicParam ? `?${params.toString()}` : ''}`;
            window.history.replaceState({ ...window.history.state }, '', cleanUrl);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    // ─── Populate cache with server data ───
    useEffect(() => {
        const normalizedInitialTopic = (initialTopic || '').trim();
        
        // Only cache if initial data matches current topic
        if (initialData?.books && initialData.books.length > 0 && normalizedInitialTopic === normalizedTopicParam) {
            const url = buildBrowseUrl(normalizedInitialTopic);
            const cached = getCachedData(url);
            if (!cached) {
                // Cache the server data for future navigations
                const fullData = {
                    results: initialData.books,
                    next: initialData.next,
                    count: initialData.count || initialData.books.length,
                };
                setCachedData(url, fullData);
            }
        }
    }, [initialData, initialTopic, normalizedTopicParam]);

    // ─── Smart prefetching: only prefetch "all books" (most important) ───
    useEffect(() => {
        // Only prefetch "all books" (empty topic) - most common use case
        // Use requestIdleCallback if available for non-blocking prefetch
        const prefetchAllBooks = () => {
            const allBooksUrl = buildBrowseUrl('');
            if (!getCachedData(allBooksUrl)) {
                prefetch(allBooksUrl);
            }
        };
        
        // Use requestIdleCallback to avoid blocking main thread
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            requestIdleCallback(prefetchAllBooks, { timeout: 2000 });
        } else {
            // Fallback: delay prefetch slightly
            setTimeout(prefetchAllBooks, 500);
        }
    }, []); // Only run once on mount

    // ─── Handle URL parameter changes (only for browser back/forward or direct navigation) ───
    useEffect(() => {
        // Skip if this is a client-side filter change (handled in handleTopicClick)
        if (isClientFilterChangeRef.current) {
            return;
        }
        
        const normalizedInitialTopic = (initialTopic || '').trim();
        const normalizedActiveTopic = (activeTopic || '').trim();
        
        // Skip if activeTopic already matches normalizedTopicParam
        if (normalizedActiveTopic === normalizedTopicParam) {
            // Still check if we need to sync with initial data on first load
            if (initialData?.books && initialData.books.length > 0 && normalizedInitialTopic === normalizedTopicParam) {
                // Use initial data if it matches and we don't have books yet
                if (books.length === 0 || books[0]?.id !== initialData.books[0]?.id) {
                    setBooks(initialData.books);
                    setHasMore(initialData.hasMore ?? true);
                    setLoading(false);
                }
            }
            return;
        }
        
        // Skip if this is the initial load with matching server data
        if (initialData?.books && initialData.books.length > 0 && normalizedInitialTopic === normalizedTopicParam) {
            // Sync state with initial data
            setActiveTopic(normalizedTopicParam);
            setBooks(initialData.books);
            setHasMore(initialData.hasMore ?? true);
            setLoading(false);
            return;
        }

        // URL changed via browser navigation (back/forward) - fetch new data
        // Check cache first
        const url = buildBrowseUrl(normalizedTopicParam);
        const cached = getCachedData(url);
        if (cached && cached.results && cached.results.length > 0) {
            setActiveTopic(normalizedTopicParam);
            setBooks(cached.results);
            setHasMore(!!cached.next);
            setPage(1);
            setLoading(false);
            setError(false);
            return;
        }

        // No cache - fetch from server
        // Abort any previous fetch
        if (currentFetchControllerRef.current) {
            currentFetchControllerRef.current.abort();
        }
        
        const controller = new AbortController();
        currentFetchControllerRef.current = controller;
        
        setPage(1);
        setActiveTopic(normalizedTopicParam);
        setHasMore(true);
        setError(false);
        setLoading(true);
        fetchBooks(1, normalizedTopicParam, false, controller.signal).finally(() => {
            if (currentFetchControllerRef.current === controller) {
                currentFetchControllerRef.current = null;
            }
        });
        
        return () => {
            controller.abort();
            if (currentFetchControllerRef.current === controller) {
                currentFetchControllerRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [normalizedTopicParam]); // Use normalizedTopicParam instead of topicParam

    const loadMore = useCallback(() => {
        if (loadingMore || !hasMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchBooks(nextPage, activeTopic, true);
    }, [loadingMore, hasMore, page, activeTopic, fetchBooks]);

    const handleTopicClick = useCallback((topic) => {
        // Clear any pending debounce
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
        }
        
        // Abort any in-flight request immediately
        if (currentFetchControllerRef.current) {
            currentFetchControllerRef.current.abort();
            currentFetchControllerRef.current = null;
        }
        
        // Normalize topic - ensure it's a valid genre
        const normalizedTopic = (topic || '').trim();
        const isValidGenre = !normalizedTopic || GENRES.some(g => g.id === normalizedTopic);
        
        if (!isValidGenre && normalizedTopic) {
            console.warn(`Invalid topic: ${normalizedTopic}`);
            return;
        }
        
        // Single-select behavior: if clicking the same topic, clear filter
        // Otherwise, set the new topic (replaces any existing filter)
        const normalizedActiveTopic = (activeTopic || '').trim();
        const newTopic = normalizedTopic === normalizedActiveTopic ? '' : normalizedTopic;
        
        // Prevent duplicate clicks (already showing this topic)
        if (normalizedActiveTopic === newTopic) {
            return;
        }
        
        // Mark as client-side filter change to prevent useEffect from running
        isClientFilterChangeRef.current = true;
        
        // Optimistically update state immediately for instant UI feedback
        setActiveTopic(newTopic);
        setPage(1);
        setError(false);
        
        // Update URL immediately (single topic only, clean URL)
        const cleanUrl = `/browse${newTopic ? `?topic=${encodeURIComponent(newTopic)}` : ''}`;
        window.history.replaceState({ ...window.history.state }, '', cleanUrl);
        
        // Check cache first for instant display
        const url = buildBrowseUrl(newTopic);
        const cached = getCachedData(url);
        if (cached && cached.results && cached.results.length > 0) {
            // Use cached data immediately - instant display!
            setBooks(cached.results);
            setHasMore(!!cached.next);
            setLoading(false);
            
            // Reset flag after a tick
            setTimeout(() => { isClientFilterChangeRef.current = false; }, 0);
            return; // Early return - no need to fetch
        }
        
        // No cache - fetch immediately (client-side only)
        setLoading(true);
        setBooks([]); // Clear current books
        
        // Create new abort controller for this request
        const controller = new AbortController();
        currentFetchControllerRef.current = controller;
        
        // Fetch immediately without waiting for useEffect
        fetchBooks(1, newTopic, false, controller.signal).finally(() => {
            // Clear controller reference
            if (currentFetchControllerRef.current === controller) {
                currentFetchControllerRef.current = null;
            }
            // Reset flag after fetch completes
            setTimeout(() => { isClientFilterChangeRef.current = false; }, 0);
        });
    }, [activeTopic, fetchBooks]);

    // Infinite scroll — use refs to avoid stale closure
    const loadingMoreRef = useRef(loadingMore);
    const hasMoreRef = useRef(hasMore);
    const loadingRef = useRef(loading);
    const pageRef = useRef(page);
    const activeTopicRef = useRef(activeTopic);

    loadingMoreRef.current = loadingMore;
    hasMoreRef.current = hasMore;
    loadingRef.current = loading;
    pageRef.current = page;
    activeTopicRef.current = activeTopic;

    useEffect(() => {
        let ticking = false;
        let scrollController = new AbortController();
        
        const handleScroll = () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(() => {
                    if (
                        window.innerHeight + window.scrollY >= document.body.offsetHeight - 800 &&
                        !loadingMoreRef.current &&
                        hasMoreRef.current &&
                        !loadingRef.current
                    ) {
                        const nextPage = pageRef.current + 1;
                        const currentTopic = activeTopicRef.current;
                        
                        // Abort previous request if still pending
                        scrollController.abort();
                        scrollController = new AbortController();
                        
                        setPage(nextPage);
                        // Use refs to get current values, fetchBooks is stable
                        fetchBooks(nextPage, currentTopic, true, scrollController.signal);
                    }
                    ticking = false;
                });
            }
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            scrollController.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - using refs for all values, fetchBooks is stable

    // ─── Cleanup on unmount ───
    useEffect(() => {
        return () => {
            // Abort any pending requests on unmount
            if (currentFetchControllerRef.current) {
                currentFetchControllerRef.current.abort();
                currentFetchControllerRef.current = null;
            }
            // Clear any pending timeouts
            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
            }
        };
    }, []);

    return (
        <>
            <motion.div
                className={styles.header}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className={styles.title}>Browse Books</h1>
                <p className={styles.subtitle}>
                    Explore the world&apos;s greatest literature — all free, all public domain
                </p>
            </motion.div>

            {/* Topic Filters */}
            <div className={styles.filters}>
                <FilterIcon size={18} className={styles.filterIcon} />
                <div className={styles.filterList}>
                    {GENRES.map((genre) => {
                        const isActive = (activeTopic || '').trim() === (genre.id || '').trim();
                        return (
                            <button
                                key={genre.id}
                                type="button"
                                role="radio"
                                aria-checked={isActive}
                                aria-label={`Filter by ${genre.label}`}
                                className={`${styles.filterChip} ${isActive ? styles.filterActive : ''}`}
                                onClick={() => handleTopicClick(genre.id)}
                                onMouseEnter={() => {
                                    // Prefetch on hover for instant filter switching (debounced)
                                    if (!isActive) {
                                        // Clear any pending prefetch
                                        if (clickTimeoutRef.current) {
                                            clearTimeout(clickTimeoutRef.current);
                                        }
                                        // Debounce prefetch to avoid rapid hover spam
                                        clickTimeoutRef.current = setTimeout(() => {
                                            prefetch(buildBrowseUrl(genre.id));
                                            clickTimeoutRef.current = null;
                                        }, 150);
                                    }
                                }}
                                onMouseLeave={() => {
                                    // Cancel prefetch if mouse leaves before timeout
                                    if (clickTimeoutRef.current) {
                                        clearTimeout(clickTimeoutRef.current);
                                        clickTimeoutRef.current = null;
                                    }
                                }}
                            >
                                {genre.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Book Grid */}
            <div className={styles.bookGrid}>
                {loading ? (
                    <BookCardSkeletonGrid count={20} />
                ) : error ? (
                    <div style={{
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        padding: 'var(--space-10) 0',
                    }}>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                            Failed to load books. Please try again.
                        </p>
                        <button
                            onClick={() => {
                                setError(false);
                                setPage(1);
                                fetchBooks(1, activeTopic, false);
                            }}
                            style={{
                                padding: 'var(--space-2) var(--space-6)',
                                fontSize: 'var(--text-sm)',
                                fontWeight: 'var(--weight-medium)',
                                color: 'var(--color-accent)',
                                background: 'var(--color-accent-light)',
                                border: '1px solid var(--color-accent)',
                                borderRadius: 'var(--radius-full)',
                                cursor: 'pointer',
                            }}
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    books.map((book, i) => (
                        <BookCard key={`${book.id}-${i}`} book={book} index={i % 20} />
                    ))
                )}
            </div>

            {/* Load More */}
            {loadingMore && (
                <div className={styles.loadingMore}>
                    <LoaderIcon size={24} />
                    <span>Loading more books...</span>
                </div>
            )}

            {!loading && !hasMore && books.length > 0 && (
                <p className={styles.endMessage}>
                    You&apos;ve explored all available books in this category.
                </p>
            )}
        </>
    );
}
