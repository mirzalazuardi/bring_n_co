'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, Upload, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

export function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > MAX_IMAGE_SIZE) {
      setError('Image size exceeds 4 MB.');
      return;
    }

    if (!selected.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    setError(null);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a memory photo to upload.');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (title.trim()) formData.append('title', title.trim());
      if (description.trim()) formData.append('description', description.trim());

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      setSuccess('Memory uploaded successfully! Redirecting to gallery...');
      setTimeout(() => {
        router.push('/gallery');
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during upload.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      {/* File Dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-700 hover:border-slate-500 bg-slate-800/40 rounded-xl p-6 text-center cursor-pointer transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />

        {preview ? (
          <div className="space-y-3">
            <div className="relative w-full max-w-sm mx-auto h-48 rounded-lg overflow-hidden border border-slate-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Selected preview"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xs text-slate-400">Click to change selected photo</p>
          </div>
        ) : (
          <div>
            <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-200">
              Select or drop an alumni memory photo
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports JPEG, PNG, WebP, GIF (Max 4.0 MB)
            </p>
          </div>
        )}
      </div>

      {/* Optional Title */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-1">
          Photo Title <span className="text-xs text-slate-500 font-normal">(Optional)</span>
        </label>
        <input
          type="text"
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Graduation Day 2001, Senior Trip"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      {/* Optional Description */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-1">
          Story / Description <span className="text-xs text-slate-500 font-normal">(Optional)</span>
        </label>
        <textarea
          rows={3}
          maxLength={300}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Who was in this photo? Where was it taken?"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      <button
        type="submit"
        disabled={isUploading || !file}
        className="w-full py-3 px-6 bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950 font-bold rounded-xl shadow hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm disabled:opacity-50"
      >
        {isUploading ? (
          'Uploading to Vercel Blob...'
        ) : (
          <>
            Upload to Reunion Gallery
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}
