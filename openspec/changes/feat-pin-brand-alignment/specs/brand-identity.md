# Capability: Brand Identity

## Purpose

Makes the reunion portal instantly recognizable as the same brand as the commemorative pin (Reuni 25 Tahun — SMA Negeri 14 Bandung) through typography, the color-blocked year mark, and mint-forward surfaces.

---

## Requirements

### REQ-BRAND-001: Brand heading voice

Homepage and shared heading typography MUST use the Space Grotesk display face (via the `--font-display` token), while body text MUST remain Inter.

#### Scenario: Heading rendering

- **Given** any page of the portal in light or dark theme
- **When** a visitor views headings (hero, section, card titles)
- **Then** headings render in Space Grotesk and paragraphs render in Inter
- **And** text contrast meets 4.5:1 body / 3:1 large text in both themes

---

### REQ-BRAND-002: Color-blocked year mark

The homepage hero MUST display the "25" year mark as a pin-style badge: rounded-square, silver ring, mint field, with magenta, yellow, orange, blue, and purple color blocks positioned to echo the physical pin.

#### Scenario: Badge presence

- **Given** the homepage rendered for any visitor
- **When** the hero is visible
- **Then** the color-blocked badge renders beside the "Tahun Persahabatan" caption
- **And** the badge renders without client-side JavaScript

#### Scenario: Badge scaling

- **Given** the homepage at any viewport width from 375px to 1440px
- **When** the hero layout responds across breakpoints
- **Then** the badge scales proportionally with no clipped blocks or distortion

---

### REQ-BRAND-003: Mint-forward light surfaces

Light-mode homepage sections MUST carry soft mint washes (hero and alternating sections), while dark mode MUST keep deep neutral surfaces.

#### Scenario: Light mode surface

- **Given** a visitor viewing the homepage in light theme
- **When** they scroll from hero through sections to the footer CTA
- **Then** hero, class strip, and footer CTA surfaces are mint-tinted, with text contrast preserved at 4.5:1

#### Scenario: Dark mode unchanged

- **Given** a visitor viewing the homepage in dark theme
- **When** they scroll the full page
- **Then** surfaces remain deep neutrals (existing dark palette) with no mint washes

---

## Out of scope

- Exact vector reproduction of the pin glyph (SVG path art)
- Navbar logo lockup and other pages' layouts
- Sponsorship PDF-derived branding (source material not readable)
