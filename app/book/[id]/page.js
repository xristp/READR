'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    ArrowLeftIcon,
    BookIcon,
    DownloadIcon,
    ExternalLinkIcon,
} from '@/app/components/icons';
import { getBookCoverUrl, formatAuthorName, formatDownloadCount } from '@/app/lib/api';
import { getCachedData, fetchWithCache } from '@/app/lib/apiCache';
import { TextSkeleton } from '@/app/components/Skeleton';
import styles from './page.module.css';

export default function BookDetailPage() {
    const params = useParams();
    const bookUrl = `https://gutendex.com/books/${params.id}/`;
    const [book, setBook] = useState(() => getCachedData(bookUrl));
    const [loading, setLoading] = useState(() => !getCachedData(bookUrl));
    const [error, setError] = useState(false);

    useEffect(() => {
        let mounted = true;
        fetchWithCache(bookUrl)
            .then((data) => { if (mounted) setBook(data); })
            .catch((err) => {
                console.error('Error fetching book:', err);
                if (mounted) setError(true);
            })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [bookUrl]);

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.skeleton}>
                        <div className={styles.skeletonCover} />
                        <div className={styles.skeletonInfo}>
                            <TextSkeleton lines={6} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!book) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.errorState}>
                        <h1>{error ? 'Failed to load book' : 'Book not found'}</h1>
                        <p>
                            {error
                                ? 'We couldn’t reach the server. Please check your connection and try again.'
                                : 'The book you\'re looking for doesn\'t exist.'}
                        </p>
                        <Link href="/browse" className={styles.backLink}>
                            Browse books
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const coverUrl = getBookCoverUrl(book);
    const primaryAuthor = book.authors?.[0];
    const authorName = formatAuthorName(primaryAuthor);
    const downloads = formatDownloadCount(book.download_count);
    const subjects = book.subjects?.slice(0, 6) || [];
    const bookshelves = book.bookshelves?.slice(0, 4) || [];
    const summary = book.summaries?.[0] || '';
    const gutenbergUrl = `https://www.gutenberg.org/ebooks/${book.id}`;

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                {/* Back */}
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <Link href="/browse" className={styles.backLink}>
                        <ArrowLeftIcon size={18} />
                        Back to Browse
                    </Link>
                </motion.div>

                {/* Book Details */}
                <div className={styles.bookLayout}>
                    {/* Cover */}
                    <motion.div
                        className={styles.coverSection}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className={styles.coverWrapper}>
                            {coverUrl ? (
                                <Image
                                    src={coverUrl}
                                    alt={`Cover of ${book.title}`}
                                    fill
                                    sizes="300px"
                                    className={styles.coverImage}
                                    priority
                                />
                            ) : (
                                <div className={styles.coverPlaceholder}>
                                    <BookIcon size={48} />
                                    <span>{book.title}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Info */}
                    <motion.div
                        className={styles.infoSection}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <h1 className={styles.bookTitle}>{book.title}</h1>
                        <p className={styles.bookAuthor}>
                            by {authorName}
                            {primaryAuthor?.birth_year && (
                                <span className={styles.authorYears}>
                                    {' '}({primaryAuthor.birth_year}–{primaryAuthor.death_year || 'present'})
                                </span>
                            )}
                        </p>

                        <div className={styles.stats}>
                            <span className={styles.stat}>
                                <DownloadIcon size={16} />
                                {downloads} reads
                            </span>
                            <span className={styles.stat}>
                                {book.languages?.map(l => l.toUpperCase()).join(', ')}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className={styles.actions}>
                            <Link
                                href={`/book/${book.id}/read`}
                                className={styles.readButton}
                            >
                                <BookIcon size={18} />
                                Start Reading
                            </Link>
                            <a
                                href={gutenbergUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.externalButton}
                            >
                                <ExternalLinkIcon size={16} />
                                Gutenberg
                            </a>
                        </div>

                        {/* Summary */}
                        {summary && (
                            <div className={styles.summarySection}>
                                <h2 className={styles.sectionLabel}>About this book</h2>
                                <p className={styles.summary}>{summary}</p>
                            </div>
                        )}

                        {/* Subjects */}
                        {subjects.length > 0 && (
                            <div className={styles.tagsSection}>
                                <h2 className={styles.sectionLabel}>Subjects</h2>
                                <div className={styles.tags}>
                                    {subjects.map((subject) => (
                                        <span key={subject} className={styles.tag}>
                                            {subject.replace(/ -- /g, ' / ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Bookshelves */}
                        {bookshelves.length > 0 && (
                            <div className={styles.tagsSection}>
                                <h2 className={styles.sectionLabel}>Categories</h2>
                                <div className={styles.tags}>
                                    {bookshelves.map((shelf) => (
                                        <span key={shelf} className={styles.tag}>
                                            {shelf.replace('Category: ', '')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
