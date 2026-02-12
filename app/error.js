'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
    useEffect(() => {
        console.error('Application error:', error);
    }, [error]);

    return (
        <div style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            gap: '1rem',
        }}>
            <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--color-accent-light, rgba(176,137,104,0.10))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.5rem',
            }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #b08968)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            </div>
            <h1 style={{
                fontSize: 'var(--text-2xl, 1.5rem)',
                fontWeight: 'var(--weight-bold, 700)',
                color: 'var(--color-text-primary, #1d1d1f)',
                letterSpacing: '-0.025em',
            }}>
                Something went wrong
            </h1>
            <p style={{
                fontSize: 'var(--text-sm, 0.875rem)',
                color: 'var(--color-text-secondary, #6e6e73)',
                maxWidth: 400,
                lineHeight: 1.6,
            }}>
                We hit an unexpected error. This is usually temporary — try refreshing the page.
            </p>
            <button
                onClick={reset}
                type="button"
                style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem 2rem',
                    fontSize: 'var(--text-sm, 0.875rem)',
                    fontWeight: 'var(--weight-semibold, 600)',
                    color: '#fff',
                    background: 'var(--color-accent, #b08968)',
                    border: 'none',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    transition: 'background 150ms ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-accent-hover, #9c7856)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--color-accent, #b08968)';
                }}
            >
                Try again
            </button>
        </div>
    );
}
