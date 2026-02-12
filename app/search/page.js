import { Suspense } from 'react';
import SearchContent from './SearchContent';
import { getSearchPageData } from './page.server';
import { LoaderIcon } from '@/app/components/icons';
import styles from './page.module.css';

export default async function SearchPage({ searchParams }) {
    // In Next.js 14+, searchParams is a Promise that must be awaited
    const params = await searchParams;
    const query = params?.q || '';
    
    // Fetch initial search results on the server if query exists
    const initialData = query.trim() ? await getSearchPageData(query) : null;

    return (
        <Suspense
            fallback={
                <div className={styles.loadingState}>
                    <LoaderIcon size={32} />
                    <p>Loading search...</p>
                </div>
            }
        >
            <SearchContent initialData={initialData} initialQuery={query} />
        </Suspense>
    );
}
