'use client';

import { useState, useEffect } from 'react';

/**
 * Scans localStorage for reading progress entries and returns
 * the most recently read book IDs, sorted by last read time.
 */
export function useRecentlyRead(limit = 4) {
    const [recentIds, setRecentIds] = useState([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        try {
            const entries = [];
            const prefix = 'readabook-progress-';

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key?.startsWith(prefix)) continue;
                let data;
                try {
                    data = JSON.parse(localStorage.getItem(key) || 'null');
                } catch {
                    continue; // Corrupted entry — skip
                }
                if (data?.lastRead && data.chapter > 0) {
                    entries.push({
                        id: key.replace(prefix, ''),
                        lastRead: data.lastRead,
                        chapter: data.chapter,
                    });
                }
            }

            // Sort by most recent first
            entries.sort((a, b) => b.lastRead - a.lastRead);
            setRecentIds(entries.slice(0, limit).map((e) => e.id));
        } catch {
            // localStorage not available
        }
    }, [limit]);

    return { recentIds, mounted };
}
