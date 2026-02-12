'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BookIcon, SearchIcon, MenuIcon, CloseIcon, MoonIcon, SunIcon } from '@/app/components/icons';
import { useTheme } from '@/app/hooks/useTheme';
import styles from './Header.module.css';

const NAV_LINKS = [
    { href: '/', label: 'Home' },
    { href: '/browse', label: 'Browse' },
    { href: '/search', label: 'Search' },
];

export default function Header() {
    const { theme, toggleTheme, mounted } = useTheme();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(() => {
                    setScrolled(window.scrollY > 10);
                    ticking = false;
                });
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [mobileMenuOpen]);

    const isActive = (href) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    return (
        <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
            <div className={styles.inner}>
                <Link href="/" className={styles.logo}>
                    <BookIcon size={28} />
                    <span className={styles.logoText}>READR</span>
                </Link>

                <nav className={styles.nav} aria-label="Main navigation">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`${styles.navLink} ${isActive(link.href) ? styles.active : ''}`}
                        >
                            {link.label}
                            {isActive(link.href) && (
                                <motion.div
                                    className={styles.activeIndicator}
                                    layoutId="activeNav"
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                            )}
                        </Link>
                    ))}
                </nav>

                <div className={styles.actions}>
                    <Link href="/search" className={styles.iconButton} aria-label="Search">
                        <SearchIcon size={20} />
                    </Link>

                    {mounted && (
                        <button
                            onClick={toggleTheme}
                            className={styles.iconButton}
                            aria-label={`Switch to ${theme === 'dark' ? 'sepia' : 'dark'} theme`}
                        >
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={theme}
                                    initial={{ rotate: -90, opacity: 0 }}
                                    animate={{ rotate: 0, opacity: 1 }}
                                    exit={{ rotate: 90, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ display: 'flex' }}
                                >
                                    {theme === 'dark' ? <MoonIcon size={20} /> : <SunIcon size={20} />}
                                </motion.span>
                            </AnimatePresence>
                        </button>
                    )}

                    <button
                        className={`${styles.iconButton} ${styles.menuButton}`}
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle menu"
                        aria-expanded={mobileMenuOpen}
                    >
                        {mobileMenuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            className={styles.overlay}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                        />
                        <motion.nav
                            className={styles.mobileMenu}
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            aria-label="Mobile navigation"
                        >
                            <div className={styles.mobileMenuInner}>
                                {NAV_LINKS.map((link, i) => (
                                    <motion.div
                                        key={link.href}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.08 }}
                                    >
                                        <Link
                                            href={link.href}
                                            className={`${styles.mobileNavLink} ${isActive(link.href) ? styles.active : ''}`}
                                        >
                                            {link.label}
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.nav>
                    </>
                )}
            </AnimatePresence>
        </header>
    );
}
