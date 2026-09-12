import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EventCountdown } from '@/components/EventCountdown';
import { ParallaxHero } from '@/components/ParallaxHero';
import { PinMark25 } from '@/components/PinMark25';
import { Reveal } from '@/components/Reveal';
import {
  Shirt,
  Images,
  ShieldCheck,
  ArrowRight,
  Camera,
  Users,
} from 'lucide-react';

export const revalidate = 60;

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
    <div className="min-h-screen">
      {/* Hero — warm, grounded, asymmetric, with parallax depth layers */}
      <section className="relative overflow-hidden bg-teal-50 dark:bg-gray-900 border-b border-stone-200 dark:border-gray-800">
        <ParallaxHero>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
            <div className="grid lg:grid-cols-5 gap-12 items-center">
              {/* Left content — 3 cols */}
              <div className="lg:col-span-3 space-y-8">
                {/* Pin-style year badge */}
                <div className="flex items-center gap-4">
                  <PinMark25 className="h-24 w-24 sm:h-28 sm:w-28 shrink-0" />
                  <div className="border-l-2 border-teal-200 dark:border-teal-800 pl-4 space-y-0.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400 dark:text-gray-500">
                      Tahun
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400 dark:text-gray-500">
                      Persahabatan
                    </p>
                  </div>
                </div>

                <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-stone-900 dark:text-gray-100 leading-[1.05] text-balance">
                  Reuni Akbar
                  <br />
                  <span className="text-teal-600 dark:text-teal-400">
                    SMA Negeri 14
                  </span>
                  <br />
                  Bandung
                </h1>

                <p className="text-lg sm:text-xl text-stone-600 dark:text-gray-400 max-w-lg leading-relaxed">
                  25 tahun berlalu, kenangan tetap hidup. Kembali bertemu teman
                  sekelas, kenang masa muda, dan buat kenangan baru bersama.
                </p>

                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {userRegistration ? (
                    <Link
                      href="/registration"
                      className="btn-primary flex items-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Status: {userRegistration.status}
                    </Link>
                  ) : (
                    <Link
                      href={session ? '/registration' : '/login'}
                      className="btn-primary flex items-center gap-2 text-base"
                    >
                      <Shirt className="w-5 h-5" />
                      Daftar Sekarang
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}

                  <Link
                    href="/gallery"
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Images className="w-4 h-4" />
                    Lihat Galeri
                  </Link>
                </div>
              </div>

              {/* Right — countdown, offset */}
              <div className="lg:col-span-2">
                <EventCountdown />
              </div>
            </div>
          </div>
        </ParallaxHero>
      </section>

      {/* Classes — casual, not a "banner" */}
      <Reveal className="py-10 px-4 sm:px-6 lg:px-8 bg-teal-50/50 dark:bg-gray-900 border-b border-stone-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-500 dark:text-gray-400 shrink-0">
              <Users className="w-4 h-4" />
              7 Angkatan
            </div>
            <div className="h-px sm:h-6 sm:w-px bg-stone-200 dark:bg-gray-700" />
            <div className="flex flex-wrap gap-2">
              {classes.map((cls) => (
                <span
                  key={cls}
                  className="px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-gray-800 text-sm font-medium text-stone-600 dark:text-gray-400 border border-stone-200 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-600 hover:text-teal-700 dark:hover:text-teal-400 transition-colors cursor-default"
                >
                  {cls}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* Features — asymmetric, not 3 identical cards */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-stone-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Big feature — Jersey */}
          <Reveal>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-stone-200 dark:border-gray-700 p-8 sm:p-10 overflow-hidden group hover:border-teal-300 dark:hover:border-teal-700 transition-colors">
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 dark:bg-teal-900/20 rounded-bl-[80px] -z-0" />
              <div className="relative z-10 sm:max-w-md">
                <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-4">
                  <Shirt className="w-5 h-5" />
                </div>
                <h3 className="font-display text-3xl font-bold text-stone-900 dark:text-gray-100 mb-3">
                  Jersey Eksklusif 25 Tahun
                </h3>
                <p className="text-stone-600 dark:text-gray-400 leading-relaxed mb-4">
                  Kain premium, desain khusus angkatan. Pilih ukuran S, M, L,
                  atau XL — kaos kenangan yang cuma ada sekali seumur hidup.
                </p>
                <Link
                  href={session ? '/registration' : '/login'}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                >
                  Pesan jersey
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </Reveal>

          {/* Two smaller features side by side */}
          <Reveal>
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Bank Proof */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-stone-200 dark:border-gray-700 p-6 sm:p-8 group hover:border-pink-300 dark:hover:border-pink-700 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center text-pink-600 dark:text-pink-400 mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-display text-xl font-bold text-stone-900 dark:text-gray-100 mb-2">
                  Upload Bukti Bayar
                </h3>
                <p className="text-stone-600 dark:text-gray-400 text-sm leading-relaxed">
                  Transfer bank, screenshot bukti, upload dari HP. Panitia
                  verifikasi dan konfirmasi — langsung beres.
                </p>
              </div>

              {/* Gallery */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-stone-200 dark:border-gray-700 p-6 sm:p-8 group hover:border-orange-300 dark:hover:border-orange-700 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4">
                  <Camera className="w-5 h-5" />
                </div>
                <h3 className="font-display text-xl font-bold text-stone-900 dark:text-gray-100 mb-2">
                  Galeri Foto Kenangan
                </h3>
                <p className="text-stone-600 dark:text-gray-400 text-sm leading-relaxed">
                  Foto masa SMA, foto terkini — slideshow live yang terus
                  update. Upload foto sendiri, lihat foto teman.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer CTA — simple, not salesy */}
      <Reveal className="py-16 px-4 sm:px-6 lg:px-8 bg-teal-50/40 dark:bg-gray-900 border-t border-stone-200 dark:border-gray-800 text-center">
        <div className="max-w-xl mx-auto space-y-4">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 dark:text-gray-100 text-balance">
            Sudah siap kembali?
          </h2>
          <p className="text-stone-500 dark:text-gray-400">
            Daftar sekarang, pilih jersey, dan sambung kembali dengan teman
            lama.
          </p>
          <div className="pt-2">
            <Link
              href={session ? '/registration' : '/login'}
              className="btn-primary inline-flex items-center gap-2"
            >
              Mulai Daftar
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
