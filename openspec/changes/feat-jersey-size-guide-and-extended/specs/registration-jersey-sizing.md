# Capability: Registration Jersey Sizing

## Purpose

Lets every alumni choose a jersey that fits at registration time: the form offers the full size run S–5XL, points to the committee's official size-guidelines image right where the choice is made, and no longer shows per-size chest measurements that duplicate (and can contradict) the guidelines image.

---

## Requirements

### REQ-SIZE-001: Size guide link above the jersey field

The registration form MUST render a "Lihat Panduan Ukuran" link directly above the "Ukuran Jersey" field options, targeting the committee's size-guidelines image (`https://res.cloudinary.com/dhcmpwmu1/image/upload/v1791129511/images/805a2e3c-030b-4b47-957f-7d5e47f22f2b/original.jpg`) and opening it in a new tab.

#### Scenario: Guide link opens guidelines image

- **Given** an authenticated alumni on the registration form
- **When** they look at the "Ukuran Jersey" field before selecting an option
- **Then** a "Lihat Panduan Ukuran" link appears above the size options
- **And** activating it opens the guidelines image in a new browser tab (`target="_blank"` with `rel="noopener noreferrer"`)

---

### REQ-SIZE-002: Extended size options S–5XL

The registration form MUST offer jersey sizes S, M, L, XL, 2XL, 3XL, 4XL, and 5XL as selectable options, and the registration API MUST accept exactly that set (rejecting anything else).

#### Scenario: All eight sizes selectable

- **Given** an authenticated alumni on the registration form
- **When** they view the "Ukuran Jersey" options
- **Then** exactly eight size tiles render: S, M, L, XL, 2XL, 3XL, 4XL, 5XL
- **And** selecting any of the eight and submitting stores that value on their registration

#### Scenario: API rejects non-listed sizes

- **Given** a POST to `/api/registration` with a valid session
- **When** the `jerseySize` field is any value outside the eight-size set (e.g. `XXL`)
- **Then** the API responds 400 with a validation error

---

### REQ-SIZE-003: No chest-measurement captions

The registration form MUST NOT display per-size chest measurements ("Dada …cm") under the size options.

#### Scenario: Tiles show size labels only

- **Given** an authenticated alumni viewing the jersey size options
- **When** the tiles render in light or dark theme
- **Then** each tile shows only its size label (e.g. "2XL") with no "Dada …cm" caption text
- **And** the options grid remains usable on narrow (375px) viewports

---

## Out of scope

- Structured per-size chest metadata in code (guidelines image is the single source of truth)
- In-page modal/lightbox preview of the guidelines image
- Re-hosting the guidelines image outside Cloudinary
