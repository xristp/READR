'use client';

import { useEffect, useState, useRef, useCallback, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon, BookIcon } from '@/app/components/icons';
import { getBookCoverUrl, formatAuthorName } from '@/app/lib/api';
import { getCachedData, fetchWithCache, setCachedData } from '@/app/lib/apiCache';
import styles from './ScrollRow.module.css';

const ScrollRowCard = memo(function ScrollRowCard({ book }) {
    const coverUrl = getBookCoverUrl(book);
    const author = book.authors?.[0];
    const authorName = formatAuthorName(author);

    return (
        <Link href={`/book/${book.id}`} className={styles.card}>
            <div className={styles.coverWrapper}>
                {coverUrl ? (
                    <Image
                        src={coverUrl}
                        alt={`Cover of ${book.title}`}
                        fill
                        sizes="160px"
                        className={styles.coverImage}
                        loading="lazy"
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                    />
                ) : (
                    <div className={styles.coverPlaceholder}>
                        <BookIcon size={24} />
                    </div>
                )}
                <div className={styles.coverOverlay} />
                <div className={styles.playIndicator} aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4 2.5v11a.5.5 0 0 0 .77.42l8.5-5.5a.5.5 0 0 0 0-.84l-8.5-5.5A.5.5 0 0 0 4 2.5z" />
                    </svg>
                </div>
            </div>
            <span className={styles.cardTitle}>{book.title}</span>
            <span className={styles.cardAuthor}>{authorName}</span>
        </Link>
    );
});

function ScrollRowSkeleton({ count = 8 }) {
    return (
        <>
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className={styles.skeletonCard}>
                    <div className={styles.skeletonCover} />
                    <div className={styles.skeletonTitle} />
                    <div className={styles.skeletonAuthor} />
                </div>
            ))}
        </>
    );
}

export default function ScrollRow({ title, fetchUrl, seeAllHref, initialBooks }) {
    // ─── Use initialBooks if provided (from server-side fetch), otherwise check cache ───
    const [books, setBooks] = useState(() => {
        if (initialBooks && initialBooks.length > 0) {
            return initialBooks;
        }
        const d = getCachedData(fetchUrl);
        return d?.results?.slice(0, 20) || [];
    });
    // ─── If we have initialBooks, we're already loaded ───
    const [loading, setLoading] = useState(() => {
        if (initialBooks && initialBooks.length > 0) return false;
        return !getCachedData(fetchUrl);
    });
    const scrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // ─── Only fetch if we don't have initialBooks (client-side navigation) ───
    useEffect(() => {
        // Skip fetch if we already have initialBooks from server
        if (initialBooks && initialBooks.length > 0) {
            // Populate cache with server data for future navigations
            const d = getCachedData(fetchUrl);
            if (!d) {
                // Reconstruct full API response structure for cache
                const fullData = {
                    results: initialBooks,
                    next: null, // We only have first 20 books
                    count: initialBooks.length,
                };
                setCachedData(fetchUrl, fullData);
            }
            return;
        }

        let mounted = true;
        fetchWithCache(fetchUrl)
            .then((data) => {
                if (mounted) setBooks(data.results?.slice(0, 20) || []);
            })
            .catch((err) => {
                if (mounted) console.error(`Error fetching ${title}:`, err);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => { mounted = false; };
    }, [fetchUrl, title, initialBooks]);

    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener('scroll', checkScroll, { passive: true });
        checkScroll();
        const t = setTimeout(checkScroll, 600);
        return () => {
            el.removeEventListener('scroll', checkScroll);
            clearTimeout(t);
        };
    }, [checkScroll, loading]);

    const scroll = (dir) => {
        const el = scrollRef.current;
        if (!el) return;
        const amount = el.clientWidth * 0.75;
        el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
    };

    if (!loading && books.length === 0) return null;

    return (
        <section className={styles.section}>
            <div className={styles.header}>
                <h2 className={styles.title}>{title}</h2>
                {seeAllHref && (
                    <Link href={seeAllHref} className={styles.seeAll}>
                        Show all
                    </Link>
                )}
            </div>

            <div className={styles.scrollContainer}>
                <button
                    className={`${styles.scrollButton} ${styles.scrollLeft}`}
                    onClick={() => scroll('left')}
                    aria-label="Scroll left"
                    data-visible={canScrollLeft}
                >
                    <ChevronLeftIcon size={20} />
                </button>

                <div className={styles.scrollTrack} ref={scrollRef}>
                    {loading ? (
                        <ScrollRowSkeleton />
                    ) : (
                        books.map((book) => (
                            <ScrollRowCard key={book.id} book={book} />
                        ))
                    )}
                </div>

                <button
                    className={`${styles.scrollButton} ${styles.scrollRight}`}
                    onClick={() => scroll('right')}
                    aria-label="Scroll right"
                    data-visible={canScrollRight}
                >
                    <ChevronRightIcon size={20} />
                </button>
            </div>
        </section>
    );
}
