'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="Salin nomor rekening"
      aria-label="Salin nomor rekening"
      className={className ?? 'inline-flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors'}
    >
      {copied ? (
        <><Check className="w-3.5 h-3.5" /><span>Tersalin!</span></>
      ) : (
        <><Copy className="w-3.5 h-3.5" /><span>Salin</span></>
      )}
    </button>
  );
}
