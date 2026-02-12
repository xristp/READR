import { Suspense } from 'react';
import HomePageClient from './HomePageClient';
import { getHomePageData } from './page.server';
import styles from './page.module.css';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function HomePage() {
  // Fetch all data in parallel on the server
  // This happens before the page renders, eliminating client-side loading delays
  const rowsData = await getHomePageData();
  const greeting = getGreeting();

  return (
    <Suspense fallback={
      <div className={styles.page}>
        <header className={styles.topBar}>
          <h1 className={styles.greeting}>{greeting}</h1>
        </header>
      </div>
    }>
      <HomePageClient greeting={greeting} rowsData={rowsData} />
    </Suspense>
  );
}
