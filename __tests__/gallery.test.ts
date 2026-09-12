import { describe, it, expect } from 'vitest';
import type { GalleryItem } from '../components/GallerySlideshow';

describe('Gallery Data Contracts', () => {
  it('should validate gallery item data structures', () => {
    const item: GalleryItem = {
      id: 'img-123',
      url: 'https://public.blob.vercel-storage.com/gallery/img-123.jpg',
      title: 'Class of 2001 Farewell',
      description: 'Taken at the school hall',
      createdAt: '2026-09-12T10:00:00.000Z',
      user: {
        name: 'Andi Saputra',
        email: 'andi@example.com',
      },
    };

    expect(item.id).toBe('img-123');
    expect(item.url).toContain('https://');
    expect(item.user.name).toBe('Andi Saputra');
  });
});
