'use client';

import Link from 'next/link';
import styles from './Logo.module.css';

export default function Logo() {
    return (
        <Link href="/" className={styles.logo} aria-label="READR Home">
            <div className={styles.logoIcon}>
                <img
                    src="/app-icon.svg"
                    alt=""
                    width={56}
                    height={56}
                />
            </div>
            <span className={styles.logoText}>READR</span>
        </Link>
    );
}
