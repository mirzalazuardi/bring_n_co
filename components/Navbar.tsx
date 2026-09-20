'use client';

import React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from '@/components/ThemeProvider';
import {
  Images,
  Upload,
  User,
  LogOut,
  LogIn,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';

export function Navbar({ uploadOpen = true }: { uploadOpen?: boolean }) {
  const { data: session, status } = useSession();
  const { theme, toggleTheme } = useTheme();
  const isLoading = status === 'loading';
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // First name for the top bar — fall back to the email local part like the
  // registration page greeting does.
  const displayName =
    session?.user?.name?.split(' ')[0] || session?.user?.email?.split('@')[0] || '';

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-stone-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 flex items-center justify-between">
          {/* Logo — simple, not a startup badge */}
          <Link href="/" className="flex items-baseline gap-2 group">
            <span className="text-lg font-bold text-stone-900 dark:text-gray-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              SMAN 14 - 2001
            </span>
            <span className="text-xs font-medium text-stone-400 dark:text-gray-500 hidden sm:inline">
              Reuni 25 Tahun
            </span>
          </Link>

          {/* Center Links — plain, not a pill */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className="px-3 py-1.5 text-sm font-medium text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-gray-100 transition-colors"
            >
              Beranda
            </Link>
            <Link
              href="/gallery"
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-gray-100 transition-colors"
            >
              <Images className="w-3.5 h-3.5" />
              Galeri
            </Link>
            {uploadOpen && (
              <Link
                href="/upload"
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-gray-100 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Unggah
              </Link>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300 transition-colors"
              title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>

            {isLoading ? (
              <div className="w-20 h-8 bg-stone-100 dark:bg-gray-800 animate-pulse rounded-lg" />
            ) : session ? (
              <div className="hidden sm:flex items-center gap-2">
                <span
                  className="text-sm font-medium text-stone-700 dark:text-gray-300"
                  title={session.user?.name || session.user?.email || ''}
                >
                  {displayName}
                </span>
                <Link
                  href="/registration"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  Pendaftaran
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  title="Keluar"
                  className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden sm:flex items-center gap-1.5 btn-primary text-sm py-2"
              >
                <LogIn className="w-3.5 h-3.5" />
                Masuk
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="px-4 py-3 space-y-1">
            <Link
              href="/"
              className="block px-3 py-2 text-sm font-medium text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Beranda
            </Link>
            <Link
              href="/gallery"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Images className="w-3.5 h-3.5" />
              Galeri
            </Link>
            {uploadOpen && (
              <Link
                href="/upload"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-gray-100 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Upload className="w-3.5 h-3.5" />
                Unggah Foto
              </Link>
            )}

            <div className="border-t border-stone-200 dark:border-gray-700 my-2" />

            {isLoading ? (
              <div className="h-9 bg-stone-100 dark:bg-gray-800 animate-pulse rounded-lg" />
            ) : session ? (
              <>
                <p className="px-3 py-1 text-xs font-medium text-stone-400 dark:text-gray-500">
                  Masuk sebagai {displayName}
                </p>
                <Link
                  href="/registration"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-teal-700 dark:text-teal-400 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-3.5 h-3.5" />
                  Pendaftaran Saya
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut({ callbackUrl: '/' });
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-gray-100 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold btn-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LogIn className="w-3.5 h-3.5" />
                Masuk / Daftar
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
