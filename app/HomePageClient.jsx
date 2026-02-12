'use client';

import { motion } from 'framer-motion';
import ContinueReading from '@/app/components/ContinueReading';
import ScrollRow from '@/app/components/ScrollRow';
import styles from './page.module.css';

export default function HomePageClient({ greeting, rowsData }) {
  return (
    <div className={styles.page}>
      {/* ─── Greeting ─── */}
      <header className={styles.topBar}>
        <motion.h1
          className={styles.greeting}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {greeting}
        </motion.h1>
      </header>

      {/* ─── Quick Access Tiles (Continue Reading) ─── */}
      <ContinueReading />

      {/* ─── Scroll Rows ─── */}
      <div className={styles.rowsContainer}>
        {rowsData.map((row) => (
          <ScrollRow
            key={row.title}
            title={row.title}
            fetchUrl={row.url}
            initialBooks={row.books}
            seeAllHref={row.topic ? `/browse?topic=${encodeURIComponent(row.topic)}` : '/browse'}
          />
        ))}
      </div>
    </div>
  );
}
