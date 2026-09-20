# Capability: Homepage Presentation

## Purpose

Gives returning alumni a commemorative, layered first impression of the reunion portal, communicating occasion and care through depth and typography without changing any functionality.

---

## Requirements

### REQ-HOMEPRES-001: Parallax hero depth

The homepage hero MUST render at least three independent backdrop layers (year watermark, pin-color orbs, grain) whose positions respond to scroll and pointer movement at distinct rates, while foreground content (headline, CTAs, countdown) MUST remain fixed relative to the layout.

#### Scenario: Layered scroll response

- **Given** a visitor on the homepage with a viewport taller than 640px
- **When** they scroll the hero partially out of view
- **Then** backdrop layers translate at visibly different rates and the headline, CTAs, and countdown do not translate
- **And** layer motion uses transform-only animations with no layout shift

#### Scenario: Reduced motion

- **Given** a visitor whose OS sets `prefers-reduced-motion: reduce`
- **When** the homepage loads and they scroll
- **Then** backdrop layers render in a static composition with no scroll- or pointer-driven motion

---

### REQ-HOMEPRES-002: Scroll reveal

Below-fold homepage sections MUST remain hidden (opacity 0, translated down) until they enter the viewport, then animate to full visibility exactly once per page load.

#### Scenario: First reveal

- **Given** a below-fold section (class strip, feature cards, or footer CTA)
- **When** it first intersects the viewport at 15% visibility
- **Then** it animates to fully visible within 600ms and remains visible for the rest of the page session, even if scrolled out and back

#### Scenario: Reduced motion

- **Given** a visitor with `prefers-reduced-motion: reduce`
- **When** the homepage loads
- **Then** all sections are fully visible immediately with no hidden state

---

### REQ-HOMEPRES-003: Display typography token

The system MUST provide a `font-display` token (Playfair Display via `next/font`) applied to hero and section headings, while body text MUST remain in Inter.

#### Scenario: Heading voice

- **Given** the homepage rendered in light or dark theme
- **When** a visitor views the hero headline or section headings
- **Then** headings render in the display serif and paragraphs render in Inter
- **And** text contrast meets 4.5:1 for body text and 3:1 for large headings in both themes

---

### REQ-HOMEPRES-004: Functional parity

Homepage behavior MUST be identical to the pre-change homepage.

#### Scenario: Anonymous visitor

- **Given** a visitor who is not signed in
- **When** they click the primary hero CTA
- **Then** they navigate to `/login`

#### Scenario: Signed-in, unregistered visitor

- **Given** a signed-in visitor with no existing registration
- **When** they click the primary hero CTA
- **Then** they navigate to `/registration`

#### Scenario: Registered visitor

- **Given** a signed-in visitor with an existing registration
- **When** the homepage loads
- **Then** the primary CTA shows their verification status and links to `/registration`

---

## Out of scope

- Navbar styling, scroll-progress indicators, and any other page's layout (gallery, registration, upload) — covered by future changes
- Countdown and slideshow behavior — specced in the bootstrap capability
- Reduced-motion behavior of other pages
