'use client';

import { memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { DownloadIcon } from '@/app/components/icons';
import { formatAuthorName, formatDownloadCount, getBookCoverUrl } from '@/app/lib/api';
import styles from './BookCard.module.css';

function BookCard({ book, index = 0 }) {
    const coverUrl = getBookCoverUrl(book);
    const author = book.authors?.[0];
    const authorName = formatAuthorName(author);
    const downloads = formatDownloadCount(book.download_count);

    return (
        <motion.article
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.3, delay: Math.min(index, 12) * 0.03, ease: [0.16, 1, 0.3, 1] }}
        >
            <Link href={`/book/${book.id}`} className={styles.link}>
                <div className={styles.coverWrapper}>
                    {coverUrl ? (
                        <Image
                            src={coverUrl}
                            alt={`Cover of ${book.title}`}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            className={styles.coverImage}
                            loading="lazy"
                            placeholder="blur"
                            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                        />
                    ) : (
                        <div className={styles.coverPlaceholder}>
                            <span className={styles.placeholderTitle}>{book.title}</span>
                        </div>
                    )}
                    <div className={styles.coverOverlay} />
                    <div className={styles.hoverIndicator} aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </div>
                </div>

                <div className={styles.info}>
                    <h3 className={styles.title}>{book.title}</h3>
                    <p className={styles.author}>{authorName}</p>
                    <div className={styles.meta}>
                        <span className={styles.downloads}>
                            <DownloadIcon size={14} />
                            {downloads}
                        </span>
                    </div>
                </div>
            </Link>
        </motion.article>
    );
}

export default memo(BookCard);
