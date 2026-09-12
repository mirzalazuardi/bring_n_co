import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/SessionProvider';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Silver Reunion | 25th High School Reunion',
  description: 'Official portal for our 25th high school silver year reunion. Register, pick your jersey size, and share nostalgia photos.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col selection:bg-slate-300 selection:text-slate-950">
        <SessionProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
            Silver Reunion • 25th High School Reunion Celebration • Classes IPA-1..3 & IPS-1..4
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
