'use client';

import { useState, useEffect, useCallback } from 'react';

export function useReadingProgress(bookId) {
    const [progress, setProgress] = useState({ chapter: 0, scrollPosition: 0 });

    const storageKey = `readabook-progress-${bookId}`;

    useEffect(() => {
        if (!bookId) return;
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                setProgress(JSON.parse(saved));
            }
        } catch {
            // Ignore parse errors
        }
    }, [bookId, storageKey]);

    const saveProgress = useCallback((chapter, scrollPosition = 0) => {
        const newProgress = { chapter, scrollPosition, lastRead: Date.now() };
        setProgress(newProgress);
        try {
            localStorage.setItem(storageKey, JSON.stringify(newProgress));
        } catch {
            // Quota exceeded
        }
    }, [storageKey]);

    const clearProgress = useCallback(() => {
        setProgress({ chapter: 0, scrollPosition: 0 });
        localStorage.removeItem(storageKey);
    }, [storageKey]);

    return { progress, saveProgress, clearProgress };
}
