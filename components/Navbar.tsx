'use client';

import React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Sparkles, Images, Upload, User, LogOut, LogIn } from 'lucide-react';

export function Navbar() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-300 via-slate-100 to-slate-400 flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-white group-hover:text-slate-200 transition-colors">
              Silver Reunion
            </span>
            <span className="block text-[10px] text-slate-400 font-medium -mt-1">
              Class of 2001
            </span>
          </div>
        </Link>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Home
          </Link>
          <Link
            href="/gallery"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Images className="w-3.5 h-3.5" />
            Gallery
          </Link>
          <Link
            href="/upload"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Share Photos
          </Link>
        </div>

        {/* Right Session Controls */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="w-24 h-8 bg-slate-800 animate-pulse rounded-lg" />
          ) : session ? (
            <div className="flex items-center gap-3">
              <Link
                href="/registration"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-slate-300" />
                <span>My Registration</span>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950 hover:opacity-90 transition-opacity shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
