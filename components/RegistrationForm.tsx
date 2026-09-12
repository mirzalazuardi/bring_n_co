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
}

export function RegistrationForm({ initialData }: RegistrationFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setError('Selected file exceeds the 4 MB limit.');
      return;
    }

    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validMimes.includes(file.type)) {
      setError('Only JPG, PNG, WebP images or PDF documents are accepted.');
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
      setError('Please upload your bank transfer receipt proof.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
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
        throw new Error(data.error || 'Failed to submit reunion registration');
      }

      setSuccess('Reunion registration submitted successfully!');
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while saving.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            Payment Verified & Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            Proof Rejected (Please re-upload)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            Verification Pending
          </span>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status Header if registered */}
      {initialData && (
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400">Current Status</p>
            <p className="text-sm font-medium text-slate-200 mt-0.5">
              Registration submitted on {new Date().toLocaleDateString()}
            </p>
          </div>
          {renderStatusBadge(initialData.status)}
        </div>
      )}

      {/* Error & Success Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-rose-300 bg-rose-950/50 border border-rose-800 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 text-sm text-emerald-300 bg-emerald-950/50 border border-emerald-800 rounded-lg">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Jersey Size Selector */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-2">
          Jersey Size <span className="text-rose-400">*</span>
        </label>
        <div className="grid grid-cols-4 gap-3">
          {JERSEY_SIZES.map((size) => (
            <label
              key={size}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                jerseySize === size
                  ? 'border-slate-300 bg-slate-800 text-white shadow'
                  : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
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
              <span className="text-[11px] text-slate-500 mt-0.5">
                {size === 'S' && 'Chest 96cm'}
                {size === 'M' && 'Chest 102cm'}
                {size === 'L' && 'Chest 108cm'}
                {size === 'XL' && 'Chest 114cm'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Class Group Select */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-2">
          Graduating Class Group <span className="text-rose-400">*</span>
        </label>
        <select
          value={classGroup}
          onChange={(e) => setClassGroup(e.target.value as (typeof CLASS_GROUPS)[number])}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          {CLASS_GROUPS.map((cg) => (
            <option key={cg} value={cg}>
              Class of {cg}
            </option>
          ))}
        </select>
      </div>

      {/* Phone Number */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-2">
          WhatsApp / Phone Number <span className="text-rose-400">*</span>
        </label>
        <input
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+62 812 3456 7890"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <p className="text-xs text-slate-500 mt-1">
          Used by committee for reunion announcements and jersey distribution.
        </p>
      </div>

      {/* Bank Transfer Proof Upload */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-2">
          Bank Transfer Proof Receipt <span className="text-rose-400">*</span>
        </label>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-slate-500 bg-slate-800/40 rounded-xl p-6 text-center cursor-pointer transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-200">
            {selectedFile ? selectedFile.name : 'Click to select transfer proof receipt'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Supports JPG, PNG, WebP or PDF (Max 4.0 MB)
          </p>
        </div>

        {/* Existing file link or preview */}
        {filePreview && (
          <div className="mt-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-300" />
              <span className="text-xs text-slate-300">
                {selectedFile ? 'Ready to upload' : 'Previously submitted proof'}
              </span>
            </div>
            <a
              href={filePreview}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-300 underline hover:text-white"
            >
              View Document
            </a>
          </div>
        )}
      </div>

      {/* Submit Action */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-6 bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950 font-bold rounded-xl shadow hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : initialData ? 'Update Registration' : 'Complete Registration'}
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}
