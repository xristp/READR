'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { BookIcon } from '@/app/components/icons';
import { useRecentBooks } from '@/app/hooks/useRecentBooks';
import { getBookCoverUrl } from '@/app/lib/api';
import styles from './ContinueReading.module.css';

export default function ContinueReading() {
    const { books, loading, mounted } = useRecentBooks(6);

    if (!mounted || loading || books.length === 0) return null;

    return (
        <section className={styles.section}>
            <div className={styles.grid}>
            {books.map((book, i) => {
                const coverUrl = getBookCoverUrl(book);

                return (
                    <motion.div
                        key={book.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.35,
                            delay: i * 0.04,
                            ease: [0.16, 1, 0.3, 1],
                        }}
                    >
                        <Link
                            href={`/book/${book.id}/read`}
                            className={styles.tile}
                        >
                            <div className={styles.tileCover}>
                                {coverUrl ? (
                                    <Image
                                        src={coverUrl}
                                        alt={`Cover of ${book.title}`}
                                        fill
                                        sizes="56px"
                                        className={styles.tileCoverImage}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className={styles.tileCoverPlaceholder}>
                                        <BookIcon size={18} />
                                    </div>
                                )}
                            </div>
                            <span className={styles.tileTitle}>{book.title}</span>
                        </Link>
                    </motion.div>
                );
            })}
            </div>
        </section>
    );
}
