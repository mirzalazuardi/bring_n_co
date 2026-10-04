import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/components/SessionProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { StripBrowserExtensions } from '@/components/StripBrowserExtensions';
import { BackgroundMusic } from '@/components/BackgroundMusic';
import { Navbar } from '@/components/Navbar';
import { isUploadOpen } from '@/lib/upload-window';

const inter = Inter({ subsets: ['latin'] });

// Brand heading voice (matches the commemorative pin's rounded, technical
// letterforms) — exposed as a CSS variable, applied via the `.font-display`
// Tailwind token (see tailwind.config.ts fontFamily.display).
const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Reuni 25 Tahun | SMA Negeri 14 Bandung',
  description: 'Portal resmi perayaan reuni 25 tahun SMA Negeri 14 Bandung. Daftar, pilih ukuran jersey, dan bagikan foto kenangan bersama alumni.',
  // Canonical origin for resolving relative OG/twitter image URLs.
  // NEXTAUTH_URL is the canonical deployment URL and is always configured.
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'https://bring-n-co.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: 'Reuni 25 Tahun SMAN 14 Bandung',
    title: 'Reuni 25 Tahun | SMA Negeri 14 Bandung',
    description:
      'Portal resmi perayaan reuni 25 tahun SMA Negeri 14 Bandung. Daftar, pilih ukuran jersey, dan bagikan foto kenangan bersama alumni.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reuni 25 Tahun | SMA Negeri 14 Bandung',
    description:
      'Portal resmi perayaan reuni 25 tahun SMA Negeri 14 Bandung. Daftar, pilih ukuran jersey, dan bagikan foto kenangan bersama alumni.',
  },
  icons: {
    icon: [
      { url: '/favicon/favicon.ico', sizes: '48x48' },
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: '/favicon/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-computed gate: hides the top-bar "Unggah" links until the
  // configured offset after the event date. Admin paths are unaffected.
  const uploadOpen = isUploadOpen();

  return (
    <html lang="id" className={`scroll-smooth ${inter.className} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{(function(){function s(e){e.removeAttribute('bis_skin_checked');e.removeAttribute('bis_register')}document.querySelectorAll('[bis_skin_checked],[bis_register]').forEach(s);new MutationObserver(function(m){for(var i=0;i<m.length;i++){if(m[i].target.nodeType===1)s(m[i].target)}}).observe(document.documentElement,{childList:true,subtree:true,attributes:true})})()}catch(x){}`,
          }}
        />
      </head>
      <body className="bg-stone-50 dark:bg-gray-900 text-stone-900 dark:text-gray-100 min-h-screen flex flex-col selection:bg-teal-200 dark:selection:bg-teal-800 selection:text-teal-900 dark:selection:text-teal-100" suppressHydrationWarning>
        <StripBrowserExtensions />
        <BackgroundMusic />
        <ThemeProvider>
          <SessionProvider>
            <Navbar uploadOpen={uploadOpen} />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-stone-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-8 text-center text-sm text-stone-500 dark:text-gray-400">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <p className="font-medium text-stone-700 dark:text-gray-300">Reuni 25 Tahun SMA Negeri 14 Bandung</p>
                <p className="mt-1 text-xs text-stone-400 dark:text-gray-500">Kelas IPA-1 s.d. IPA-3 & IPS-1 s.d. IPS-4 &bull; Angkatan 2001</p>
              </div>
            </footer>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
