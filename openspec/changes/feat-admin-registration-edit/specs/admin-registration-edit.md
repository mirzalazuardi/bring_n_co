# Capability: Admin Registration Editing

## Purpose

Lets the reunion committee correct registration data (jersey size, class group, phone) directly from the admin console without database access, alongside the existing verification workflow.

---

## Requirements

### REQ-EDIT-001: Partial data edit via admin API

The admin PATCH endpoint MUST accept optional `jerseySize` (S–5XL), `classGroup` (IPA-1…IPS-4), and `phone` fields, applying only the provided fields and rejecting payloads with no updatable field or invalid values (400).

#### Scenario: Committee fixes a phone typo

- **Given** an authenticated admin and an existing registration
- **When** a PATCH sends only `phone` with a valid number
- **Then** the response returns the updated row with the new phone and unchanged jersey/class/status

#### Scenario: Invalid payload is rejected

- **Given** an authenticated admin
- **When** a PATCH sends an empty body, an unknown jersey size (e.g. `XXL`), or a malformed phone
- **Then** the API responds 400 with a validation error

---

### REQ-EDIT-002: Inline row editor in the admin table

The admin registrations table MUST offer a per-row edit action that turns the jersey, class, and phone cells into editable controls with Simpan/Batal actions, saving all three fields in a single PATCH.

#### Scenario: Edit and save a row

- **Given** an admin viewing the registrations table
- **When** they click the row's pencil button, change jersey/class/phone, and click Simpan
- **Then** the row refetches from the server response and shows the new values; errors (e.g. invalid phone) show without losing the edits

#### Scenario: Cancel keeps the row untouched

- **Given** an admin with an open row editor
- **When** they click Batal
- **Then** the row returns to read-only display with its original values

---

## Out of scope

- Editing the alumni's name/email (owned by the User model)
- Replacing the bank transfer proof from the admin console
- Bulk editing multiple rows
