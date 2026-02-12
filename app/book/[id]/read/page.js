'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeftIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    SunIcon,
    MoonIcon,
    TypeIcon,
    SettingsIcon,
    CloseIcon,
    BookIcon,
} from '@/app/components/icons';
import { useTheme } from '@/app/hooks/useTheme';
import { useReadingProgress } from '@/app/hooks/useReadingProgress';
import { TextSkeleton } from '@/app/components/Skeleton';
import { parseBookText } from '@/app/lib/api';
import { fetchWithCache } from '@/app/lib/apiCache';
import styles from './page.module.css';

export default function ReaderPage() {
    const params = useParams();
    const router = useRouter();
    const { theme, setTheme, mounted } = useTheme();
    const { progress, saveProgress } = useReadingProgress(params.id);

    const [book, setBook] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [currentChapter, setCurrentChapter] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingText, setLoadingText] = useState(true);
    const [fontSize, setFontSize] = useState(18);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [tocOpen, setTocOpen] = useState(false);

    const contentRef = useRef(null);
    const settingsRef = useRef(null);

    // Fetch book info (cached — instant when navigating from detail page)
    useEffect(() => {
        let mounted = true;
        fetchWithCache(`https://gutendex.com/books/${params.id}/`)
            .then((data) => { if (mounted) setBook(data); })
            .catch((err) => console.error('Error fetching book:', err))
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [params.id]);

    // Click outside to close settings panel
    useEffect(() => {
        if (!settingsOpen) return;
        const handleClickOutside = (e) => {
            if (settingsRef.current && !settingsRef.current.contains(e.target)) {
                setSettingsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [settingsOpen]);

    // Fetch book text via our API route (avoids CORS)
    const progressRef = useRef(progress);
    progressRef.current = progress;

    useEffect(() => {
        const controller = new AbortController();
        async function fetchText() {
            if (!book) return;
            setLoadingText(true);

            try {
                const res = await fetch(`/api/books/${params.id}/text`, {
                    signal: controller.signal,
                });

                if (!res.ok) {
                    setChapters([{ title: 'Content', content: 'No readable text format available for this book.' }]);
                    setLoadingText(false);
                    return;
                }

                const rawText = await res.text();

                // Parse text using shared utility
                const { chapters: parsed } = parseBookText(rawText);
                setChapters(parsed);

                // Restore progress
                const savedProgress = progressRef.current;
                if (savedProgress.chapter > 0 && savedProgress.chapter < parsed.length) {
                    setCurrentChapter(savedProgress.chapter);
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error fetching text:', err);
                    setChapters([{ title: 'Error', content: 'Failed to load book text. Please try again.' }]);
                }
            } finally {
                setLoadingText(false);
            }
        }
        fetchText();
        return () => controller.abort();
    }, [book, params.id]);

    // Save progress on chapter change (use ref to avoid loops)
    const saveProgressRef = useRef(saveProgress);
    saveProgressRef.current = saveProgress;

    useEffect(() => {
        if (chapters.length > 0) {
            saveProgressRef.current(currentChapter);
        }
    }, [currentChapter, chapters.length]);

    // Scroll to top on chapter change - instant scroll to top
    useEffect(() => {
        // Scroll the content container to top instantly
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
        // Also scroll the main scroll container (for TopBar compatibility)
        const mainScroll = document.querySelector('[data-main-scroll]');
        if (mainScroll) {
            mainScroll.scrollTop = 0;
        }
        // Fallback: scroll window to top
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [currentChapter]);

    // Navigation functions — use functional state updates to avoid stale closures
    const goNext = useCallback(() => {
        setCurrentChapter((c) => {
            if (c < chapters.length - 1) {
                // Scroll to top when going to next chapter
                setTimeout(() => {
                    if (contentRef.current) contentRef.current.scrollTop = 0;
                    const mainScroll = document.querySelector('[data-main-scroll]');
                    if (mainScroll) mainScroll.scrollTop = 0;
                }, 0);
                return c + 1;
            }
            return c;
        });
    }, [chapters.length]);

    const goPrev = useCallback(() => {
        setCurrentChapter((c) => {
            if (c > 0) {
                // Scroll to top when going to previous chapter
                setTimeout(() => {
                    if (contentRef.current) contentRef.current.scrollTop = 0;
                    const mainScroll = document.querySelector('[data-main-scroll]');
                    if (mainScroll) mainScroll.scrollTop = 0;
                }, 0);
                return c - 1;
            }
            return c;
        });
    }, []);

    // Keyboard navigation — stable deps prevent re-registration every render
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                goNext();
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                goPrev();
            }
            if (e.key === 'Escape') {
                setSettingsOpen(false);
                setTocOpen(false);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [goNext, goPrev]);

    // Restore font size from localStorage (clamp to valid range)
    useEffect(() => {
        try {
            const savedSize = localStorage.getItem('readabook-fontsize');
            if (savedSize) {
                const n = parseInt(savedSize, 10);
                if (Number.isFinite(n)) setFontSize(Math.min(28, Math.max(14, n)));
            }
        } catch { /* ignore */ }
    }, []);

    const changeFontSize = useCallback((size) => {
        setFontSize(size);
        localStorage.setItem('readabook-fontsize', size.toString());
    }, []);

    const paragraphs = useMemo(() => {
        const content = chapters[currentChapter]?.content || '';
        return content.split('\n\n').filter(Boolean);
    }, [chapters, currentChapter]);

    const progressPercent = chapters.length > 0
        ? Math.round(((currentChapter + 1) / chapters.length) * 100)
        : 0;

    if (loading) {
        return (
            <div className={styles.readerPage}>
                <div className={styles.readerContent}>
                    <TextSkeleton lines={20} />
                </div>
            </div>
        );
    }

    if (!book) {
        return (
            <div className={styles.readerPage}>
                <div className={styles.readerContent}>
                    <p>Book not found.</p>
                    <Link href="/browse">Browse books</Link>
                </div>
            </div>
        );
    }

    const currentContent = chapters[currentChapter];

    return (
        <div className={styles.readerPage}>
            {/* Progress Bar */}
            <div className={styles.progressBarWrapper}>
                <motion.div
                    className={styles.progressBar}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                />
            </div>

            {/* Reader Toolbar - Book navigation at the top */}
            <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                    <button
                        onClick={() => router.push(`/book/${params.id}`)}
                        className={styles.toolbarButton}
                        aria-label="Back to book details"
                    >
                        <ArrowLeftIcon size={18} />
                    </button>
                    <div className={styles.toolbarTitle}>
                        <span className={styles.toolbarBookTitle}>{book.title}</span>
                        <span className={styles.toolbarChapter}>
                            {currentContent?.title || `Section ${currentChapter + 1}`}
                        </span>
                    </div>
                </div>

                <div className={styles.toolbarRight}>
                    <span className={styles.progressText}>{progressPercent}%</span>

                    <button
                        onClick={() => setTocOpen(!tocOpen)}
                        className={styles.toolbarButton}
                        aria-label="Table of contents"
                    >
                        <BookIcon size={18} />
                    </button>

                    <button
                        onClick={() => setSettingsOpen(!settingsOpen)}
                        className={styles.toolbarButton}
                        aria-label="Reading settings"
                    >
                        <SettingsIcon size={18} />
                    </button>
                </div>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
                {settingsOpen && (
                    <motion.div
                        className={styles.settingsPanel}
                        ref={settingsRef}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className={styles.settingsSection}>
                            <label className={styles.settingsLabel}>Theme</label>
                            <div className={styles.themeButtons}>
                                {[
                                    { value: 'dark', label: 'Dark' },
                                    { value: 'sepia', label: 'Sepia' },
                                ].map((t) => (
                                    <button
                                        key={t.value}
                                        className={`${styles.themeButton} ${theme === t.value ? styles.themeActive : ''}`}
                                        onClick={() => setTheme(t.value)}
                                        data-theme-preview={t.value}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.settingsSection}>
                            <label className={styles.settingsLabel}>Font Size</label>
                            <div className={styles.fontSizeControls}>
                                <button
                                    onClick={() => changeFontSize(Math.max(14, fontSize - 2))}
                                    className={styles.fontSizeButton}
                                    disabled={fontSize <= 14}
                                >
                                    A<span className={styles.fontSmall}>−</span>
                                </button>
                                <span className={styles.fontSizeValue}>{fontSize}px</span>
                                <button
                                    onClick={() => changeFontSize(Math.min(28, fontSize + 2))}
                                    className={styles.fontSizeButton}
                                    disabled={fontSize >= 28}
                                >
                                    A<span className={styles.fontLarge}>+</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* TOC Panel */}
            <AnimatePresence>
                {tocOpen && (
                    <>
                        <motion.div
                            className={styles.tocOverlay}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setTocOpen(false)}
                        />
                        <motion.div
                            className={styles.tocPanel}
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        >
                            <div className={styles.tocHeader}>
                                <h2 className={styles.tocTitle}>Chapters</h2>
                                <button
                                    onClick={() => setTocOpen(false)}
                                    className={styles.toolbarButton}
                                >
                                    <CloseIcon size={18} />
                                </button>
                            </div>
                            <nav className={styles.tocList}>
                                {chapters.map((ch, i) => (
                            <button
                                key={i}
                                className={`${styles.tocItem} ${i === currentChapter ? styles.tocActive : ''}`}
                                onClick={() => {
                                    setCurrentChapter(i);
                                    setTocOpen(false);
                                    // Scroll to top when changing chapter from TOC
                                    if (contentRef.current) {
                                        contentRef.current.scrollTop = 0;
                                    }
                                    const mainScroll = document.querySelector('[data-main-scroll]');
                                    if (mainScroll) {
                                        mainScroll.scrollTop = 0;
                                    }
                                }}
                            >
                                        <span className={styles.tocItemNumber}>{i + 1}</span>
                                        <span className={styles.tocItemTitle}>{ch.title}</span>
                                    </button>
                                ))}
                            </nav>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Reader Content */}
            <div className={styles.readerContent} ref={contentRef} data-reader-scroll>
                {loadingText ? (
                    <div className={styles.readerInner}>
                        <TextSkeleton lines={20} />
                    </div>
                ) : (
                    <article
                        className={styles.readerInner}
                        style={{ fontSize: `${fontSize}px` }}
                    >
                        <motion.div
                            key={currentChapter}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h2 className={styles.chapterTitle}>{currentContent?.title}</h2>
                            <div className={styles.chapterText}>
                                {paragraphs.map((para, i) => (
                                    <p key={i}>{para}</p>
                                ))}
                            </div>
                        </motion.div>
                    </article>
                )}
            </div>

            {/* Chapter Navigation */}
            {chapters.length > 1 && (
                <div className={styles.chapterNav}>
                    <button
                        onClick={goPrev}
                        disabled={currentChapter === 0}
                        className={styles.chapterNavButton}
                    >
                        <ChevronLeftIcon size={18} />
                        Previous
                    </button>
                    <span className={styles.chapterNavInfo}>
                        {currentChapter + 1} / {chapters.length}
                    </span>
                    <button
                        onClick={goNext}
                        disabled={currentChapter === chapters.length - 1}
                        className={styles.chapterNavButton}
                    >
                        Next
                        <ChevronRightIcon size={18} />
                    </button>
                </div>
            )}
        </div>
    );
}
