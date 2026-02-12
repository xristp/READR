import { Inter, Literata } from 'next/font/google';
import './globals.css';
import Sidebar from '@/app/components/Sidebar';
import TopBar from '@/app/components/TopBar';
import MobileNav from '@/app/components/MobileNav';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const literata = Literata({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-literata',
});

export const metadata = {
  title: {
    default: 'READR — Free Public Domain Books',
    template: '%s | READR',
  },
  description:
    'Read over 77,000 free public domain books with a beautiful, distraction-free reading experience. Explore classics from Shakespeare, Austen, Dickens, and more.',
  keywords: ['books', 'reading', 'free books', 'public domain', 'literature', 'classics', 'ebooks', 'Project Gutenberg'],
  authors: [{ name: 'READR' }],
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon.png', type: 'image/png', sizes: '180x180' },
    ],
  },
  openGraph: {
    title: 'READR — Free Public Domain Books',
    description: 'Read over 77,000 free public domain books with a beautiful reading experience.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'READR — Free Public Domain Books',
    description: 'Read over 77,000 free public domain books with a beautiful reading experience.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('readabook-theme');
                  if (theme === 'light') {
                    localStorage.setItem('readabook-theme', 'dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else if (theme && ['dark','sepia'].includes(theme)) {
                    document.documentElement.setAttribute('data-theme', theme);
                  } else {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${literata.variable}`}>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <div className="app-shell">
          <Sidebar />
          <div className="main-scroll" data-main-scroll>
            <TopBar />
            <main id="main-content">{children}</main>
          </div>
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
