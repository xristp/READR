'use client';

import { useState, useEffect, useCallback } from 'react';

export function useTheme() {
    const [theme, setTheme] = useState('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem('readabook-theme');
        // Migrate old 'light' theme to 'dark'
        if (saved === 'light') {
            localStorage.setItem('readabook-theme', 'dark');
            setTheme('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        } else if (saved && ['dark', 'sepia'].includes(saved)) {
            setTheme(saved);
            document.documentElement.setAttribute('data-theme', saved);
        } else {
            setTheme('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }, []);

    const setThemeValue = useCallback((newTheme) => {
        if (!['dark', 'sepia'].includes(newTheme)) return;
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('readabook-theme', newTheme);
    }, []);

    const toggleTheme = useCallback(() => {
        const themes = ['dark', 'sepia'];
        const currentIndex = themes.indexOf(theme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        setThemeValue(nextTheme);
    }, [theme, setThemeValue]);

    return { theme, setTheme: setThemeValue, toggleTheme, mounted };
}
