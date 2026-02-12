import Link from 'next/link';

export default function NotFound() {
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
                fontSize: '4rem',
                fontWeight: 700,
                letterSpacing: '-0.04em',
                background: 'linear-gradient(135deg, var(--color-accent, #b08968), #d4a574)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1,
            }}>
                404
            </div>
            <h1 style={{
                fontSize: 'var(--text-2xl, 1.5rem)',
                fontWeight: 'var(--weight-bold, 700)',
                color: 'var(--color-text-primary, #1d1d1f)',
                letterSpacing: '-0.025em',
            }}>
                Page not found
            </h1>
            <p style={{
                fontSize: 'var(--text-sm, 0.875rem)',
                color: 'var(--color-text-secondary, #6e6e73)',
                maxWidth: 400,
                lineHeight: 1.6,
            }}>
                The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            <Link
                href="/"
                style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem 2rem',
                    fontSize: 'var(--text-sm, 0.875rem)',
                    fontWeight: 'var(--weight-semibold, 600)',
                    color: '#fff',
                    background: 'var(--color-accent, #b08968)', borderRadius: '9999px',
                    textDecoration: 'none',
                    transition: 'background 150ms ease',
                }}
            >
                Go home
            </Link>
        </div>
    );
}
