import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EventCountdown } from '@/components/EventCountdown';
import {
  Sparkles,
  Shirt,
  Images,
  ShieldCheck,
  ArrowRight,
  GraduationCap,
  Users,
} from 'lucide-react';

export const revalidate = 60; // 60s ISR for Vercel Hobby efficiency

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  let userRegistration = null;
  if (session && session.user && (session.user as { id?: string }).id) {
    userRegistration = await prisma.registration.findUnique({
      where: { userId: (session.user as { id: string }).id },
    });
  }

  const classes = ['IPA-1', 'IPA-2', 'IPA-3', 'IPS-1', 'IPS-2', 'IPS-3', 'IPS-4'];

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 px-4 sm:px-6 lg:px-8 text-center border-b border-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/40 via-transparent to-transparent pointer-events-none" />

        <div className="relative max-w-4xl mx-auto space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-300 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-slate-300" />
            <span>Celebrating 25 Years of Friendship & Achievements</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400">
            High School Silver Year Reunion
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Welcome home alumni! Reconnect with classmates, reserve your commemorative 25th anniversary jersey, and relive our golden memories together.
          </p>

          {/* Event Countdown */}
          <div className="pt-4 pb-2">
            <EventCountdown />
          </div>

          {/* Main Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {userRegistration ? (
              <Link
                href="/registration"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Registration Status: {userRegistration.status}</span>
              </Link>
            ) : (
              <Link
                href={session ? '/registration' : '/login'}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 text-slate-950 font-extrabold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-xl shadow-slate-900/50"
              >
                <Shirt className="w-4 h-4" />
                <span>Complete Reunion Registration</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            <Link
              href="/gallery"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Images className="w-4 h-4" />
              <span>Explore Memory Gallery</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Graduating Classes Banner */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-900 bg-slate-900/40">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-slate-400 font-semibold">
            <GraduationCap className="w-4 h-4 text-slate-400" />
            Welcoming Alumni Across All 7 Classes
          </div>
          <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
            {classes.map((cls) => (
              <span
                key={cls}
                className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs sm:text-sm font-bold text-slate-200 shadow-sm"
              >
                Class of {cls}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <Shirt className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Official Silver Jersey</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Select your custom size (S, M, L, XL). High quality commemorative fabric customized with your graduating class.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Simple Bank Proof Upload</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Upload your bank transfer receipt directly from your phone. Our committee verifies and confirms your admission ticket.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <Images className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Community Photo Stream</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Browse the live slideshow showcasing old high school memories and present snapshots uploaded by classmates.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
