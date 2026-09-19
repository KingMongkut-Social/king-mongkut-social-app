import { describe, expect, it } from 'vitest';
import { postSchema, registerSchema } from '../src/validation/schemas';

describe('registerSchema', () => {
  it('accepts an institutional account with a backend-compatible password', () => {
    const result = registerSchema.safeParse({
      name: 'Ada Lovelace',
      email: 'ada@kmitl.ac.th',
      password: 'StrongPass123',
      university: 'KMITL',
    });
    expect(result.success).toBe(true);
  });

  it('rejects weak passwords', () => {
    const result = registerSchema.safeParse({
      name: 'Ada',
      email: 'ada@kmitl.ac.th',
      password: 'weakpassword',
      university: 'KMITL',
    });
    expect(result.success).toBe(false);
  });

  it('rejects consumer email domains', () => {
    const result = registerSchema.safeParse({
      name: 'Ada',
      email: 'ada@gmail.com',
      password: 'StrongPass123',
      university: 'KMITL',
    });
    expect(result.success).toBe(false);
  });
});

describe('postSchema', () => {
  it('trims title and content and fills the tag default', () => {
    const parsed = postSchema.parse({
      title: '  Hello  ',
      content: '  World  ',
      status: 'draft',
    });
    expect(parsed).toEqual({
      title: 'Hello',
      content: 'World',
      status: 'draft',
      tags: [],
    });
  });
});
