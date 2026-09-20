# SMAN 14 Bandung - 25th Reunion Design System

## Color Palette

Based on the commemorative pin design for "Reuni 25 Tahun SMA Negeri 14 Bandung".

### Primary Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `teal` | `#7BC8A4` | Primary actions, links, highlights, CTAs |
| `teal-light` | `#A8DFC4` | Hover states, subtle backgrounds |
| `teal-dark` | `#5AA884` | Active states, pressed buttons |

### Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `magenta` | `#C85A9A` | Secondary highlights, badges |
| `orange` | `#E8A040` | Warnings, countdown numbers, warm accents |
| `blue` | `#3A7CC8` | Information, links |
| `purple` | `#7A4AA0` | Special features, premium elements |
| `yellow` | `#C8D840` | Success states, notifications |

### Neutral Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `silver` | `#C0C0C0` | Borders, subtle dividers |
| `gray-50` | `#FAFAFA` | Page background |
| `gray-100` | `#F0F0F0` | Card backgrounds |
| `gray-200` | `#E4E4E4` | Subtle borders |
| `gray-600` | `#525252` | Body text |
| `gray-800` | `#262626` | Headings, emphasis |
| `gray-900` | `#171717` | Strong emphasis |

## Brand Alignment (Pin)

The site's brand voice derives from the commemorative pin: a mint field
with a silver ring and five color blocks (magenta, yellow, orange, blue,
purple) around a chunky "25".

| Element | Token | Notes |
|---------|-------|-------|
| Mint field | `teal-300` | Dominant surface of the mark; echoed in light-mode section washes |
| Silver ring | `silver-100..400` gradient | Frame of the mark; avoid as text color |
| Accent blocks | `magenta-500`, `yellow-400`, `orange-400`, `blue-500`, `purple-500` | Small doses only — never full sections |
| Year mark | `components/PinMark25.tsx` | Server component rendering the traced pin artwork (`public/25.svg`) via `next/image`; scales with size classes |
| Heading voice | Space Grotesk via `--font-display` | Matches the pin's rounded, technical letterforms; no true italic — never apply `italic` |

## Typography

### Font Stack
- Display/headings: `Space Grotesk` via `next/font` (`--font-display`, used with `.font-display`)
- Primary: `Inter`, `system-ui`, `-apple-system`, `sans-serif`
- Monospace: `JetBrains Mono`, `monospace`

### Type Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| `h1` | `2.5rem` (40px) | 800 | 1.2 |
| `h2` | `2rem` (32px) | 700 | 1.3 |
| `h3` | `1.5rem` (24px) | 600 | 1.4 |
| `body` | `1rem` (16px) | 400 | 1.6 |
| `small` | `0.875rem` (14px) | 400 | 1.5 |
| `xs` | `0.75rem` (12px) | 500 | 1.4 |

## Spacing

| Token | Value |
|-------|-------|
| `xs` | `0.25rem` (4px) |
| `sm` | `0.5rem` (8px) |
| `md` | `1rem` (16px) |
| `lg` | `1.5rem` (24px) |
| `xl` | `2rem` (32px) |
| `2xl` | `3rem` (48px) |
| `3xl` | `4rem` (64px) |

## Border Radius

| Token | Value |
|-------|-------|
| `sm` | `0.375rem` (6px) |
| `md` | `0.5rem` (8px) |
| `lg` | `0.75rem` (12px) |
| `xl` | `1rem` (16px) |
| `2xl` | `1.5rem` (24px) |
| `full` | `9999px` |

## Shadows

| Token | Usage |
|-------|-------|
| `shadow-sm` | Subtle elevation |
| `shadow-md` | Cards, dropdowns |
| `shadow-lg` | Modals, popovers |
| `shadow-teal` | `0 4px 20px rgba(123, 200, 164, 0.3)` - Teal glow for CTAs |

## Component Patterns

### Buttons
- Primary: `bg-teal-500 text-white hover:bg-teal-600`
- Secondary: `bg-white text-teal-600 border border-teal-500 hover:bg-teal-50`
- Ghost: `text-gray-600 hover:text-teal-500 hover:bg-gray-100`

### Cards
- Background: `bg-white`
- Border: `border border-gray-200`
- Radius: `rounded-xl`
- Shadow: `shadow-sm hover:shadow-md transition-shadow`

### Navigation
- Background: `bg-white/80 backdrop-blur-md`
- Border: `border-b border-gray-200`
- Active: `text-teal-600`
- Hover: `text-gray-900 hover:text-teal-500`

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | `640px` | Mobile landscape |
| `md` | `768px` | Tablet |
| `lg` | `1024px` | Desktop |
| `xl` | `1280px` | Large desktop |

## Accessibility

- Minimum contrast ratio: 4.5:1 for normal text
- Minimum contrast ratio: 3:1 for large text
- Focus visible: `ring-2 ring-teal-500 ring-offset-2`
- Reduced motion: `prefers-reduced-motion: reduce`

## Design Principles

1. **Clean & Professional** - Appropriate for a school reunion event
2. **Teal-Forward** - Primary color is teal/mint from the pin
3. **Colorful Accents** - Use magenta, orange, blue, purple, yellow sparingly
4. **Light & Airy** - Light background with good white space
5. **Mobile-First** - Responsive design starting from mobile
