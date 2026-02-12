
import { Suspense } from 'react';
import BrowseContent from './BrowseContent';
import { BookCardSkeletonGrid } from '@/app/components/Skeleton';
import { getBrowsePageData } from './page.server';
import styles from './page.module.css';

export default async function BrowsePage({ searchParams }) {
    // In Next.js 14+, searchParams is a Promise that must be awaited
    const params = await searchParams;
    const topic = params?.topic || '';
    
    // Fetch initial data on the server for instant display
    const initialData = await getBrowsePageData(topic);

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <Suspense
                    fallback={
                        <>
                            <div className={styles.header}>
                                <h1 className={styles.title}>Browse Books</h1>
                                <p className={styles.subtitle}>
                                    Explore the world&apos;s greatest literature — all free, all public domain
                                </p>
                            </div>
                            <div className={styles.bookGrid}>
                                <BookCardSkeletonGrid count={20} />
                            </div>
                        </>
                    }
                >
                    <BrowseContent initialData={initialData} initialTopic={topic} />
                </Suspense>
            </div>
        </div>
    );
}
