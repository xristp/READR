'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, HomeFilledIcon, BrowseIcon } from '@/app/components/icons';
import { prefetch } from '@/app/lib/apiCache';
import styles from './MobileNav.module.css';

const GUTENDEX = 'https://gutendex.com/books';

function prefetchHome() {
    prefetch(`${GUTENDEX}?sort=popular&page=1`);
    prefetch(`${GUTENDEX}?topic=fiction&sort=popular`);
}

function prefetchBrowse() {
    prefetch(`${GUTENDEX}/?page=1&sort=popular`);
}

export default function MobileNav() {
    const pathname = usePathname();

    const isReader = /^\/book\/[^/]+\/read/.test(pathname);
    if (isReader) return null;

    const isHome = pathname === '/';
    const isBrowse = pathname.startsWith('/browse');

    return (
        <nav className={styles.nav} aria-label="Mobile navigation">
            <Link href="/" className={`${styles.item} ${isHome ? styles.active : ''}`} onTouchStart={prefetchHome} onMouseEnter={prefetchHome}>
                {isHome ? <HomeFilledIcon size={24} /> : <HomeIcon size={24} />}
                <span>Home</span>
            </Link>
            <Link href="/browse" className={`${styles.item} ${isBrowse ? styles.active : ''}`} onTouchStart={prefetchBrowse} onMouseEnter={prefetchBrowse}>
                <BrowseIcon size={24} />
                <span>Browse</span>
            </Link>
        </nav>
    );
}
