-- Extend JerseySize enum with extended sizes (2XL-5XL)
-- OpenSpec change: feat-jersey-size-guide-and-extended (T3)
-- Append-only: no existing values are modified or removed.
ALTER TYPE "JerseySize" ADD VALUE '2XL';
ALTER TYPE "JerseySize" ADD VALUE '3XL';
ALTER TYPE "JerseySize" ADD VALUE '4XL';
ALTER TYPE "JerseySize" ADD VALUE '5XL';
