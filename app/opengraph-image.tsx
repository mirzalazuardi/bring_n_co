import React from 'react';
import { ImageResponse } from 'next/og';

export const alt = 'Reuni Perak — SMAN 14 Bandung, Angkatan 2001';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Pin color blocks — echoes the commemorative pin artwork (brand palette in
// tailwind.config.ts). Satori (next/og) needs inline styles, not Tailwind
// classes, and only supports flexbox layout.
const BLOCKS = ['#c85a9a', '#c8d840', '#e8a040', '#3a7cc8', '#7a4aa0'];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          backgroundColor: '#f0faf5',
        }}
      >
        {/* Top: pin-style year mark + school line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 132,
              height: 132,
              borderRadius: 34,
              backgroundColor: '#c0c0c0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 116,
                height: 116,
                borderRadius: 28,
                backgroundColor: '#7bc8a4',
                color: '#1f4736',
                fontSize: 62,
                fontWeight: 700,
                letterSpacing: -2,
              }}
            >
              25
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                fontSize: 26,
                letterSpacing: 6,
                color: '#3a8564',
              }}
            >
              SMA NEGERI 14 BANDUNG
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {BLOCKS.map((color) => (
                <div
                  key={color}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    backgroundColor: color,
                    display: 'flex',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Middle: heading */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 96,
              fontWeight: 700,
              color: '#262626',
              letterSpacing: -3,
            }}
          >
            Reuni Perak
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 66,
              fontWeight: 700,
              color: '#3a8564',
              letterSpacing: -1,
            }}
          >
            SMAN 14 Bandung &middot; Angkatan 2001
          </div>
        </div>

        {/* Bottom: caption + class range */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', fontSize: 30, color: '#71717a' }}>
            25 Tahun Persahabatan
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: '#3a8564',
                display: 'flex',
              }}
            />
            <div style={{ display: 'flex', fontSize: 30, color: '#71717a' }}>
              IPA-1&ndash;3 &middot; IPS-1&ndash;4
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
