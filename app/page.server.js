/**
 * Server-side data fetching for home page
 * This runs on the server and fetches all data in parallel
 */

import { getBooksParallel } from '@/app/lib/serverApi';

const FEATURED_ROWS_CONFIG = [
  { title: 'Popular Right Now', topic: '', sort: 'popular' },
  { title: 'Fiction', topic: 'fiction', sort: 'popular' },
  { title: 'Adventure', topic: 'adventure', sort: 'popular' },
  { title: 'Poetry', topic: 'poetry', sort: 'popular' },
  { title: 'Philosophy', topic: 'philosophy', sort: 'popular' },
];

export async function getHomePageData() {
  // Fetch all rows in parallel on the server
  // Next.js will automatically deduplicate identical requests
  const requests = FEATURED_ROWS_CONFIG.map(({ topic, sort }) => ({
    page: 1,
    topic,
    sort,
  }));

  const results = await getBooksParallel(requests);

  // Map results to include title and extract first 20 books
  return FEATURED_ROWS_CONFIG.map((config, index) => {
    const apiResult = results[index];
    return {
      title: config.title,
      topic: config.topic,
      books: apiResult?.results?.slice(0, 20) || [],
      url: config.topic
        ? `https://gutendex.com/books/?topic=${config.topic}&sort=${config.sort}&page=1`
        : `https://gutendex.com/books/?sort=${config.sort}&page=1`,
    };
  });
}
