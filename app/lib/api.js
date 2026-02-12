const GUTENDEX_BASE = 'https://gutendex.com';

/**
 * Fetch books from Gutendex API
 */
export async function getBooks({ page = 1, search = '', topic = '', sort = 'popular' } = {}) {
    const params = new URLSearchParams();
    params.set('page', page.toString());

    if (search) params.set('search', search);
    if (topic) params.set('topic', topic);

    if (sort === 'popular') {
        params.set('sort', 'popular');
    }

    params.set('mime_type', 'text/plain');

    const res = await fetch(`${GUTENDEX_BASE}/books/?${params.toString()}`, {
        next: { revalidate: 3600 },
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch books: ${res.status}`);
    }

    return res.json();
}

/**
 * Fetch a single book by ID
 */
export async function getBook(id) {
    const res = await fetch(`${GUTENDEX_BASE}/books/${id}/`, {
        next: { revalidate: 3600 },
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch book ${id}: ${res.status}`);
    }

    return res.json();
}

/**
 * Get the plain text URL for a book
 */
export function getBookTextUrl(book) {
    if (!book?.formats) return null;

    // Try UTF-8 first, then US-ASCII
    return (
        book.formats['text/plain; charset=utf-8'] ||
        book.formats['text/plain; charset=us-ascii'] ||
        book.formats['text/plain'] ||
        null
    );
}

/**
 * Get the cover image URL for a book
 */
export function getBookCoverUrl(book) {
    if (!book?.formats) return null;
    return book.formats['image/jpeg'] || null;
}

/**
 * Fetch and parse book text content
 */
export async function getBookText(id) {
    const book = await getBook(id);
    const textUrl = getBookTextUrl(book);

    if (!textUrl) {
        throw new Error('No text format available for this book');
    }

    const res = await fetch(textUrl);
    if (!res.ok) {
        throw new Error(`Failed to fetch book text: ${res.status}`);
    }

    const rawText = await res.text();
    return parseBookText(rawText);
}

/**
 * Parse raw Gutenberg text into chapters
 */
export function parseBookText(rawText) {
    // Strip Gutenberg header and footer
    const startMarkers = [
        '*** START OF THE PROJECT GUTENBERG',
        '*** START OF THIS PROJECT GUTENBERG',
        '***START OF THE PROJECT GUTENBERG',
    ];
    const endMarkers = [
        '*** END OF THE PROJECT GUTENBERG',
        '*** END OF THIS PROJECT GUTENBERG',
        '***END OF THE PROJECT GUTENBERG',
        'End of the Project Gutenberg',
        'End of Project Gutenberg',
    ];

    let text = rawText;

    for (const marker of startMarkers) {
        const idx = text.indexOf(marker);
        if (idx !== -1) {
            const lineEnd = text.indexOf('\n', idx);
            text = text.substring(lineEnd + 1);
            break;
        }
    }

    for (const marker of endMarkers) {
        const idx = text.indexOf(marker);
        if (idx !== -1) {
            text = text.substring(0, idx);
            break;
        }
    }

    text = text.trim();

    // Split into chapters
    const chapterPatterns = [
        /^(CHAPTER\s+[IVXLCDM\d]+\.?.*)/gim,
        /^(Chapter\s+[IVXLCDM\d]+\.?.*)/gm,
        /^(BOOK\s+[IVXLCDM\d]+\.?.*)/gim,
        /^(PART\s+[IVXLCDM\d]+\.?.*)/gim,
        /^(ACT\s+[IVXLCDM\d]+\.?.*)/gim,
        /^(SCENE\s+[IVXLCDM\d]+\.?.*)/gim,
    ];

    let chapters = [];
    let splitPattern = null;

    for (const pattern of chapterPatterns) {
        const matches = [...text.matchAll(pattern)];
        if (matches.length >= 2) {
            splitPattern = pattern;
            break;
        }
    }

    if (splitPattern) {
        const parts = text.split(splitPattern).filter(Boolean);

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i].trim();
            if (!part) continue;

            // Check if this part looks like a chapter heading
            const isHeading = /^(CHAPTER|Chapter|BOOK|PART|ACT|SCENE)\s+/i.test(part);

            if (isHeading && i + 1 < parts.length) {
                chapters.push({
                    title: part.replace(/\r?\n/g, ' ').trim(),
                    content: parts[i + 1].trim(),
                });
                i++; // Skip the content part
            } else if (isHeading) {
                chapters.push({
                    title: part.replace(/\r?\n/g, ' ').trim(),
                    content: '',
                });
            } else if (chapters.length === 0) {
                // Preface or intro before first chapter
                chapters.push({
                    title: 'Preface',
                    content: part,
                });
            }
        }
    }

    // If no chapters detected, split by approximate page length
    if (chapters.length === 0) {
        const CHARS_PER_SECTION = 5000;
        const paragraphs = text.split(/\n\s*\n/);
        let currentChapter = { title: 'Section 1', content: '' };
        let sectionNum = 1;

        for (const para of paragraphs) {
            if (currentChapter.content.length + para.length > CHARS_PER_SECTION && currentChapter.content.length > 0) {
                chapters.push(currentChapter);
                sectionNum++;
                currentChapter = { title: `Section ${sectionNum}`, content: '' };
            }
            currentChapter.content += (currentChapter.content ? '\n\n' : '') + para.trim();
        }

        if (currentChapter.content) {
            chapters.push(currentChapter);
        }
    }

    return { chapters, totalChapters: chapters.length };
}

/**
 * Get popular books for the homepage
 */
export async function getPopularBooks(count = 12) {
    const data = await getBooks({ page: 1, sort: 'popular' });
    return data.results.slice(0, count);
}

/**
 * Genre/topic mapping
 */
export const GENRES = [
    { id: 'fiction', label: 'Fiction' },
    { id: 'adventure', label: 'Adventure' },
    { id: 'romance', label: 'Romance' },
    { id: 'mystery', label: 'Mystery' },
    { id: 'science fiction', label: 'Sci-Fi' },
    { id: 'horror', label: 'Horror' },
    { id: 'poetry', label: 'Poetry' },
    { id: 'history', label: 'History' },
    { id: 'philosophy', label: 'Philosophy' },
    { id: 'biography', label: 'Biography' },
    { id: 'money', label: 'Finance' },
    { id: 'humor', label: 'Humor' },
];

/**
 * Format author name from "Last, First" to "First Last"
 */
export function formatAuthorName(author) {
    if (!author?.name) return 'Unknown Author';

    const parts = author.name.split(', ');
    if (parts.length === 2) {
        return `${parts[1]} ${parts[0]}`;
    }
    return author.name;
}

/**
 * Format download count
 */
export function formatDownloadCount(count) {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
}
