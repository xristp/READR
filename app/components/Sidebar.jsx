'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { HomeIcon, HomeFilledIcon, LibraryIcon, BookIcon, BrowseIcon } from '@/app/components/icons';
import { useRecentBooks } from '@/app/hooks/useRecentBooks';
import { getBookCoverUrl, formatAuthorName } from '@/app/lib/api';
import { prefetch } from '@/app/lib/apiCache';
import styles from './Sidebar.module.css';

const GUTENDEX = 'https://gutendex.com/books';

/** Warm the cache for the home-page scroll rows */
function prefetchHome() {
    prefetch(`${GUTENDEX}?sort=popular&page=1`);
    prefetch(`${GUTENDEX}?topic=fiction&sort=popular`);
    prefetch(`${GUTENDEX}?topic=adventure&sort=popular`);
    prefetch(`${GUTENDEX}?topic=poetry&sort=popular`);
    prefetch(`${GUTENDEX}?topic=philosophy&sort=popular`);
}

/** Warm the cache for the default browse page */
function prefetchBrowse() {
    prefetch(`${GUTENDEX}/?page=1&sort=popular`);
}

function SidebarLibrary() {
    const { books, loading, mounted } = useRecentBooks(12);

    if (!mounted || loading) {
        return null;
    }

    if (books.length === 0) {
        return (
            <div className={styles.libraryEmpty}>
                <p className={styles.libraryEmptyTitle}>Your Library</p>
                <p className={styles.libraryEmptyText}>
                    Start reading to build your library
                </p>
                <Link href="/browse" className={styles.libraryEmptyAction}>
                    Browse Books
                </Link>
            </div>
        );
    }

    return (
        <div className={styles.libraryList}>
            {books.map((book) => {
                const coverUrl = getBookCoverUrl(book);
                const author = book.authors?.[0];
                const authorName = formatAuthorName(author);

                return (
                    <Link
                        key={book.id}
                        href={`/book/${book.id}`}
                        className={styles.libraryItem}
                    >
                        <div className={styles.libraryItemCover}>
                            {coverUrl ? (
                                <Image
                                    src={coverUrl}
                                    alt=""
                                    fill
                                    sizes="48px"
                                    className={styles.libraryItemImage}
                                    loading="lazy"
                                />
                            ) : (
                                <div className={styles.libraryItemPlaceholder}>
                                    <BookIcon size={14} />
                                </div>
                            )}
                        </div>
                        <div className={styles.libraryItemInfo}>
                            <span className={styles.libraryItemTitle}>{book.title}</span>
                            <span className={styles.libraryItemAuthor}>{authorName}</span>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}

export default function Sidebar() {
    const pathname = usePathname();
    const isHome = pathname === '/';
    const isBrowse = pathname.startsWith('/browse');

    // Hide sidebar on the reader page (full-screen reading)
    const isReader = /^\/book\/[^/]+\/read/.test(pathname);
    if (isReader) return null;

    return (
        <aside className={styles.sidebar}>
            {/* ─── Navigation Panel ─── */}
            <div className={styles.navPanel}>
                <Link href="/" className={`${styles.navItem} ${isHome ? styles.navItemActive : ''}`} onMouseEnter={prefetchHome}>
                    {isHome ? <HomeFilledIcon size={22} /> : <HomeIcon size={22} />}
                    <span>Home</span>
                </Link>
                <Link href="/browse" className={`${styles.navItem} ${isBrowse ? styles.navItemActive : ''}`} onMouseEnter={prefetchBrowse}>
                    <BrowseIcon size={22} />
                    <span>Browse</span>
                </Link>
            </div>

            {/* ─── Library Panel ─── */}
            <div className={styles.libraryPanel}>
                <div className={styles.libraryHeader}>
                    <div className={styles.libraryHeaderLeft}>
                        <LibraryIcon size={20} />
                        <span>Your Library</span>
                    </div>
                </div>

                <SidebarLibrary />
            </div>
        </aside>
    );
}
