import { describe, expect, it } from 'vitest';
import { postSchema, registerSchema } from '../src/validation/schemas';

describe('registerSchema', () => {
  it('accepts a password compatible with the backend policy', () => {
    const result = registerSchema.safeParse({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'StrongPass123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects weak passwords', () => {
    const result = registerSchema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'weakpassword',
    });
    expect(result.success).toBe(false);
  });
});

describe('postSchema', () => {
  it('trims title and content', () => {
    const parsed = postSchema.parse({
      title: '  Hello  ',
      content: '  World  ',
      status: 'draft',
    });
    expect(parsed).toEqual({ title: 'Hello', content: 'World', status: 'draft' });
  });
});
