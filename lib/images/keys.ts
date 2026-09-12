import type { VariantName } from '@/lib/images/schemas';

/**
 * Deterministic storage keys — the original filename NEVER becomes part of
 * the storage path (spec: images/{imageId}/original|{variant}.webp).
 */
export function originalKey(imageId: string): string {
  return `images/${imageId}/original`;
}

export function variantKey(imageId: string, variant: VariantName): string {
  return `images/${imageId}/${variant}.webp`;
}
