'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    SearchIcon, CloseIcon, MoonIcon, SunIcon,
    ChevronLeftIcon, ChevronRightIcon, HomeIcon, HomeFilledIcon, BrowseIcon,
} from '@/app/components/icons';
import { useTheme } from '@/app/hooks/useTheme';
import Logo from '@/app/components/Logo';
import SearchDropdown from '@/app/components/SearchDropdown';
import styles from './TopBar.module.css';

/* ─── Top Bar ─── */
export default function TopBar() {
    const router = useRouter();
    const pathname = usePathname();
    const { theme, toggleTheme, mounted } = useTheme();
    const [scrolled, setScrolled] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const inputRef = useRef(null);
    const searchPillRef = useRef(null);
    const debounceRef = useRef(null);

    const isHome = pathname === '/';
    const isReader = /^\/book\/[^/]+\/read/.test(pathname);

    // Sync search value from URL only when landing on /search (e.g. "See all" or deep link)
    useEffect(() => {
        if (pathname === '/search') {
            const params = new URLSearchParams(window.location.search);
            setSearchValue(params.get('q') || '');
        }
    }, [pathname]);

    useEffect(() => {
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, []);

    useEffect(() => {
        const el = document.querySelector('[data-main-scroll]');
        if (!el) return;
        let ticking = false;
        const onScroll = () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(() => {
                    setScrolled(el.scrollTop > 20);
                    ticking = false;
                });
            }
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, []);

    const handleSearchChange = (e) => {
        setSearchValue(e.target.value);
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter' && searchValue.trim()) {
            e.preventDefault();
            router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`);
            setSearchOpen(false);
        }
        if (e.key === 'Escape') {
            setSearchOpen(false);
            inputRef.current?.blur();
        }
    };

    const handleSearchFocus = () => setSearchOpen(true);

    const handleSearchClose = () => setSearchOpen(false);

    const clearSearch = () => {
        setSearchValue('');
        inputRef.current?.focus();
    };

    // Hide TopBar on reader pages - reader has its own navigation
    if (isReader) return null;

    return (
        <div className={`${styles.topBar} ${scrolled ? styles.scrolled : ''}`}>
            {/* Left Section: Logo */}
            <div className={styles.leftSection}>
                <Logo />
            </div>

            {/* Center Section: Navigation, Home, Search */}
            <div className={styles.centerSection}>
                {/* ← → Navigation */}
                <div className={styles.navArrows}>
                    <button onClick={() => router.back()} className={styles.navArrow} aria-label="Go back">
                        <ChevronLeftIcon size={22} />
                    </button>
                    <button onClick={() => router.forward()} className={styles.navArrow} aria-label="Go forward">
                        <ChevronRightIcon size={22} />
                    </button>
                </div>

                {/* Home Button */}
                <Link href="/" className={`${styles.homeButton} ${isHome ? styles.homeButtonActive : ''}`} aria-label="Home">
                    {isHome ? <HomeFilledIcon size={24} /> : <HomeIcon size={24} />}
                </Link>

                {/* Search: dropdown preview (no separate page on focus) */}
                <div className={styles.searchArea}>
                    <div ref={searchPillRef} className={styles.searchWrapper}>
                        <SearchIcon size={22} className={styles.searchIcon} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchValue}
                            onChange={handleSearchChange}
                            onKeyDown={handleSearchKeyDown}
                            onFocus={handleSearchFocus}
                            placeholder="What do you want to read?"
                            className={styles.searchInput}
                            autoComplete="off"
                            spellCheck="false"
                            aria-expanded={searchOpen}
                            aria-haspopup="dialog"
                        />
                        {searchValue && (
                            <span className={styles.divider} />
                        )}
                        {searchValue ? (
                            <button onClick={clearSearch} className={styles.clearButton} aria-label="Clear search">
                                <CloseIcon size={20} />
                            </button>
                        ) : (
                            <Link href="/browse" className={styles.browseButton} aria-label="Browse">
                                <BrowseIcon size={22} />
                            </Link>
                        )}
                    </div>
                    <SearchDropdown
                        open={searchOpen}
                        onClose={handleSearchClose}
                        searchValue={searchValue}
                        setSearchValue={setSearchValue}
                        inputRef={inputRef}
                        anchorRef={searchPillRef}
                    />
                </div>
            </div>

            {/* Right Section: Actions */}
            <div className={styles.rightSection}>
                {mounted && (
                    <button
                        onClick={toggleTheme}
                        className={styles.themeButton}
                        aria-label={`Switch to ${theme === 'dark' ? 'sepia' : 'dark'} theme`}
                    >
                        {theme === 'dark' ? <MoonIcon size={22} /> : <SunIcon size={22} />}
                    </button>
                )}
            </div>
        </div>
    );
}
