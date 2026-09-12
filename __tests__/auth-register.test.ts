import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

describe('User Registration Validation', () => {
  it('should accept valid registration payload', () => {
    const valid = {
      name: 'Budi Alumni',
      email: 'budi@reunion.org',
      password: 'password123',
    };
    const result = registerSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject short password or invalid email', () => {
    const invalidEmail = {
      name: 'Budi',
      email: 'not-an-email',
      password: 'password123',
    };
    expect(registerSchema.safeParse(invalidEmail).success).toBe(false);

    const shortPassword = {
      name: 'Budi',
      email: 'budi@reunion.org',
      password: '123',
    };
    expect(registerSchema.safeParse(shortPassword).success).toBe(false);
  });
});
