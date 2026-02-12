'use client';

import Link from 'next/link';
import { GithubIcon, HeartIcon, BookIcon } from '@/app/components/icons';
import styles from './Footer.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.inner}>
                <div className={styles.top}>
                    <div className={styles.brand}>
                        <BookIcon size={24} />
                        <span className={styles.brandName}>READR</span>
                        <p className={styles.tagline}>
                            Free access to the world&apos;s greatest literature.
                            <br />
                            77,000+ public domain books at your fingertips.
                        </p>
                    </div>

                    <div className={styles.links}>
                        <div className={styles.linkGroup}>
                            <h3 className={styles.linkGroupTitle}>Explore</h3>
                            <Link href="/browse" className={styles.link}>Browse Books</Link>
                            <Link href="/search" className={styles.link}>Search</Link>
                            <Link href="/browse?topic=fiction" className={styles.link}>Fiction</Link>
                            <Link href="/browse?topic=poetry" className={styles.link}>Poetry</Link>
                        </div>
                        <div className={styles.linkGroup}>
                            <h3 className={styles.linkGroupTitle}>Project</h3>
                            <a href="https://github.com" aria-label="View source on GitHub" className={styles.link} target="_blank" rel="noopener noreferrer">
                                GitHub
                            </a>
                            <a href="https://www.gutenberg.org" className={styles.link} target="_blank" rel="noopener noreferrer">
                                Project Gutenberg
                            </a>
                            <a href="https://gutendex.com" className={styles.link} target="_blank" rel="noopener noreferrer">
                                Gutendex API
                            </a>
                        </div>
                    </div>
                </div>

                <div className={styles.bottom}>
                    <p className={styles.copyright}>
                        Built with <HeartIcon size={14} className={styles.heartIcon} /> for the love of reading.
                    </p>
                    <p className={styles.attribution}>
                        Books sourced from{' '}
                        <a href="https://www.gutenberg.org" target="_blank" rel="noopener noreferrer">
                            Project Gutenberg
                        </a>
                        . All books are in the public domain.
                    </p>
                    <a
                        href="https://github.com"
                        className={styles.githubLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View source on GitHub"
                    >
                        <GithubIcon size={20} />
                    </a>
                </div>
            </div>
        </footer>
    );
}
