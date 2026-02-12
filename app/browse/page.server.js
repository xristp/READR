/**
 * Server-side data fetching for browse page
 * Fetches initial data based on topic parameter
 */

import { getBooksServer } from '@/app/lib/serverApi';

export async function getBrowsePageData(topic = '') {
  try {
    const data = await getBooksServer({
      page: 1,
      topic,
      sort: 'popular',
    });

    return {
      books: data.results || [],
      hasMore: !!data.next,
      next: data.next || null,
      count: data.count || 0,
    };
  } catch (error) {
    console.error('Error fetching browse page data:', error);
    return {
      books: [],
      hasMore: false,
      next: null,
      count: 0,
    };
  }
}
