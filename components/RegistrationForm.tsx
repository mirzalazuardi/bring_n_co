'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  Clock,
  ShieldCheck,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import {
  JERSEY_SIZES,
  CLASS_GROUPS,
  MAX_FILE_SIZE_BYTES,
} from '@/lib/validations/registration';

interface ExistingRegistration {
  id: string;
  jerseySize: (typeof JERSEY_SIZES)[number];
  classGroup: (typeof CLASS_GROUPS)[number];
  phone: string;
  bankTransferProofUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string | null;
}

interface RegistrationFormProps {
  initialData?: ExistingRegistration | null;
  initialName?: string | null;
}

export function RegistrationForm({ initialData, initialName }: RegistrationFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialName || '');
  const [jerseySize, setJerseySize] = useState<(typeof JERSEY_SIZES)[number]>(
    initialData?.jerseySize || 'L'
  );
  const [classGroup, setClassGroup] = useState<(typeof CLASS_GROUPS)[number]>(
    initialData?.classGroup || 'IPA-1'
  );
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(
    initialData?.bankTransferProofUrl || null
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('Ukuran file melebihi batas 4 MB.');
      return;
    }

    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validMimes.includes(file.type)) {
      setError('Hanya file JPG, PNG, WebP atau PDF yang diterima.');
      return;
    }

    setError(null);
    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!initialData && !selectedFile) {
      setError('Silakan unggah bukti transfer bank.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('jerseySize', jerseySize);
      formData.append('classGroup', classGroup);
      formData.append('phone', phone);
      if (selectedFile) {
        formData.append('proof', selectedFile);
      }

      const res = await fetch('/api/registration', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim pendaftaran reuni');
      }

      setSuccess('Pendaftaran reuni berhasil dikirim!');
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Terjadi kesalahan yang tidak terduga saat menyimpan.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            Pembayaran Terverifikasi
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
            <XCircle className="w-3.5 h-3.5" />
            Bukti Ditolak (Silakan Unggah Ulang)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
            <Clock className="w-3.5 h-3.5" />
            Menunggu Verifikasi
          </span>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {initialData && (
        <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Status Saat Ini</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5">
              Pendaftaran dikirim pada {new Date().toLocaleDateString('id-ID')}
            </p>
          </div>
          {renderStatusBadge(initialData.status)}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Nama Lengkap <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama sesuai identitas"
          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Ukuran Jersey <span className="text-red-500">*</span>
        </label>
        <a
          href="https://res.cloudinary.com/dhcmpwmu1/image/upload/v1791129511/images/805a2e3c-030b-4b47-957f-7d5e47f22f2b/original.jpg"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-teal-600 dark:text-teal-400 underline hover:text-teal-700 dark:hover:text-teal-300"
        >
          Lihat Panduan Ukuran
        </a>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8 mt-3">
          {JERSEY_SIZES.map((size) => (
            <label
              key={size}
              className={`flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                jerseySize === size
                  ? 'border-teal-300 dark:border-teal-600 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 shadow-sm'
                  : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <input
                type="radio"
                name="jerseySize"
                value={size}
                checked={jerseySize === size}
                onChange={() => setJerseySize(size)}
                className="sr-only"
              />
              <span className="text-lg font-bold">{size}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Kelompok Kelulusan <span className="text-red-500">*</span>
        </label>
        <select
          value={classGroup}
          onChange={(e) => setClassGroup(e.target.value as (typeof CLASS_GROUPS)[number])}
          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        >
          {CLASS_GROUPS.map((cg) => (
            <option key={cg} value={cg}>
              Kelas {cg}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Nomor WhatsApp / Telepon <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+62 812 3456 7890"
          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Digunakan panitia untuk pengumuman reuni dan distribusi jersey.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Bukti Transfer Bank <span className="text-red-500">*</span>
        </label>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-teal-300 dark:hover:border-teal-600 bg-gray-50 dark:bg-gray-700 rounded-xl p-6 text-center cursor-pointer transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {selectedFile ? selectedFile.name : 'Klik untuk memilih bukti transfer'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Mendukung JPG, PNG, WebP atau PDF (Maks 4.0 MB)
          </p>
        </div>

        {filePreview && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {selectedFile ? 'Siap diunggah' : 'Bukti yang sebelumnya dikirim'}
              </span>
            </div>
            <a
              href={filePreview}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-teal-600 dark:text-teal-400 underline hover:text-teal-700 dark:hover:text-teal-300"
            >
              Lihat Dokumen
            </a>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-50"
      >
        {isSubmitting ? 'Mengirim...' : initialData ? 'Perbarui Pendaftaran' : 'Selesaikan Pendaftaran'}
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}
