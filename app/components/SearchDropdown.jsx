'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LoaderIcon } from '@/app/components/icons';
import { getBookCoverUrl, formatAuthorName } from '@/app/lib/api';
import { getCachedData, setCachedData } from '@/app/lib/apiCache';
import styles from './SearchDropdown.module.css';

const PREVIEW_LIMIT = 6;
const DEBOUNCE_MS = 320;
const SEARCH_TIMEOUT_MS = 12000;

function buildSearchUrl(q, page = 1) {
    const params = new URLSearchParams();
    params.set('search', q.trim());
    params.set('page', page.toString());
    params.set('sort', 'popular');
    return `https://gutendex.com/books/?${params.toString()}`;
}

const SUGGESTIONS = [
    'Shakespeare', 'Jane Austen', 'Charles Dickens', 'Mark Twain',
    'Science Fiction', 'Poetry', 'Philosophy', 'Adventure',
];

function SearchDropdownRow({ book, onSelect }) {
    const coverUrl = getBookCoverUrl(book);
    const author = book.authors?.[0];
    const authorName = formatAuthorName(author);

    return (
        <Link
            href={`/book/${book.id}`}
            className={styles.row}
            onClick={onSelect}
        >
            <div className={styles.rowCover}>
                {coverUrl ? (
                    <Image
                        src={coverUrl}
                        alt=""
                        fill
                        sizes="48px"
                        className={styles.rowCoverImage}
                    />
                ) : (
                    <div className={styles.rowCoverPlaceholder}>{book.title?.slice(0, 1) || '?'}</div>
                )}
            </div>
            <div className={styles.rowInfo}>
                <span className={styles.rowTitle}>{book.title}</span>
                <span className={styles.rowAuthor}>{authorName}</span>
            </div>
        </Link>
    );
}

export default function SearchDropdown({ open, onClose, searchValue, setSearchValue, inputRef, anchorRef }) {
    const router = useRouter();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [anchorRect, setAnchorRect] = useState(null);
    const debounceRef = useRef(null);
    const versionRef = useRef(0);
    const panelRef = useRef(null);

    // Position dropdown to match search pill width (anchorRef = pill wrapper)
    useEffect(() => {
        const el = anchorRef?.current || inputRef?.current;
        if (!open || !el) {
            setAnchorRect(null);
            return;
        }
        const updateRect = () => {
            const target = anchorRef?.current || inputRef?.current;
            if (target) setAnchorRect(target.getBoundingClientRect());
        };
        updateRect();
        window.addEventListener('scroll', updateRect, true);
        window.addEventListener('resize', updateRect);
        return () => {
            window.removeEventListener('scroll', updateRect, true);
            window.removeEventListener('resize', updateRect);
        };
    }, [open, anchorRef, inputRef]);

    const runSearch = useCallback(async (q) => {
        if (!q.trim()) {
            setResults([]);
            setError(false);
            return;
        }
        const v = ++versionRef.current;
        const url = buildSearchUrl(q);
        const cached = getCachedData(url);
        if (cached?.results?.length) {
            setResults((cached.results || []).slice(0, PREVIEW_LIMIT));
            setError(false);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(false);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (v !== versionRef.current) return;
            if (!res.ok) throw new Error(res.status);
            const data = await res.json();
            const list = (data.results || []).slice(0, PREVIEW_LIMIT);
            setResults(list);
            setCachedData(url, { ...data, results: data.results || [] });
            setError(false);
        } catch (e) {
            if (v !== versionRef.current) return;
            setResults([]);
            setError(e.name === 'AbortError' || !String(e).includes('status'));
        } finally {
            if (v === versionRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!searchValue.trim()) {
            setResults([]);
            setLoading(false);
            setError(false);
            return;
        }
        debounceRef.current = setTimeout(() => runSearch(searchValue), DEBOUNCE_MS);
        return () => { clearTimeout(debounceRef.current); };
    }, [open, searchValue, runSearch]);

    // Click outside (panel or search pill keeps it open)
    useEffect(() => {
        if (!open) return;
        const handle = (e) => {
            if (panelRef.current?.contains(e.target)) return;
            if (inputRef?.current?.contains(e.target)) return;
            if (anchorRef?.current?.contains(e.target)) return;
            onClose();
        };
        document.addEventListener('mousedown', handle);
        document.addEventListener('touchstart', handle, { passive: true });
        return () => {
            document.removeEventListener('mousedown', handle);
            document.removeEventListener('touchstart', handle);
        };
    }, [open, onClose, inputRef, anchorRef]);

    // Escape
    useEffect(() => {
        if (!open) return;
        const handle = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [open, onClose]);

    const handleSuggestionClick = (tag) => {
        setSearchValue(tag);
        runSearch(tag);
    };

    const handleSeeAll = () => {
        onClose();
        if (searchValue.trim()) router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`);
    };

    const handleRowSelect = () => onClose();

    if (!open) return null;

    const content = (
        <motion.div
            ref={panelRef}
            className={styles.panel}
            style={anchorRect ? {
                position: 'fixed',
                top: anchorRect.bottom + 8,
                left: anchorRect.left,
                width: anchorRect.width,
            } : undefined}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label="Search results"
        >
            {!searchValue.trim() && (
                <div className={styles.suggestions}>
                    <p className={styles.suggestionsTitle}>Popular searches</p>
                    <div className={styles.suggestionTags}>
                        {SUGGESTIONS.map((tag) => (
                            <button
                                key={tag}
                                type="button"
                                className={styles.suggestionTag}
                                onClick={() => handleSuggestionClick(tag)}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {searchValue.trim() && (
                <>
                    {loading && results.length === 0 && (
                        <div className={styles.loading}>
                            <LoaderIcon size={24} />
                            <span>Searching...</span>
                        </div>
                    )}
                    {error && results.length === 0 && (
                        <div className={styles.empty}>Something went wrong. Try again.</div>
                    )}
                    {!loading && !error && results.length === 0 && searchValue.trim() && (
                        <div className={styles.empty}>No books found for &quot;{searchValue.trim()}&quot;</div>
                    )}
                    {results.length > 0 && (
                        <div className={styles.results}>
                            <ul className={styles.list} role="list">
                                {results.map((book) => (
                                    <li key={book.id}>
                                        <SearchDropdownRow book={book} onSelect={handleRowSelect} />
                                    </li>
                                ))}
                            </ul>
                            <button
                                type="button"
                                className={styles.seeAll}
                                onClick={handleSeeAll}
                            >
                                See all results for &quot;{searchValue.trim()}&quot;
                            </button>
                        </div>
                    )}
                </>
            )}
        </motion.div>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(content, document.body);
}
