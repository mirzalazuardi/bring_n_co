import { describe, it, expect } from 'vitest';
import { env } from '../lib/env';

describe('Environment Configuration', () => {
  it('should load default environment values safely', () => {
    expect(env.EVENT_DATE).toBeDefined();
    expect(typeof env.EVENT_DATE).toBe('string');
    expect(env.NEXTAUTH_SECRET).toBeDefined();
  });
});
