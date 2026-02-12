/**
 * Server-side data fetching for search page
 * Fetches initial search results based on query parameter
 */

import { getBooksServer } from '@/app/lib/serverApi';

export async function getSearchPageData(query = '') {
  if (!query.trim()) {
    return {
      results: [],
      hasMore: false,
      next: null,
      count: 0,
    };
  }

  try {
    const data = await getBooksServer({
      page: 1,
      search: query.trim(),
      sort: 'popular',
    });

    return {
      results: data.results || [],
      hasMore: !!data.next,
      next: data.next || null,
      count: data.count || 0,
    };
  } catch (error) {
    console.error('Error fetching search page data:', error);
    return {
      results: [],
      hasMore: false,
      next: null,
      count: 0,
    };
  }
}
