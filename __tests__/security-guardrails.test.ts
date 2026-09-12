import { describe, it, expect } from 'vitest';
import {
  validateProofFile,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_PROOF_MIME_TYPES,
} from '../lib/validations/registration';

describe('Security and Payload Guardrails', () => {
  it('enforces maximum 4.0 MB file size limit', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(4 * 1024 * 1024);

    // Mock File larger than 4MB
    const oversizedFile = {
      size: 4.5 * 1024 * 1024,
      type: 'image/jpeg',
      name: 'large_receipt.jpg',
    } as unknown as File;

    const result = validateProofFile(oversizedFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('4 MB');
  });

  it('rejects unapproved MIME types like executables and scripts', () => {
    const maliciousFile = {
      size: 1024 * 50,
      type: 'application/x-msdownload',
      name: 'receipt.exe',
    } as unknown as File;

    const result = validateProofFile(maliciousFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid file format');
  });

  it('approves legitimate PDF and image receipts', () => {
    const pdfFile = {
      size: 1024 * 500,
      type: 'application/pdf',
      name: 'transfer_receipt.pdf',
    } as unknown as File;

    const imageFile = {
      size: 1024 * 800,
      type: 'image/png',
      name: 'proof.png',
    } as unknown as File;

    expect(validateProofFile(pdfFile).valid).toBe(true);
    expect(validateProofFile(imageFile).valid).toBe(true);
  });
});
